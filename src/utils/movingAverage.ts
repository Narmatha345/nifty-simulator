/** Simple moving average over `window` periods; null until enough history exists. */
export function computeSMA(values: number[], window: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null)
  let sum = 0

  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= window) sum -= values[i - window]
    if (i >= window - 1) result[i] = sum / window
  }

  return result
}
