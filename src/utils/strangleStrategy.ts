import type { OhlcRow } from '../types'
import type {
  OptionChainRow,
  StrangleBacktestResult,
  StrangleOpenPosition,
  StranglePerformance,
  StrangleSignal,
  StrangleTrade,
  VixRow,
} from '../types/strangle'
import { buildOptionChainIndex, findNearestOtmStrikes, getPremium } from './optionChain'
import { computeRollingVixPercentile } from './vixPercentile'

const ENTRY_PERCENTILE_THRESHOLD = 80
const EXIT_PERCENTILE_THRESHOLD = 50

function daysBetween(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`)
  const end = Date.parse(`${endIso}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
}

/**
 * India VIX rolling-percentile-driven short strangle: enters when the 30-day
 * VIX percentile is >= 80 (buy 1 NIFTY unit, sell nearest OTM CE + PE from
 * the option chain), exits when it drops below 50 (square everything off).
 * Only one position at a time. Real premiums only — a signal that fires on a
 * day without matching option-chain data is skipped, not faked, and is
 * re-checked the next day.
 */
export function runShortStrangleBacktest(
  ohlcRows: OhlcRow[],
  vixRows: VixRow[],
  optionChainRows: OptionChainRow[],
): StrangleBacktestResult {
  const niftyByDate = new Map(ohlcRows.map((row) => [row.date, row.close]))
  const optionIndex = buildOptionChainIndex(optionChainRows)
  const vixSeries = computeRollingVixPercentile(vixRows)

  const trades: StrangleTrade[] = []
  const signals: StrangleSignal[] = []
  let openPosition: StrangleOpenPosition | null = null

  for (const point of vixSeries) {
    if (point.percentile === null) continue
    const niftyClose = niftyByDate.get(point.date)
    if (niftyClose === undefined) continue

    if (!openPosition) {
      if (point.percentile < ENTRY_PERCENTILE_THRESHOLD) continue
      const selection = findNearestOtmStrikes(optionIndex, point.date, niftyClose)
      if (!selection) continue

      openPosition = {
        entryDate: point.date,
        entryVix: point.vix,
        entryPercentile: point.percentile,
        entryNiftyPrice: niftyClose,
        expiry: selection.expiry,
        ceStrike: selection.ceStrike,
        peStrike: selection.peStrike,
        ceSellPremium: selection.ceRow.close,
        peSellPremium: selection.peRow.close,
      }
      signals.push({ date: point.date, niftyPrice: niftyClose, type: 'ENTRY' })
      continue
    }

    if (point.percentile >= EXIT_PERCENTILE_THRESHOLD) continue
    const ceBuyBackPremium = getPremium(optionIndex, point.date, openPosition.expiry, openPosition.ceStrike, 'CE')
    const peBuyBackPremium = getPremium(optionIndex, point.date, openPosition.expiry, openPosition.peStrike, 'PE')
    if (ceBuyBackPremium === null || peBuyBackPremium === null) continue

    const niftyProfitLoss = niftyClose - openPosition.entryNiftyPrice
    const callProfitLoss = openPosition.ceSellPremium - ceBuyBackPremium
    const putProfitLoss = openPosition.peSellPremium - peBuyBackPremium

    trades.push({
      tradeNumber: trades.length + 1,
      entryDate: openPosition.entryDate,
      exitDate: point.date,
      entryVix: openPosition.entryVix,
      exitVix: point.vix,
      entryPercentile: openPosition.entryPercentile,
      exitPercentile: point.percentile,
      entryNiftyPrice: openPosition.entryNiftyPrice,
      exitNiftyPrice: niftyClose,
      ceStrike: openPosition.ceStrike,
      peStrike: openPosition.peStrike,
      ceSellPremium: openPosition.ceSellPremium,
      ceBuyBackPremium,
      peSellPremium: openPosition.peSellPremium,
      peBuyBackPremium,
      holdingDays: daysBetween(openPosition.entryDate, point.date),
      niftyProfitLoss,
      callProfitLoss,
      putProfitLoss,
      totalProfitLoss: niftyProfitLoss + callProfitLoss + putProfitLoss,
    })
    signals.push({ date: point.date, niftyPrice: niftyClose, type: 'EXIT' })
    openPosition = null
  }

  return {
    trades,
    openPosition,
    performance: computeStranglePerformance(trades),
    vixSeries,
    signals,
  }
}

function computeStranglePerformance(trades: StrangleTrade[]): StranglePerformance {
  const totalTrades = trades.length
  const winningTrades = trades.filter((t) => t.totalProfitLoss > 0)
  const losingTrades = trades.filter((t) => t.totalProfitLoss < 0)
  const totalProfitLoss = trades.reduce((sum, t) => sum + t.totalProfitLoss, 0)

  let maxProfitTrade: StrangleTrade | null = null
  let maxLossTrade: StrangleTrade | null = null
  for (const trade of trades) {
    if (!maxProfitTrade || trade.totalProfitLoss > maxProfitTrade.totalProfitLoss) maxProfitTrade = trade
    if (!maxLossTrade || trade.totalProfitLoss < maxLossTrade.totalProfitLoss) maxLossTrade = trade
  }

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0,
    totalProfitLoss,
    averageProfit: winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.totalProfitLoss, 0) / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? losingTrades.reduce((s, t) => s + t.totalProfitLoss, 0) / losingTrades.length : 0,
    averageHoldingDays: totalTrades > 0 ? trades.reduce((s, t) => s + t.holdingDays, 0) / totalTrades : 0,
    maxProfitTrade,
    maxLossTrade,
  }
}
