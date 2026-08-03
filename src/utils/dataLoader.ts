import Papa from 'papaparse'
import type { OhlcRow } from '../types'

const BUNDLED_DATA_URL = `${import.meta.env.BASE_URL}data/nifty-historical.json`

const COLUMN_ALIASES: Record<keyof OhlcRow, string[]> = {
  date: ['date'],
  open: ['open'],
  high: ['high'],
  low: ['low'],
  close: ['close', 'close*', 'closeprice', 'closingprice', 'adjclose', 'adjustedclose'],
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function findColumn(headers: string[], aliases: string[]): string | undefined {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }))
  for (const alias of aliases) {
    const match = normalized.find((h) => h.norm === alias)
    if (match) return match.raw
  }
  return undefined
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/,/g, '').trim()
  const num = Number(cleaned)
  if (Number.isNaN(num)) throw new Error(`Could not parse numeric value: "${value}"`)
  return num
}

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

/** Normalizes common NSE/Yahoo date formats (yyyy-mm-dd, dd-mm-yyyy, dd/mm/yyyy, dd-MMM-yyyy) to yyyy-mm-dd. */
export function normalizeDate(raw: string): string {
  const value = raw.trim()

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const monthNameMatch = value.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/)
  if (monthNameMatch) {
    const [, day, monthName, year] = monthNameMatch
    const month = MONTHS[monthName.slice(0, 3).toLowerCase()]
    if (month) return `${year}-${month}-${day.padStart(2, '0')}`
  }

  const numericMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (numericMatch) {
    const [, day, month, year] = numericMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  throw new Error(`Unrecognized date format: "${raw}"`)
}

function normalizeCsvRows(rows: Record<string, string>[]): OhlcRow[] {
  if (rows.length === 0) throw new Error('The CSV file has no data rows.')
  const headers = Object.keys(rows[0])

  const columns = {
    date: findColumn(headers, COLUMN_ALIASES.date),
    open: findColumn(headers, COLUMN_ALIASES.open),
    high: findColumn(headers, COLUMN_ALIASES.high),
    low: findColumn(headers, COLUMN_ALIASES.low),
    close: findColumn(headers, COLUMN_ALIASES.close),
  }

  const missing = Object.entries(columns)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  if (missing.length > 0) {
    throw new Error(
      `CSV is missing required column(s): ${missing.join(', ')}. Expected headers like Date, Open, High, Low, Close.`,
    )
  }

  const result: OhlcRow[] = []
  for (const row of rows) {
    const dateRaw = row[columns.date!]
    if (!dateRaw || !dateRaw.trim()) continue
    result.push({
      date: normalizeDate(dateRaw),
      open: parseNumber(row[columns.open!]),
      high: parseNumber(row[columns.high!]),
      low: parseNumber(row[columns.low!]),
      close: parseNumber(row[columns.close!]),
    })
  }

  return sortAndDedupe(result)
}

function sortAndDedupe(rows: OhlcRow[]): OhlcRow[] {
  const byDate = new Map<string, OhlcRow>()
  for (const row of rows) byDate.set(row.date, row)
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export async function loadBundledHistoricalData(): Promise<OhlcRow[]> {
  const response = await fetch(BUNDLED_DATA_URL)
  if (!response.ok) {
    throw new Error(`Failed to load bundled historical dataset (HTTP ${response.status}).`)
  }
  const data = (await response.json()) as OhlcRow[]
  return sortAndDedupe(data)
}

export function parseCsvFile(file: File): Promise<OhlcRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          resolve(normalizeCsvRows(results.data))
        } catch (error) {
          reject(error)
        }
      },
      error: (error: Error) => reject(error),
    })
  })
}

export function filterByDateRange(rows: OhlcRow[], start: string, end: string): OhlcRow[] {
  return rows.filter((row) => row.date >= start && row.date <= end)
}
