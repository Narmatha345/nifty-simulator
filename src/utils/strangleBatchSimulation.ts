import type { OhlcRow } from '../types'
import type { StrangleStrategyParams, StrategyScenarioSummary, VixRow } from '../types/strangle'
import { generateRandomNiftyPath } from './randomNiftyGenerator'
import { generateRandomVixPath } from './randomVixGenerator'
import { generateSyntheticOptionChain } from './syntheticOptionChain'
import { runShortStrangleBacktest } from './strangleStrategy'
import { computeBuyAndHoldComparison } from './strangleComparison'

/**
 * Runs the unmodified Short Strangle engine (strangleStrategy.ts) on
 * `runCount` independently generated synthetic markets — a fresh Random
 * NIFTY path, a fresh Random VIX path, and a fresh Black-Scholes option
 * chain per run — so the strategy's performance can be compared across many
 * possible market scenarios instead of relying on a single historical or
 * random path.
 */
export function runSyntheticScenarioBatch(
  historicalNiftyRows: OhlcRow[],
  historicalVixRows: VixRow[],
  params: StrangleStrategyParams,
  runCount: number,
): StrategyScenarioSummary[] {
  const results: StrategyScenarioSummary[] = []

  for (let i = 0; i < runCount; i++) {
    const niftyPath = generateRandomNiftyPath(historicalNiftyRows)
    const vixPath = generateRandomVixPath(historicalVixRows)
    const optionChain = generateSyntheticOptionChain(niftyPath, vixPath)
    const backtest = runShortStrangleBacktest(niftyPath, vixPath, optionChain, params)
    const comparison = computeBuyAndHoldComparison(niftyPath, backtest.trades)

    results.push({
      label: `Synthetic Run #${i + 1}`,
      totalTrades: backtest.performance.totalTrades,
      winRate: backtest.performance.winRate,
      averageHoldingDays: backtest.performance.averageHoldingDays,
      totalProfitLoss: backtest.performance.totalProfitLoss,
      strategyReturnPct: comparison?.strategyReturnPct ?? 0,
    })
  }

  return results
}

/** Builds the Historical-baseline row in the same shape, so it can sit alongside the synthetic runs in one comparison table. */
export function buildHistoricalScenarioSummary(
  performance: { totalTrades: number; winRate: number; averageHoldingDays: number; totalProfitLoss: number },
  strategyReturnPct: number,
): StrategyScenarioSummary {
  return {
    label: 'Historical Backtest',
    totalTrades: performance.totalTrades,
    winRate: performance.winRate,
    averageHoldingDays: performance.averageHoldingDays,
    totalProfitLoss: performance.totalProfitLoss,
    strategyReturnPct,
  }
}
