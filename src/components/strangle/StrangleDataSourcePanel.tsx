import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Cloud, Loader2, Upload } from 'lucide-react'
import type { OptionChainRow, VixRow } from '../../types/strangle'
import { parseOptionChainCsvFile } from '../../utils/optionChain'
import { parseVixCsvFile, toVixRows } from '../../utils/vixData'
import { fetchYahooFinanceHistory } from '../../utils/yahooFinance'
import { formatDate } from '../../utils/format'

type VixSourceMode = 'csv' | 'yahoo'

interface YahooLoadedInfo {
  ticker: string
  start: string
  end: string
  rowCount: number
}

interface Props {
  niftyDateRange: { start: string; end: string } | null
  onOptionChainChange: (rows: OptionChainRow[]) => void
  onVixChange: (rows: VixRow[]) => void
}

export default function StrangleDataSourcePanel({ niftyDateRange, onOptionChainChange, onVixChange }: Props) {
  const [optionChainFileName, setOptionChainFileName] = useState<string | null>(null)
  const [optionChainRowCount, setOptionChainRowCount] = useState(0)
  const [optionChainLoading, setOptionChainLoading] = useState(false)
  const [optionChainError, setOptionChainError] = useState<string | null>(null)
  const optionChainInputRef = useRef<HTMLInputElement>(null)

  const [vixSourceMode, setVixSourceMode] = useState<VixSourceMode>('csv')
  const [vixFileName, setVixFileName] = useState<string | null>(null)
  const [vixRowCount, setVixRowCount] = useState(0)
  const [vixLoading, setVixLoading] = useState(false)
  const [vixError, setVixError] = useState<string | null>(null)
  const vixInputRef = useRef<HTMLInputElement>(null)

  const [tickerInput, setTickerInput] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [yahooLoaded, setYahooLoaded] = useState<YahooLoadedInfo | null>(null)

  // One-time convenience default, mirroring the loaded NIFTY range — doesn't
  // fight the user's own edits once they've touched either date field.
  useEffect(() => {
    if (niftyDateRange && !startDate && !endDate) {
      setStartDate(niftyDateRange.start)
      setEndDate(niftyDateRange.end)
    }
  }, [niftyDateRange, startDate, endDate])

  const handleOptionChainFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      setOptionChainError(null)
      setOptionChainLoading(true)
      try {
        const rows = await parseOptionChainCsvFile(file)
        if (rows.length === 0) throw new Error('No usable rows found in the Option Chain CSV.')
        setOptionChainFileName(file.name)
        setOptionChainRowCount(rows.length)
        onOptionChainChange(rows)
      } catch (err) {
        setOptionChainError(err instanceof Error ? err.message : 'Failed to parse the Option Chain CSV file.')
        setOptionChainFileName(null)
        setOptionChainRowCount(0)
        onOptionChainChange([])
      } finally {
        setOptionChainLoading(false)
      }
    },
    [onOptionChainChange],
  )

  const handleVixFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      setVixError(null)
      setVixLoading(true)
      try {
        const rows = await parseVixCsvFile(file)
        if (rows.length === 0) throw new Error('No usable rows found in the India VIX CSV.')
        setVixFileName(file.name)
        setVixRowCount(rows.length)
        onVixChange(rows)
      } catch (err) {
        setVixError(err instanceof Error ? err.message : 'Failed to parse the India VIX CSV file.')
        setVixFileName(null)
        setVixRowCount(0)
        onVixChange([])
      } finally {
        setVixLoading(false)
      }
    },
    [onVixChange],
  )

  const handleFetchYahoo = useCallback(async () => {
    const ticker = tickerInput.trim()
    if (!ticker || !startDate || !endDate) return
    setVixError(null)
    setYahooLoaded(null)
    setVixLoading(true)
    try {
      const history = await fetchYahooFinanceHistory(ticker, startDate, endDate)
      const rows = toVixRows(history)
      setVixFileName(null)
      setVixRowCount(rows.length)
      setYahooLoaded({ ticker, start: startDate, end: endDate, rowCount: rows.length })
      onVixChange(rows)
    } catch (err) {
      setVixError(err instanceof Error ? err.message : 'Fetch failed. Please switch to "Upload CSV" instead.')
      setVixRowCount(0)
      onVixChange([])
    } finally {
      setVixLoading(false)
    }
  }, [tickerInput, startDate, endDate, onVixChange])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Historical Option Chain CSV</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Needs date, nifty_close, tradingsymbol, expiry, strike, instrument_type, open, high, low, close columns
          (header names are matched flexibly). Real CE/PE premiums are read directly from this file.
        </p>
        <input ref={optionChainInputRef} type="file" accept=".csv" onChange={handleOptionChainFile} className="hidden" />
        <button
          type="button"
          onClick={() => optionChainInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500"
        >
          <Upload className="h-4 w-4" />
          {optionChainFileName ? 'Replace Option Chain CSV' : 'Choose Option Chain CSV'}
        </button>
        {optionChainLoading && (
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Parsing option chain…
          </p>
        )}
        {optionChainError && (
          <p role="alert" className="flex items-center gap-2 text-sm font-medium text-rose-500 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" /> {optionChainError}
          </p>
        )}
        {optionChainFileName && !optionChainError && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> {optionChainFileName} — {optionChainRowCount.toLocaleString('en-IN')} rows loaded
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Historical India VIX</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Used only to compute the 30-day rolling percentile for entry/exit signals.</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setVixSourceMode('csv')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              vixSourceMode === 'csv'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Upload CSV
          </button>
          <button
            type="button"
            onClick={() => setVixSourceMode('yahoo')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              vixSourceMode === 'yahoo'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Fetch from Yahoo Finance
          </button>
        </div>

        {vixSourceMode === 'csv' && (
          <div className="space-y-2">
            <input ref={vixInputRef} type="file" accept=".csv" onChange={handleVixFile} className="hidden" />
            <button
              type="button"
              onClick={() => vixInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500"
            >
              <Upload className="h-4 w-4" />
              {vixFileName ? 'Replace India VIX CSV' : 'Choose India VIX CSV'}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">Needs Date and Close columns (header names are matched flexibly).</p>
          </div>
        )}

        {vixSourceMode === 'yahoo' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Ticker Symbol</span>
                <input
                  type="text"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value)}
                  placeholder="e.g. ^INDIAVIX"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-200">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleFetchYahoo}
              disabled={!tickerInput.trim() || !startDate || !endDate || vixLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Cloud className="h-4 w-4" />
              Fetch Data
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter any Yahoo Finance ticker — indices (^INDIAVIX, ^NSEI), equities (AAPL, RELIANCE.NS), crypto
              (BTC-USD), futures (GC=F), etc.
            </p>
            {yahooLoaded && !vixError && (
              <div className="rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-900/20">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">Loaded Data</p>
                <p className="text-emerald-700 dark:text-emerald-300">Ticker : {yahooLoaded.ticker}</p>
                <p className="text-emerald-700 dark:text-emerald-300">
                  Period : {formatDate(yahooLoaded.start)} → {formatDate(yahooLoaded.end)}
                </p>
                <p className="text-emerald-700 dark:text-emerald-300">Rows Loaded : {yahooLoaded.rowCount.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>
        )}

        {vixLoading && (
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading India VIX data…
          </p>
        )}
        {vixError && (
          <p role="alert" className="flex items-center gap-2 text-sm font-medium text-rose-500 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" /> {vixError}
          </p>
        )}
        {vixSourceMode === 'csv' && vixRowCount > 0 && !vixError && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {vixFileName ? `${vixFileName} — ` : ''}
            {vixRowCount.toLocaleString('en-IN')} rows loaded
          </p>
        )}
      </div>
    </div>
  )
}
