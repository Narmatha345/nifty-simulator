import type { OhlcRow } from '../types'
import type { OptionChainRow, VixRow } from '../types/strangle'
import { priceBlackScholes } from './blackScholes'

// Mirrors the bundled historical Option Chain dataset's own shape: strikes on
// a round-number grid (~500 points apart there) and a single expiry shared
// across every date in the file, rather than a real per-week NSE chain.
const STRIKE_STEP = 500
const STRIKE_RANGE_PCT = 0.15
// Fixed assumption for the Black-Scholes risk-free input — not modeled as its
// own market, since the strategy's signal (VIX percentile) doesn't depend on it.
const RISK_FREE_RATE = 0.065
// Synthetic contracts "expire" this many days after the simulated path's last
// date, so every date in the path shares one still-valid expiry.
const EXPIRY_BUFFER_DAYS = 60

function daysBetween(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`)
  const end = Date.parse(`${endIso}T00:00:00Z`)
  return (end - start) / 86_400_000
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Generates a Black-Scholes-priced synthetic option chain for a simulated
 * NIFTY path + India VIX path, shaped exactly like the historical Option
 * Chain dataset (OptionChainRow[]) so the existing buildOptionChainIndex /
 * findOtmStrikesByPercent / getPremium / runShortStrangleBacktest pipeline
 * (optionChain.ts, strangleStrategy.ts) can consume it completely unchanged.
 *
 * Every date shares one expiry and one strike grid spanning the whole path's
 * price range (with a buffer), rather than a grid relative to that day's
 * spot — so a strike/expiry pair chosen by the strategy on the entry day is
 * guaranteed to still be quoted (at that day's own premium) on the exit day.
 */
export function generateSyntheticOptionChain(niftyRows: OhlcRow[], vixRows: VixRow[]): OptionChainRow[] {
  if (niftyRows.length === 0 || vixRows.length === 0) return []

  const vixByDate = new Map(vixRows.map((row) => [row.date, row.close]))
  const expiry = addDays(niftyRows[niftyRows.length - 1].date, EXPIRY_BUFFER_DAYS)

  const closes = niftyRows.map((row) => row.close)
  const minSpot = Math.min(...closes)
  const maxSpot = Math.max(...closes)
  const lowStrike = Math.floor((minSpot * (1 - STRIKE_RANGE_PCT)) / STRIKE_STEP) * STRIKE_STEP
  const highStrike = Math.ceil((maxSpot * (1 + STRIKE_RANGE_PCT)) / STRIKE_STEP) * STRIKE_STEP
  const strikes: number[] = []
  for (let strike = lowStrike; strike <= highStrike; strike += STRIKE_STEP) strikes.push(strike)

  const rows: OptionChainRow[] = []
  for (const niftyRow of niftyRows) {
    const vix = vixByDate.get(niftyRow.date)
    if (vix === undefined) continue

    const timeToExpiryYears = Math.max(daysBetween(niftyRow.date, expiry), 1) / 365
    const volatility = Math.max(vix, 1) / 100

    for (const strike of strikes) {
      const { call, put } = priceBlackScholes({
        spot: niftyRow.close,
        strike,
        timeToExpiryYears,
        riskFreeRate: RISK_FREE_RATE,
        volatility,
      })
      rows.push({
        date: niftyRow.date,
        niftyClose: niftyRow.close,
        tradingSymbol: `NIFTY-SYN-${strike}-CE`,
        expiry,
        strike,
        instrumentType: 'CE',
        open: call,
        high: call,
        low: call,
        close: call,
      })
      rows.push({
        date: niftyRow.date,
        niftyClose: niftyRow.close,
        tradingSymbol: `NIFTY-SYN-${strike}-PE`,
        expiry,
        strike,
        instrumentType: 'PE',
        open: put,
        high: put,
        low: put,
        close: put,
      })
    }
  }

  return rows
}
