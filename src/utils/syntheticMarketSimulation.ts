import type { OhlcRow } from '../types'
import type { OptionChainRow, VixRow } from '../types/strangle'
import { generateRandomNiftyPath } from './randomNiftyGenerator'
import { generateRandomVixPath } from './randomVixGenerator'
import { generateSyntheticOptionChain } from './syntheticOptionChain'

export interface SyntheticMarketDataset {
  niftyRows: OhlcRow[]
  vixRows: VixRow[]
  optionChainRows: OptionChainRow[]
  generatedAt: number
}

/**
 * The "Simulation Module" — a standalone step that generates one complete
 * synthetic market (Random NIFTY -> Random India VIX -> Black-Scholes option
 * chain) up front, so it can be triggered once via "Run Simulation" and then
 * consumed as a fixed dataset by the strategy, the Simulation Preview table,
 * and the CSV export — the strategy itself never generates data while it runs.
 */
export function generateSyntheticMarket(historicalNiftyRows: OhlcRow[], historicalVixRows: VixRow[]): SyntheticMarketDataset {
  const niftyRows = generateRandomNiftyPath(historicalNiftyRows)
  const vixRows = generateRandomVixPath(historicalVixRows)
  const optionChainRows = generateSyntheticOptionChain(niftyRows, vixRows)
  return { niftyRows, vixRows, optionChainRows, generatedAt: Date.now() }
}

export interface SyntheticMarketPreviewRow {
  date: string
  niftySpot: number
  vix: number
  strike: number
  cePremium: number
  pePremium: number
  daysToExpiry: number
}

function daysBetween(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`)
  const end = Date.parse(`${endIso}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
}

/**
 * One row per simulated trading day, at the strike nearest that day's spot
 * (an "ATM" summary of the full generated chain) — shared by the Simulation
 * Preview table and the CSV export so the two always agree.
 */
export function buildSyntheticMarketPreview(dataset: SyntheticMarketDataset): SyntheticMarketPreviewRow[] {
  const vixByDate = new Map(dataset.vixRows.map((row) => [row.date, row.close]))
  const rowsByDate = new Map<string, OptionChainRow[]>()
  for (const row of dataset.optionChainRows) {
    const list = rowsByDate.get(row.date)
    if (list) list.push(row)
    else rowsByDate.set(row.date, [row])
  }

  const preview: SyntheticMarketPreviewRow[] = []
  for (const niftyRow of dataset.niftyRows) {
    const vix = vixByDate.get(niftyRow.date)
    const rowsForDate = rowsByDate.get(niftyRow.date)
    if (vix === undefined || !rowsForDate || rowsForDate.length === 0) continue

    const byStrike = new Map<number, { ce?: OptionChainRow; pe?: OptionChainRow }>()
    for (const row of rowsForDate) {
      const entry = byStrike.get(row.strike) ?? {}
      if (row.instrumentType === 'CE') entry.ce = row
      else entry.pe = row
      byStrike.set(row.strike, entry)
    }

    let nearestStrike: number | null = null
    let nearestDiff = Infinity
    let nearestEntry: { ce?: OptionChainRow; pe?: OptionChainRow } | null = null
    for (const [strike, entry] of byStrike) {
      if (!entry.ce || !entry.pe) continue
      const diff = Math.abs(strike - niftyRow.close)
      if (diff < nearestDiff) {
        nearestDiff = diff
        nearestStrike = strike
        nearestEntry = entry
      }
    }
    if (nearestStrike === null || !nearestEntry?.ce || !nearestEntry?.pe) continue

    preview.push({
      date: niftyRow.date,
      niftySpot: niftyRow.close,
      vix,
      strike: nearestStrike,
      cePremium: nearestEntry.ce.close,
      pePremium: nearestEntry.pe.close,
      daysToExpiry: daysBetween(niftyRow.date, nearestEntry.ce.expiry),
    })
  }
  return preview
}

/** Downloadable CSV text for the Simulation Preview dataset (ATM-strike-per-day summary). */
export function buildSyntheticMarketCsv(rows: SyntheticMarketPreviewRow[]): string {
  const header = 'Date,Simulated NIFTY,Simulated India VIX,Strike,CE Premium,PE Premium,Days To Expiry'
  const lines = rows.map(
    (r) => `${r.date},${r.niftySpot.toFixed(2)},${r.vix.toFixed(2)},${r.strike},${r.cePremium.toFixed(2)},${r.pePremium.toFixed(2)},${r.daysToExpiry}`,
  )
  return [header, ...lines].join('\n')
}

/** Simulated NIFTY-only CSV: Date, Simulated NIFTY. */
export function buildSimulatedNiftyCsv(dataset: SyntheticMarketDataset): string {
  const header = 'Date,Simulated NIFTY'
  const lines = dataset.niftyRows.map((row) => `${row.date},${row.close.toFixed(2)}`)
  return [header, ...lines].join('\n')
}

/** Simulated India VIX-only CSV: Date, Simulated India VIX. */
export function buildSimulatedVixCsv(dataset: SyntheticMarketDataset): string {
  const header = 'Date,Simulated India VIX'
  const lines = dataset.vixRows.map((row) => `${row.date},${row.close.toFixed(2)}`)
  return [header, ...lines].join('\n')
}

/**
 * Full synthetic option chain CSV — every generated strike for every date
 * (not just the ATM summary row `buildSyntheticMarketCsv` uses), plus the
 * Volatility Used (simulated VIX / 100) that fed Black-Scholes for that
 * date, so the whole generated chain can be reused/audited outside the app.
 */
export function buildOptionChainCsv(dataset: SyntheticMarketDataset): string {
  const vixByDate = new Map(dataset.vixRows.map((row) => [row.date, row.close]))
  const byDateStrike = new Map<string, Map<number, { ce?: OptionChainRow; pe?: OptionChainRow }>>()
  for (const row of dataset.optionChainRows) {
    let byStrike = byDateStrike.get(row.date)
    if (!byStrike) {
      byStrike = new Map()
      byDateStrike.set(row.date, byStrike)
    }
    let entry = byStrike.get(row.strike)
    if (!entry) {
      entry = {}
      byStrike.set(row.strike, entry)
    }
    if (row.instrumentType === 'CE') entry.ce = row
    else entry.pe = row
  }

  const header = 'Date,Strike,Call Premium,Put Premium,Time To Expiry (Days),Volatility Used'
  const lines: string[] = []
  for (const [date, byStrike] of byDateStrike) {
    const vix = vixByDate.get(date)
    if (vix === undefined) continue
    const volatilityUsed = Math.max(vix, 1) / 100
    for (const [strike, entry] of byStrike) {
      if (!entry.ce || !entry.pe) continue
      const daysToExpiry = daysBetween(date, entry.ce.expiry)
      lines.push(`${date},${strike},${entry.ce.close.toFixed(2)},${entry.pe.close.toFixed(2)},${daysToExpiry},${volatilityUsed.toFixed(4)}`)
    }
  }
  return [header, ...lines].join('\n')
}
