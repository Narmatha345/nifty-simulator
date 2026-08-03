import type { OhlcRow, ReturnPoint } from '../types'

/** Computes day-over-day % change in the Close price for every row after the first. */
export function computeDailyReturns(rows: OhlcRow[]): ReturnPoint[] {
  return rows.map((row, index) => {
    if (index === 0) return { date: row.date, close: row.close, returnPct: null }
    const previousClose = rows[index - 1].close
    const returnPct = ((row.close - previousClose) / previousClose) * 100
    return { date: row.date, close: row.close, returnPct }
  })
}

export function extractReturnValues(points: ReturnPoint[]): number[] {
  const values: number[] = []
  for (const point of points) {
    if (point.returnPct !== null) values.push(point.returnPct)
  }
  return values
}
