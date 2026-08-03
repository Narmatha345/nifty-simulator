import type { HistogramBin, ProbabilityBin } from '../types'

/** Converts bin counts into relative frequencies (Bin Count / Total Trading Days). */
export function computeProbabilityDistribution(
  bins: HistogramBin[],
  totalObservations: number,
): ProbabilityBin[] {
  return bins.map((bin) => ({
    ...bin,
    probability: totalObservations > 0 ? bin.count / totalObservations : 0,
  }))
}
