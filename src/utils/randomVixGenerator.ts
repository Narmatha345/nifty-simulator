import type { VixRow } from '../types/strangle'
import { buildHistogram } from './histogram'
import { computeProbabilityDistribution } from './probability'
import { createHistoricalSampler } from './sampler'

const RANDOM_VIX_PATH_BIN_WIDTH = 0.5
// India VIX can't be zero or negative — floors the compounded path so a run
// of large sampled drops can't push it non-physical.
const MIN_VIX = 1

// Small local copy of returns.ts's day-over-day % change calculation,
// specialized to VixRow[] (date + close only) rather than OhlcRow[] — kept
// separate so returns.ts (behind the protected NIFTY histogram/simulator)
// never has to change.
function computeVixDailyReturns(rows: VixRow[]): number[] {
  const values: number[] = []
  for (let i = 1; i < rows.length; i++) {
    const previousClose = rows[i - 1].close
    if (previousClose > 0) values.push(((rows[i].close - previousClose) / previousClose) * 100)
  }
  return values
}

/**
 * Generates a synthetic India VIX path with the same dates as
 * `historicalVixRows`, using the same historical-return Monte Carlo sampler
 * that drives the Random NIFTY path generator (randomNiftyGenerator.ts) —
 * one draw per day from the historical VIX % move distribution (via
 * histogram -> probability distribution -> sampler), compounded onto the
 * running level. Drawing from realized VIX moves (rather than a parametric
 * shape) is what naturally produces realistic clustering — stable stretches,
 * gradual rises/falls, and sudden spikes/normalization — without hand-coded
 * regimes. Reusing the historical dates keeps the strangle engine's
 * date-keyed VIX lookups valid without any changes to that engine.
 */
export function generateRandomVixPath(historicalVixRows: VixRow[], rng: () => number = Math.random): VixRow[] {
  if (historicalVixRows.length === 0) return []

  const returnValues = computeVixDailyReturns(historicalVixRows)
  if (returnValues.length === 0) return historicalVixRows.map((row) => ({ ...row }))

  const histogramBins = buildHistogram(returnValues, RANDOM_VIX_PATH_BIN_WIDTH)
  const probabilityBins = computeProbabilityDistribution(histogramBins, returnValues.length)
  const sampler = createHistoricalSampler(probabilityBins, rng)

  let previousClose = historicalVixRows[0].close
  return historicalVixRows.map((row, index) => {
    if (index === 0) return { date: row.date, close: row.close }
    const returnPct = sampler.sample()
    const close = Math.max(previousClose * (1 + returnPct / 100), MIN_VIX)
    previousClose = close
    return { date: row.date, close }
  })
}
