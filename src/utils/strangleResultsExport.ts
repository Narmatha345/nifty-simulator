import type { OhlcRow } from '../types'
import type {
  EquityPoint,
  OptionChainRow,
  StrangleOpenPosition,
  StrangleSignal,
  StrangleTrade,
  VixPercentilePoint,
  VixRow,
} from '../types/strangle'

export interface SimulationResultsCsvInput {
  simulationType: string
  niftyRows: OhlcRow[]
  vixRows: VixRow[]
  optionChainRows: OptionChainRow[]
  vixSeries: VixPercentilePoint[]
  signals: StrangleSignal[]
  trades: StrangleTrade[]
  openPosition: StrangleOpenPosition | null
  equityCurve: EquityPoint[]
}

function csvField(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

/**
 * One unified CSV for the whole validation run — one row per trading day,
 * merging the market data, that day's VIX percentile, any entry/exit
 * signal, the trade it belongs to, position status, and the running equity
 * curve (strategy vs Buy & Hold). Entry/Exit Percentile and Trade ID are
 * filled for every applicable day (not just the exact signal day) — the
 * rolling percentile under whichever threshold it's currently being
 * evaluated against, and the trade number for every day inside that
 * trade's holding period — so only genuinely inapplicable cells (CE/PE
 * Premium with no matching option-chain row, Entry/Exit Signal and Trade
 * Profit-Loss outside their one triggering day, percentiles before the
 * 30-day rolling window fills) are left blank.
 */
export function buildSimulationResultsCsv(input: SimulationResultsCsvInput): string {
  const { simulationType, niftyRows, vixRows, optionChainRows, vixSeries, signals, trades, openPosition, equityCurve } = input

  const vixByDate = new Map(vixRows.map((row) => [row.date, row.close]))
  const percentileByDate = new Map(vixSeries.map((point) => [point.date, point.percentile]))
  const signalByDate = new Map(signals.map((signal) => [signal.date, signal.type]))
  const equityByDate = new Map(equityCurve.map((point) => [point.date, point]))
  const entryTradeByDate = new Map(trades.map((trade) => [trade.entryDate, trade]))
  const exitTradeByDate = new Map(trades.map((trade) => [trade.exitDate, trade]))

  const optionsByDate = new Map<string, OptionChainRow[]>()
  for (const row of optionChainRows) {
    const list = optionsByDate.get(row.date)
    if (list) list.push(row)
    else optionsByDate.set(row.date, [row])
  }

  // Nearest-to-spot strike with both CE and PE quoted — a single-strike
  // per-day summary of whatever chain (historical or synthetic) is loaded.
  function findAtmOption(date: string, spot: number): { strike: number; ce: number; pe: number } | null {
    const rows = optionsByDate.get(date)
    if (!rows) return null
    const byStrike = new Map<number, { ce?: number; pe?: number }>()
    for (const row of rows) {
      const entry = byStrike.get(row.strike) ?? {}
      if (row.instrumentType === 'CE') entry.ce = row.close
      else entry.pe = row.close
      byStrike.set(row.strike, entry)
    }
    let best: { strike: number; ce: number; pe: number } | null = null
    let bestDiff = Infinity
    for (const [strike, entry] of byStrike) {
      if (entry.ce === undefined || entry.pe === undefined) continue
      const diff = Math.abs(strike - spot)
      if (diff < bestDiff) {
        bestDiff = diff
        best = { strike, ce: entry.ce, pe: entry.pe }
      }
    }
    return best
  }

  const dateIndex = new Map(niftyRows.map((row, index) => [row.date, index]))
  const inPosition = new Array(niftyRows.length).fill(false)
  // Trade ID per day, for every day inside a trade's holding period — not
  // just its entry/exit rows — so "which trade was this?" never requires
  // cross-referencing. Open (unclosed) positions get the trade number
  // they'll receive once closed (trades are numbered sequentially).
  const tradeIdAt: (number | '')[] = new Array(niftyRows.length).fill('')
  for (const trade of trades) {
    const start = dateIndex.get(trade.entryDate)
    const end = dateIndex.get(trade.exitDate)
    if (start !== undefined && end !== undefined) {
      for (let i = start; i <= end; i++) {
        inPosition[i] = true
        tradeIdAt[i] = trade.tradeNumber
      }
    }
  }
  if (openPosition) {
    const start = dateIndex.get(openPosition.entryDate)
    if (start !== undefined) {
      for (let i = start; i < niftyRows.length; i++) {
        inPosition[i] = true
        tradeIdAt[i] = trades.length + 1
      }
    }
  }

  const header = [
    'Simulation Type',
    'Date',
    'Simulated NIFTY',
    'Simulated India VIX',
    'Strike Price',
    'CE Premium',
    'PE Premium',
    'Entry Signal',
    'Exit Signal',
    'Entry Percentile',
    'Exit Percentile',
    'Trade ID',
    'Position Status',
    'Trade Profit/Loss',
    'Running Equity',
    'Buy & Hold Equity',
    'Remarks',
  ]

  const lines = [header.join(',')]

  niftyRows.forEach((row, index) => {
    const vix = vixByDate.get(row.date)
    const signal = signalByDate.get(row.date)
    const percentile = percentileByDate.get(row.date)
    const atm = findAtmOption(row.date, row.close)
    const entryTrade = entryTradeByDate.get(row.date)
    const exitTrade = exitTradeByDate.get(row.date)
    const equity = equityByDate.get(row.date)

    let remarks = ''
    if (entryTrade) remarks = `Entry: Buy NIFTY, Sell ${entryTrade.ceStrike} CE, Sell ${entryTrade.peStrike} PE`
    else if (exitTrade) remarks = `Exit: Sell NIFTY, Buy Back ${exitTrade.ceStrike} CE, Buy Back ${exitTrade.peStrike} PE`

    // The rolling VIX percentile is meaningful every day the 30-day window
    // is filled, not just on the exact signal day — it's shown under
    // whichever threshold it's actually being evaluated against: Entry
    // Percentile while flat (watching for entry), Exit Percentile while
    // holding (watching for exit). The literal ENTRY/EXIT signal day always
    // reports under its own column, taking priority over the flat/holding
    // fallback below.
    const hasPercentile = percentile !== null && percentile !== undefined
    let entryPercentileValue = ''
    let exitPercentileValue = ''
    if (hasPercentile) {
      if (signal === 'ENTRY') entryPercentileValue = percentile.toFixed(2)
      else if (signal === 'EXIT') exitPercentileValue = percentile.toFixed(2)
      else if (inPosition[index]) exitPercentileValue = percentile.toFixed(2)
      else entryPercentileValue = percentile.toFixed(2)
    }

    const fields: (string | number)[] = [
      simulationType,
      row.date,
      row.close.toFixed(2),
      vix !== undefined ? vix.toFixed(2) : '',
      atm ? atm.strike : '',
      atm ? atm.ce.toFixed(2) : '',
      atm ? atm.pe.toFixed(2) : '',
      signal === 'ENTRY' ? 'ENTRY' : '',
      signal === 'EXIT' ? 'EXIT' : '',
      entryPercentileValue,
      exitPercentileValue,
      tradeIdAt[index],
      inPosition[index] ? 'IN POSITION' : 'FLAT',
      exitTrade ? exitTrade.totalProfitLoss.toFixed(2) : '',
      equity ? equity.cumulativeProfitLoss.toFixed(2) : '0.00',
      equity ? equity.buyAndHoldProfitLoss.toFixed(2) : '0.00',
      remarks,
    ]

    lines.push(fields.map(csvField).join(','))
  })

  return lines.join('\n')
}
