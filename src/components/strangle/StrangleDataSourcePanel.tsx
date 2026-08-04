import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Cloud, Loader2 } from 'lucide-react'
import type { OptionChainRow, StrangleStrategyParams, VixRow } from '../../types/strangle'
import { loadBundledOptionChain } from '../../utils/optionChain'
import { toVixRows } from '../../utils/vixData'
import { fetchYahooFinanceHistory } from '../../utils/yahooFinance'
import { formatDate } from '../../utils/format'
import { DEFAULT_STRANGLE_PARAMS } from '../../utils/strangleStrategy'
import InputControl from '../InputControl'

// India VIX is the only signal source this strategy is defined against — not
// user-configurable, per spec.
const VIX_TICKER = '^INDIAVIX'

interface YahooLoadedInfo {
  start: string
  end: string
  rowCount: number
}

interface Props {
  niftyDateRange: { start: string; end: string } | null
  onOptionChainChange: (rows: OptionChainRow[]) => void
  onVixChange: (rows: VixRow[]) => void
  onParamsChange: (params: StrangleStrategyParams) => void
}

export default function StrangleDataSourcePanel({ niftyDateRange, onOptionChainChange, onVixChange, onParamsChange }: Props) {
  const [optionChainRowCount, setOptionChainRowCount] = useState(0)
  const [optionChainLoading, setOptionChainLoading] = useState(false)
  const [optionChainError, setOptionChainError] = useState<string | null>(null)

  const [vixLoading, setVixLoading] = useState(false)
  const [vixError, setVixError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [yahooLoaded, setYahooLoaded] = useState<YahooLoadedInfo | null>(null)

  const [entryPercentileInput, setEntryPercentileInputRaw] = useState<number | ''>(DEFAULT_STRANGLE_PARAMS.entryPercentile)
  const [exitPercentileInput, setExitPercentileInputRaw] = useState<number | ''>(DEFAULT_STRANGLE_PARAMS.exitPercentile)
  const [otmCallPctInput, setOtmCallPctInputRaw] = useState<number | ''>(DEFAULT_STRANGLE_PARAMS.otmCallPct)
  const [otmPutPctInput, setOtmPutPctInputRaw] = useState<number | ''>(DEFAULT_STRANGLE_PARAMS.otmPutPct)
  const [paramsError, setParamsError] = useState<string | null>(null)
  const [paramsWarning, setParamsWarning] = useState<string | null>(null)
  // Starts equal to the defaults SimulatorPage already runs the strategy
  // with, so this accurately reflects "what's live" from the very first
  // render, not just after the first click.
  const [appliedParams, setAppliedParams] = useState<StrangleStrategyParams | null>(DEFAULT_STRANGLE_PARAMS)

  // Editing any parameter after a successful run invalidates the "applied"
  // confirmation below — it should only ever describe what's actually live.
  const setEntryPercentileInput = useCallback((v: number | '') => {
    setEntryPercentileInputRaw(v)
    setAppliedParams(null)
  }, [])
  const setExitPercentileInput = useCallback((v: number | '') => {
    setExitPercentileInputRaw(v)
    setAppliedParams(null)
  }, [])
  const setOtmCallPctInput = useCallback((v: number | '') => {
    setOtmCallPctInputRaw(v)
    setAppliedParams(null)
  }, [])
  const setOtmPutPctInput = useCallback((v: number | '') => {
    setOtmPutPctInputRaw(v)
    setAppliedParams(null)
  }, [])

  // Option Chain is a bundled internal dataset — loaded once automatically,
  // no upload interaction.
  useEffect(() => {
    let cancelled = false
    setOptionChainLoading(true)
    setOptionChainError(null)
    loadBundledOptionChain()
      .then((rows) => {
        if (cancelled) return
        setOptionChainRowCount(rows.length)
        onOptionChainChange(rows)
      })
      .catch((err) => {
        if (cancelled) return
        setOptionChainError(err instanceof Error ? err.message : 'Failed to load the bundled Option Chain dataset.')
        onOptionChainChange([])
      })
      .finally(() => {
        if (!cancelled) setOptionChainLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onOptionChainChange])

  // One-time convenience default, mirroring the loaded NIFTY range — doesn't
  // fight the user's own edits once they've touched either date field.
  useEffect(() => {
    if (niftyDateRange && !startDate && !endDate) {
      setStartDate(niftyDateRange.start)
      setEndDate(niftyDateRange.end)
    }
  }, [niftyDateRange, startDate, endDate])

  const handleFetchYahoo = useCallback(async () => {
    if (!startDate || !endDate) return
    setVixError(null)
    setYahooLoaded(null)
    setVixLoading(true)
    try {
      const history = await fetchYahooFinanceHistory(VIX_TICKER, startDate, endDate)
      const rows = toVixRows(history)
      setYahooLoaded({ start: startDate, end: endDate, rowCount: rows.length })
      onVixChange(rows)
    } catch (err) {
      setVixError(err instanceof Error ? err.message : 'Fetch failed.')
      onVixChange([])
    } finally {
      setVixLoading(false)
    }
  }, [startDate, endDate, onVixChange])

  const handleRunStrategy = useCallback(() => {
    if (
      typeof entryPercentileInput !== 'number' ||
      typeof exitPercentileInput !== 'number' ||
      typeof otmCallPctInput !== 'number' ||
      typeof otmPutPctInput !== 'number'
    ) {
      setParamsError('All strategy parameters are required.')
      setParamsWarning(null)
      return
    }
    if (entryPercentileInput < 0 || entryPercentileInput > 100) {
      setParamsError('Entry Percentile must be between 0 and 100.')
      setParamsWarning(null)
      return
    }
    if (exitPercentileInput < 0 || exitPercentileInput > 100) {
      setParamsError('Exit Percentile must be between 0 and 100.')
      setParamsWarning(null)
      return
    }
    if (otmCallPctInput <= 0) {
      setParamsError('OTM Call % must be greater than 0.')
      setParamsWarning(null)
      return
    }
    if (otmPutPctInput <= 0) {
      setParamsError('OTM Put % must be greater than 0.')
      setParamsWarning(null)
      return
    }

    setParamsError(null)
    setParamsWarning(
      entryPercentileInput <= exitPercentileInput
        ? 'Entry Percentile is normally greater than Exit Percentile — double-check these values.'
        : null,
    )
    const applied: StrangleStrategyParams = {
      entryPercentile: entryPercentileInput,
      exitPercentile: exitPercentileInput,
      otmCallPct: otmCallPctInput,
      otmPutPct: otmPutPctInput,
    }
    onParamsChange(applied)
    setAppliedParams(applied)
  }, [entryPercentileInput, exitPercentileInput, otmCallPctInput, otmPutPctInput, onParamsChange])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Historical Option Chain</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Loaded automatically from the dataset bundled with the app — real CE/PE premiums, no upload needed.
        </p>
        {optionChainLoading && (
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading option chain dataset…
          </p>
        )}
        {optionChainError && (
          <p role="alert" className="flex items-center gap-2 text-sm font-medium text-rose-500 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" /> {optionChainError}
          </p>
        )}
        {optionChainRowCount > 0 && !optionChainError && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> {optionChainRowCount.toLocaleString('en-IN')} rows loaded
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Historical India VIX</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Fetched live from Yahoo Finance ({VIX_TICKER}) — used only to compute the 30-day rolling percentile for
          entry/exit signals.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          disabled={!startDate || !endDate || vixLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Cloud className="h-4 w-4" />
          Fetch Data
        </button>

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
        {yahooLoaded && !vixError && (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-900/20">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">Loaded Data</p>
            <p className="text-emerald-700 dark:text-emerald-300">Ticker : {VIX_TICKER}</p>
            <p className="text-emerald-700 dark:text-emerald-300">
              Period : {formatDate(yahooLoaded.start)} → {formatDate(yahooLoaded.end)}
            </p>
            <p className="text-emerald-700 dark:text-emerald-300">Rows Loaded : {yahooLoaded.rowCount.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Strategy Parameters</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InputControl id="entry-percentile" label="Entry Percentile" value={entryPercentileInput} onChange={setEntryPercentileInput} min={0} max={100} step={1} />
          <InputControl id="exit-percentile" label="Exit Percentile" value={exitPercentileInput} onChange={setExitPercentileInput} min={0} max={100} step={1} />
          <InputControl id="otm-call-pct" label="OTM Call %" value={otmCallPctInput} onChange={setOtmCallPctInput} min={0.1} step={0.5} />
          <InputControl id="otm-put-pct" label="OTM Put %" value={otmPutPctInput} onChange={setOtmPutPctInput} min={0.1} step={0.5} />
        </div>
        {paramsError && (
          <p role="alert" className="flex items-center gap-2 text-sm font-medium text-rose-500 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" /> {paramsError}
          </p>
        )}
        {paramsWarning && !paramsError && (
          <p className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" /> {paramsWarning}
          </p>
        )}

        {appliedParams ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Strategy running with Entry {appliedParams.entryPercentile}% · Exit{' '}
            {appliedParams.exitPercentile}% · OTM Call {appliedParams.otmCallPct}% · OTM Put {appliedParams.otmPutPct}%
          </p>
        ) : (
          !paramsError && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" /> Parameters changed — click "Run Strategy" to apply them.
            </p>
          )
        )}

        <button
          type="button"
          onClick={handleRunStrategy}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Run Strategy
        </button>
      </div>
    </div>
  )
}
