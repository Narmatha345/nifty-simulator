import Papa from 'papaparse'
import type { VixRow } from '../types/strangle'
import { normalizeDate } from './dataLoader'

// Small local copies of dataLoader.ts's CSV-parsing helpers — duplicated
// rather than imported so that dataLoader.ts (the protected Historical NIFTY
// Data Loader module) never has to change.
const DATE_ALIASES = ['date']
const CLOSE_ALIASES = ['close', 'vixclose', 'indiavixclose', 'adjclose', 'vix']

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

function normalizeVixRows(rows: Record<string, string>[]): VixRow[] {
  if (rows.length === 0) throw new Error('The VIX CSV file has no data rows.')
  const headers = Object.keys(rows[0])

  const closeColumn = findColumn(headers, CLOSE_ALIASES)
  if (!closeColumn) {
    throw new Error('VIX CSV is missing a required column: Close. Expected headers like Date, Close.')
  }
  // yfinance's raw CSV export names its index column "Price" (not "Date") and
  // prepends a "Ticker"/"Date" metadata row before the real data — when no
  // column is explicitly named "date", fall back to the first column as the
  // date column, and skip any row whose date/close can't actually be parsed
  // (which quietly drops those metadata rows instead of failing the file).
  const dateColumn = findColumn(headers, DATE_ALIASES) ?? headers[0]

  const result: VixRow[] = []
  for (const row of rows) {
    const dateRaw = row[dateColumn]
    const closeRaw = row[closeColumn]
    if (!dateRaw?.trim() || !closeRaw?.trim()) continue
    try {
      result.push({ date: normalizeDate(dateRaw), close: parseNumber(closeRaw) })
    } catch {
      continue
    }
  }

  if (result.length === 0) {
    throw new Error('No usable Date/Close rows found in the VIX CSV.')
  }

  return sortAndDedupeVix(result)
}

function sortAndDedupeVix(rows: VixRow[]): VixRow[] {
  const byDate = new Map<string, VixRow>()
  for (const row of rows) byDate.set(row.date, row)
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function parseVixCsvFile(file: File): Promise<VixRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          resolve(normalizeVixRows(results.data))
        } catch (error) {
          reject(error)
        }
      },
      error: (error: Error) => reject(error),
    })
  })
}

/** Converts any ticker's fetched OHLCV history (see yahooFinance.ts) into VixRow[] — only Close is used. */
export function toVixRows(rows: { date: string; close: number }[]): VixRow[] {
  return sortAndDedupeVix(rows.map((row) => ({ date: row.date, close: row.close })))
}
