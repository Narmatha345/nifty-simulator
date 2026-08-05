import type { OhlcRow } from '../types'
import { computeDailyReturns, extractReturnValues } from './returns'
import { buildHistogram } from './histogram'
import { computeProbabilityDistribution } from './probability'
import { createHistoricalSampler } from './sampler'

const RANDOM_PATH_BIN_WIDTH = 0.5

/**
 * Generates a synthetic NIFTY OHLC path with the same dates as
 * `historicalRows`, using the app's existing Monte Carlo historical-return
 * sampler (the same one behind the Scenario Simulation tab) to draw each
 * day's % move. Reusing the historical dates keeps VIX and Option Chain
 * date lookups valid, so the Short Strangle engine can run on this output
 * completely unmodified.
 */
export function generateRandomNiftyPath(historicalRows: OhlcRow[], rng: () => number = Math.random): OhlcRow[] {
  if (historicalRows.length === 0) return []

  const returnPoints = computeDailyReturns(historicalRows)
  const returnValues = extractReturnValues(returnPoints)
  if (returnValues.length === 0) {
    return historicalRows.map((row) => ({ date: row.date, open: row.close, high: row.close, low: row.close, close: row.close }))
  }
  const histogramBins = buildHistogram(returnValues, RANDOM_PATH_BIN_WIDTH)
  const probabilityBins = computeProbabilityDistribution(histogramBins, returnValues.length)
  const sampler = createHistoricalSampler(probabilityBins, rng)

  let previousClose = historicalRows[0].close
  return historicalRows.map((row, index) => {
    if (index === 0) {
      return { date: row.date, open: row.close, high: row.close, low: row.close, close: row.close }
    }
    const returnPct = sampler.sample()
    const close = previousClose * (1 + returnPct / 100)
    const open = previousClose
    previousClose = close
    return { date: row.date, open, high: Math.max(open, close), low: Math.min(open, close), close }
  })
}
