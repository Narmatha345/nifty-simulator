export interface YahooOhlcvRow {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface YahooChartResponse {
  chart: {
    result:
      | [
          {
            timestamp: number[]
            indicators: {
              quote: [{ open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume: (number | null)[] }]
            }
          },
        ]
      | null
    error: { code: string; description: string } | null
  }
}

// Routed through a CORS proxy (same mechanism used elsewhere for browser-side
// Yahoo Finance access) — Yahoo's chart endpoint doesn't set
// Access-Control-Allow-Origin itself, so a direct fetch() from a static site
// is blocked by the browser; the proxy forwards the request server-side and
// echoes back Yahoo's response (including its HTTP status) with CORS enabled.
const CORS_PROXY_URL = 'https://cors-proxy-lake-omega.vercel.app/api/proxy?url='

/**
 * Generic, ticker-agnostic Yahoo Finance daily-history fetch — works for any
 * symbol Yahoo Finance carries (indices like ^INDIAVIX/^NSEI, equities like
 * AAPL/RELIANCE.NS, crypto like BTC-USD, futures like GC=F, ...).
 */
export async function fetchYahooFinanceHistory(ticker: string, start: string, end: string): Promise<YahooOhlcvRow[]> {
  const symbol = ticker.trim()
  if (!symbol) throw new Error('Enter a ticker symbol.')

  const period1 = Math.floor(Date.parse(`${start}T00:00:00Z`) / 1000)
  const period2 = Math.floor(Date.parse(`${end}T23:59:59Z`) / 1000)
  if (Number.isNaN(period1) || Number.isNaN(period2)) throw new Error('Enter a valid start and end date.')
  if (period1 > period2) throw new Error('Start date must be before end date.')

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${period1}&period2=${period2}`
  const url = `${CORS_PROXY_URL}${encodeURIComponent(yahooUrl)}`

  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('Network request to Yahoo Finance failed — try uploading a CSV instead.')
  }

  let payload: YahooChartResponse
  try {
    payload = (await response.json()) as YahooChartResponse
  } catch {
    throw new Error(`Yahoo Finance request failed (HTTP ${response.status}).`)
  }

  if (payload.chart.error) {
    throw new Error(`Invalid ticker "${symbol}": ${payload.chart.error.description}`)
  }
  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed (HTTP ${response.status}).`)
  }

  const result = payload.chart.result?.[0]
  if (!result) {
    throw new Error(`No data found for ticker "${symbol}".`)
  }

  const { timestamp, indicators } = result
  const quote = indicators.quote[0]
  const rows: YahooOhlcvRow[] = []
  for (let i = 0; i < timestamp.length; i++) {
    const open = quote?.open[i]
    const high = quote?.high[i]
    const low = quote?.low[i]
    const close = quote?.close[i]
    if (open == null || high == null || low == null || close == null) continue
    rows.push({
      date: new Date(timestamp[i] * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: quote?.volume[i] ?? 0,
    })
  }

  if (rows.length === 0) {
    throw new Error(`No data available for "${symbol}" in the selected date range.`)
  }

  return rows
}
