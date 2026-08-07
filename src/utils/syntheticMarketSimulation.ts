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
 * The Simulation Module — generates one complete synthetic market (Random
 * NIFTY -> Random India VIX -> Black-Scholes option chain) in one call, so
 * it can be triggered once via "Generate Market" and then consumed as a
 * fixed dataset by the strategy and the results export — the strategy
 * itself never generates data while it runs. `rng` defaults to Math.random
 * but accepts a seeded generator (seededRandom.ts) for a reproducible run.
 */
export function generateSyntheticMarket(
  historicalNiftyRows: OhlcRow[],
  historicalVixRows: VixRow[],
  rng: () => number = Math.random,
): SyntheticMarketDataset {
  const niftyRows = generateRandomNiftyPath(historicalNiftyRows, rng)
  const vixRows = generateRandomVixPath(historicalVixRows, rng)
  const optionChainRows = generateSyntheticOptionChain(niftyRows, vixRows)
  return { niftyRows, vixRows, optionChainRows, generatedAt: Date.now() }
}
