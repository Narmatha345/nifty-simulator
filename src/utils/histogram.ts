import type { HistogramBin } from '../types'

/**
 * Buckets `values` into fixed-width bins covering their full range.
 * Bin edges are aligned to `binWidth` (e.g. -2, -1.5, -1, ...) rather than
 * to the min value, so bins read as round numbers.
 */
export function buildHistogram(values: number[], binWidth: number): HistogramBin[] {
  if (values.length === 0) return []

  const min = Math.min(...values)
  const max = Math.max(...values)
  const start = Math.floor(min / binWidth) * binWidth
  const numBins = Math.max(1, Math.round((Math.ceil(max / binWidth) * binWidth - start) / binWidth))

  const bins: HistogramBin[] = Array.from({ length: numBins }, (_, i) => {
    const rangeMin = start + i * binWidth
    const rangeMax = start + (i + 1) * binWidth
    return { rangeMin, rangeMax, label: formatBinLabel(rangeMin, rangeMax), count: 0 }
  })

  for (const value of values) {
    let index = Math.floor((value - start) / binWidth)
    if (index < 0) index = 0
    if (index >= bins.length) index = bins.length - 1
    bins[index].count += 1
  }

  return bins
}

/** Picks a "nice" bin width for an arbitrary value range, targeting ~roughly `targetBins` bins. */
export function suggestBinWidth(values: number[], targetBins = 30): number {
  if (values.length === 0) return 1
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const rough = range / targetBins
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const niceStep = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10
  return niceStep * magnitude
}

function formatBinLabel(rangeMin: number, rangeMax: number): string {
  return `${formatPct(rangeMin)} to ${formatPct(rangeMax)}`
}

function formatPct(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}
