import type { DatePreset } from '../types'

const PRESET_YEARS: Partial<Record<DatePreset, number>> = {
  '1Y': 1,
  '2Y': 2,
  '3Y': 3,
  '5Y': 5,
}

/** Subtracts `years` from an ISO date string, clamped to `floorDate` if given. */
export function subtractYears(isoDate: string, years: number, floorDate?: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCFullYear(date.getUTCFullYear() - years)
  const result = date.toISOString().slice(0, 10)
  return floorDate && result < floorDate ? floorDate : result
}

/** Computes a { start, end } range for a preset, anchored to the dataset's own latest/earliest dates. */
export function resolvePresetRange(
  preset: DatePreset,
  earliestDate: string,
  latestDate: string,
): { start: string; end: string } {
  if (preset === 'ALL') return { start: earliestDate, end: latestDate }
  const years = PRESET_YEARS[preset]
  if (!years) return { start: earliestDate, end: latestDate }
  return { start: subtractYears(latestDate, years, earliestDate), end: latestDate }
}
