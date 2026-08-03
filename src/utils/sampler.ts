import type { ProbabilityBin } from '../types'

export interface ReturnSampler {
  /** Draws one daily % return, respecting the historical bin frequencies. */
  sample(): number
}

/**
 * Builds a sampler that draws returns from the historical probability
 * distribution: a bin is picked with probability equal to its historical
 * relative frequency, then a value is drawn uniformly within that bin's
 * range. This is what makes common historical moves come up more often
 * than rare ones, without ever assuming a normal/parametric shape.
 */
export function createHistoricalSampler(
  probabilityBins: ProbabilityBin[],
  rng: () => number = Math.random,
): ReturnSampler {
  const activeBins = probabilityBins.filter((bin) => bin.probability > 0)
  if (activeBins.length === 0) {
    throw new Error('Cannot build a sampler from an empty probability distribution.')
  }

  const cumulative: number[] = []
  let running = 0
  for (const bin of activeBins) {
    running += bin.probability
    cumulative.push(running)
  }
  const total = cumulative[cumulative.length - 1]

  const pickBinIndex = (target: number): number => {
    let low = 0
    let high = cumulative.length - 1
    while (low < high) {
      const mid = (low + high) >>> 1
      if (cumulative[mid] < target) low = mid + 1
      else high = mid
    }
    return low
  }

  return {
    sample(): number {
      const target = rng() * total
      const bin = activeBins[pickBinIndex(target)]
      return bin.rangeMin + rng() * (bin.rangeMax - bin.rangeMin)
    },
  }
}
