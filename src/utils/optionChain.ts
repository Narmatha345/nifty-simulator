import Papa from 'papaparse'
import type { OptionChainRow, OptionInstrumentType } from '../types/strangle'
import { normalizeDate } from './dataLoader'

// Small local copies of dataLoader.ts's CSV-parsing helpers — duplicated
// rather than imported so that dataLoader.ts (the protected Historical NIFTY
// Data Loader module) never has to change.
const COLUMN_ALIASES = {
  date: ['date'],
  niftyClose: ['niftyclose', 'niftyspot', 'spot', 'underlying', 'underlyingclose'],
  tradingSymbol: ['tradingsymbol', 'symbol', 'tradingsym'],
  expiry: ['expiry', 'expirydate'],
  strike: ['strike', 'strikeprice'],
  instrumentType: ['instrumenttype', 'optiontype', 'type'],
  open: ['open'],
  high: ['high'],
  low: ['low'],
  close: ['close'],
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

function normalizeInstrumentType(raw: string): OptionInstrumentType | null {
  const value = raw.trim().toUpperCase()
  if (value === 'CE' || value === 'CALL') return 'CE'
  if (value === 'PE' || value === 'PUT') return 'PE'
  return null
}

function normalizeOptionChainRows(rows: Record<string, string>[]): OptionChainRow[] {
  if (rows.length === 0) throw new Error('The Option Chain CSV file has no data rows.')
  const headers = Object.keys(rows[0])

  const columns = {
    date: findColumn(headers, COLUMN_ALIASES.date),
    niftyClose: findColumn(headers, COLUMN_ALIASES.niftyClose),
    tradingSymbol: findColumn(headers, COLUMN_ALIASES.tradingSymbol),
    expiry: findColumn(headers, COLUMN_ALIASES.expiry),
    strike: findColumn(headers, COLUMN_ALIASES.strike),
    instrumentType: findColumn(headers, COLUMN_ALIASES.instrumentType),
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
      `Option Chain CSV is missing required column(s): ${missing.join(', ')}. Expected headers like date, nifty_close, tradingsymbol, expiry, strike, instrument_type, open, high, low, close.`,
    )
  }

  const result: OptionChainRow[] = []
  for (const row of rows) {
    const dateRaw = row[columns.date!]
    if (!dateRaw || !dateRaw.trim()) continue
    // Rows for non-option instruments (e.g. futures, "FUT") are outside the
    // strangle strategy's scope and are silently skipped rather than
    // rejecting the whole file.
    const instrumentType = normalizeInstrumentType(row[columns.instrumentType!])
    if (!instrumentType) continue
    result.push({
      date: normalizeDate(dateRaw),
      niftyClose: parseNumber(row[columns.niftyClose!]),
      tradingSymbol: row[columns.tradingSymbol!]?.trim() ?? '',
      expiry: normalizeDate(row[columns.expiry!]),
      strike: parseNumber(row[columns.strike!]),
      instrumentType,
      open: parseNumber(row[columns.open!]),
      high: parseNumber(row[columns.high!]),
      low: parseNumber(row[columns.low!]),
      close: parseNumber(row[columns.close!]),
    })
  }

  if (result.length === 0) {
    throw new Error('No CE/PE option rows found in the CSV (only non-option rows, e.g. futures, were present).')
  }

  return result
}

export function parseOptionChainCsvFile(file: File): Promise<OptionChainRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          resolve(normalizeOptionChainRows(results.data))
        } catch (error) {
          reject(error)
        }
      },
      error: (error: Error) => reject(error),
    })
  })
}

const BUNDLED_OPTION_CHAIN_URL = `${import.meta.env.BASE_URL}data/option-chain.json`

/** Loads the Option Chain dataset bundled with the app — no upload needed. */
export async function loadBundledOptionChain(): Promise<OptionChainRow[]> {
  const response = await fetch(BUNDLED_OPTION_CHAIN_URL)
  if (!response.ok) {
    throw new Error(`Failed to load the bundled Option Chain dataset (HTTP ${response.status}).`)
  }
  const rows = (await response.json()) as OptionChainRow[]
  if (rows.length === 0) {
    throw new Error('The bundled Option Chain dataset has no rows.')
  }
  return rows
}

interface StrikeEntry {
  ce?: OptionChainRow
  pe?: OptionChainRow
}

/** date -> expiry -> strike -> {ce, pe}, plus a sorted expiry list per date for nearest-expiry lookup. */
export interface OptionChainIndex {
  byDateExpiryStrike: Map<string, Map<string, Map<number, StrikeEntry>>>
  expiriesByDate: Map<string, string[]>
}

export function buildOptionChainIndex(rows: OptionChainRow[]): OptionChainIndex {
  const byDateExpiryStrike = new Map<string, Map<string, Map<number, StrikeEntry>>>()

  for (const row of rows) {
    let byExpiry = byDateExpiryStrike.get(row.date)
    if (!byExpiry) {
      byExpiry = new Map()
      byDateExpiryStrike.set(row.date, byExpiry)
    }
    let byStrike = byExpiry.get(row.expiry)
    if (!byStrike) {
      byStrike = new Map()
      byExpiry.set(row.expiry, byStrike)
    }
    let entry = byStrike.get(row.strike)
    if (!entry) {
      entry = {}
      byStrike.set(row.strike, entry)
    }
    if (row.instrumentType === 'CE') entry.ce = row
    else entry.pe = row
  }

  const expiriesByDate = new Map<string, string[]>()
  for (const [date, byExpiry] of byDateExpiryStrike) {
    expiriesByDate.set(date, Array.from(byExpiry.keys()).sort())
  }

  return { byDateExpiryStrike, expiriesByDate }
}

export interface OtmStrikeSelection {
  expiry: string
  ceStrike: number
  peStrike: number
  ceRow: OptionChainRow
  peRow: OptionChainRow
}

/**
 * Picks the nearest expiry on/after `date`, then the strike on each side
 * closest to the OTM target price implied by the configured OTM% — CE target
 * = spot * (1 + otmCallPct/100), PE target = spot * (1 - otmPutPct/100) —
 * among strikes that actually have that side's row. Returns null if no
 * expiry, or no valid strike on either side, is available that day.
 */
export function findOtmStrikesByPercent(
  index: OptionChainIndex,
  date: string,
  spot: number,
  otmCallPct: number,
  otmPutPct: number,
): OtmStrikeSelection | null {
  const expiries = index.expiriesByDate.get(date)
  if (!expiries || expiries.length === 0) return null

  const expiry = expiries.find((e) => e >= date) ?? expiries[expiries.length - 1]
  const byStrike = index.byDateExpiryStrike.get(date)?.get(expiry)
  if (!byStrike) return null

  const ceTarget = spot * (1 + otmCallPct / 100)
  const peTarget = spot * (1 - otmPutPct / 100)

  let ceStrike: number | null = null
  let ceRow: OptionChainRow | null = null
  let ceDiff = Infinity
  let peStrike: number | null = null
  let peRow: OptionChainRow | null = null
  let peDiff = Infinity

  for (const [strike, entry] of byStrike) {
    if (entry.ce) {
      const diff = Math.abs(strike - ceTarget)
      if (diff < ceDiff) {
        ceDiff = diff
        ceStrike = strike
        ceRow = entry.ce
      }
    }
    if (entry.pe) {
      const diff = Math.abs(strike - peTarget)
      if (diff < peDiff) {
        peDiff = diff
        peStrike = strike
        peRow = entry.pe
      }
    }
  }

  if (ceStrike === null || ceRow === null || peStrike === null || peRow === null) return null

  return { expiry, ceStrike, peStrike, ceRow, peRow }
}

/** Exact-lookup for a strike/type's premium on a given date + expiry (used to price exit day buy-backs). */
export function getPremium(
  index: OptionChainIndex,
  date: string,
  expiry: string,
  strike: number,
  type: OptionInstrumentType,
): number | null {
  const entry = index.byDateExpiryStrike.get(date)?.get(expiry)?.get(strike)
  const row = type === 'CE' ? entry?.ce : entry?.pe
  return row ? row.close : null
}
