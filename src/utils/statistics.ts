import type { SimulationResult, SummaryStatistics } from '../types'

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function median(sortedValues: number[]): number {
  const n = sortedValues.length
  const mid = Math.floor(n / 2)
  return n % 2 === 0 ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 : sortedValues[mid]
}

export function computeSummaryStatistics(result: SimulationResult): SummaryStatistics {
  const { paths } = result
  const finals = paths.map((p) => p.finalLevel)
  const sortedFinals = [...finals].sort((a, b) => a - b)

  const expectedFinal = mean(finals)
  const variance = mean(finals.map((v) => (v - expectedFinal) ** 2))

  const pathAvgDailyReturns = paths.map((p) => mean(p.dailyReturns))

  return {
    expectedFinal,
    medianFinal: median(sortedFinals),
    minFinal: sortedFinals[0],
    maxFinal: sortedFinals[sortedFinals.length - 1],
    stdDevFinal: Math.sqrt(variance),
    avgDailyReturn: mean(pathAvgDailyReturns),
    avgMaxRise: mean(paths.map((p) => p.maxRise)),
    avgMaxFall: mean(paths.map((p) => p.maxFall)),
  }
}
