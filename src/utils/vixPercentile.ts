import type { VixPercentilePoint, VixRow } from '../types/strangle'

/**
 * Rolling percentile rank of each day's VIX close against the previous
 * `window` trading days (not including the day itself), per spec: percentile
 * is null until at least `window` prior VIX observations exist.
 */
export function computeRollingVixPercentile(vixRows: VixRow[], window = 30): VixPercentilePoint[] {
  return vixRows.map((row, i) => {
    if (i < window) return { date: row.date, vix: row.close, percentile: null }

    let countLessOrEqual = 0
    for (let j = i - window; j < i; j++) {
      if (vixRows[j].close <= row.close) countLessOrEqual++
    }

    return { date: row.date, vix: row.close, percentile: (countLessOrEqual / window) * 100 }
  })
}
