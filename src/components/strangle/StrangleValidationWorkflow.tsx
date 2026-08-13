import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Cloud, Download, Loader2, PlayCircle } from 'lucide-react'
import type { OhlcRow } from '../../types'
import type { OptionChainRow, StrangleStrategyParams, VixRow } from '../../types/strangle'
import { DEFAULT_STRANGLE_PARAMS, runShortStrangleBacktest } from '../../utils/strangleStrategy'
import { computeBuyAndHoldComparison } from '../../utils/strangleComparison'
import { generateSyntheticMarket, type SyntheticMarketDataset } from '../../utils/syntheticMarketSimulation'
import { createSeededRng } from '../../utils/seededRandom'
import { loadBundledOptionChain } from '../../utils/optionChain'
import { toVixRows } from '../../utils/vixData'
import { fetchYahooFinanceHistory } from '../../utils/yahooFinance'
import { buildSimulationResultsCsv } from '../../utils/strangleResultsExport'
import { formatDate } from '../../utils/format'
import Card from '../Card'
import InputControl from '../InputControl'
import StrangleSimplePerformanceSummary from './StrangleSimplePerformanceSummary'
import StrangleTradeHistoryTable from './StrangleTradeHistoryTable'
import StranglePriceChart from '../../charts/strangle/StranglePriceChart'
import VixPathChart from '../../charts/strangle/VixPathChart'
import EquityCurveChart from '../../charts/strangle/EquityCurveChart'

const VIX_TICKER = '^INDIAVIX'

type Mode = 'synthetic' | 'historical'

interface Props {
  ohlcRows: OhlcRow[]
  isDark: boolean
}

const EMPTY_OHLC_ROWS: OhlcRow[] = []
const EMPTY_VIX_ROWS: VixRow[] = []
const EMPTY_OPTION_CHAIN_ROWS: OptionChainRow[] = []

/**
 * The whole "evaluate the Short Strangle strategy on a given market" tool,
 * boiled down to four steps: Generate Market -> Configure Strategy -> View
 * Results -> Download One CSV. Historical Backtest stays available as a
 * secondary mode toggle rather than its own section, since the primary
 * workflow is synthetic-market validation.
 *
 * Owns all Short Strangle state itself (previously spread across
 * SimulatorPage.tsx). The bundled Option Chain loads automatically; India
 * VIX is fetched live from Yahoo Finance over a user-editable date range
 * (Fetch Data), after which the explicit actions are Generate Market, Run
 * Strategy, and Download.
 */
export default function StrangleValidationWorkflow({ ohlcRows, isDark }: Props) {
  const [mode, setMode] = useState<Mode>('synthetic')

  const niftyStart = ohlcRows.length > 0 ? ohlcRows[0].date : null
  const niftyEnd = ohlcRows.length > 0 ? ohlcRows[ohlcRows.length - 1].date : null

  // The bundled Option Chain is a prerequisite for Historical mode — loaded
  // automatically once, no user action needed.
  const [optionChainRows, setOptionChainRows] = useState<OptionChainRow[]>([])
  const [optionChainError, setOptionChainError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBundledOptionChain()
      .then((rows) => {
        if (!cancelled) setOptionChainRows(rows)
      })
      .catch((err) => {
        if (!cancelled) setOptionChainError(err instanceof Error ? err.message : 'Failed to load the bundled Option Chain dataset.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Historical India VIX — fetched live from Yahoo Finance over a
  // user-editable date range (defaults to the loaded NIFTY range, but
  // doesn't fight the user's own edits once they've touched either field).
  // Needed by both modes: Synthetic samples its return distribution from
  // it, Historical uses it directly for the rolling percentile.
  const [vixRows, setVixRows] = useState<VixRow[]>([])
  const [vixStartDate, setVixStartDate] = useState('')
  const [vixEndDate, setVixEndDate] = useState('')
  const [vixLoading, setVixLoading] = useState(false)
  const [vixError, setVixError] = useState<string | null>(null)
  const [yahooLoaded, setYahooLoaded] = useState<{ start: string; end: string; rowCount: number } | null>(null)

  useEffect(() => {
    if (niftyStart && niftyEnd && !vixStartDate && !vixEndDate) {
      setVixStartDate(niftyStart)
      setVixEndDate(niftyEnd)
    }
  }, [niftyStart, niftyEnd, vixStartDate, vixEndDate])

  const handleFetchVix = useCallback(async () => {
    if (!vixStartDate || !vixEndDate) return
    setVixError(null)
    setYahooLoaded(null)
    setVixLoading(true)
    try {
      const history = await fetchYahooFinanceHistory(VIX_TICKER, vixStartDate, vixEndDate)
      const rows = toVixRows(history)
      setVixRows(rows)
      setYahooLoaded({ start: vixStartDate, end: vixEndDate, rowCount: rows.length })
    } catch (err) {
      setVixError(err instanceof Error ? err.message : 'Fetch failed.')
      setVixRows([])
    } finally {
      setVixLoading(false)
    }
  }, [vixStartDate, vixEndDate])

  // Step 1 — Generate Synthetic Market.
  const [randomSeedInput, setRandomSeedInput] = useState<number | ''>('')
  const [syntheticDataset, setSyntheticDataset] = useState<SyntheticMarketDataset | null>(null)

  const handleGenerateMarket = useCallback(() => {
    if (ohlcRows.length === 0 || vixRows.length === 0) return
    const rng = typeof randomSeedInput === 'number' ? createSeededRng(randomSeedInput) : Math.random
    setSyntheticDataset(generateSyntheticMarket(ohlcRows, vixRows, rng))
  }, [ohlcRows, vixRows, randomSeedInput])

  // Step 2 — Configure Strategy.
  const [entryPercentileInput, setEntryPercentileInput] = useState<number | ''>(DEFAULT_STRANGLE_PARAMS.entryPercentile)
  const [exitPercentileInput, setExitPercentileInput] = useState<number | ''>(DEFAULT_STRANGLE_PARAMS.exitPercentile)
  const [otmCallPctInput, setOtmCallPctInput] = useState<number | ''>(DEFAULT_STRANGLE_PARAMS.otmCallPct)
  const [otmPutPctInput, setOtmPutPctInput] = useState<number | ''>(DEFAULT_STRANGLE_PARAMS.otmPutPct)
  const [paramsError, setParamsError] = useState<string | null>(null)
  const [appliedParams, setAppliedParams] = useState<StrangleStrategyParams>(DEFAULT_STRANGLE_PARAMS)

  const handleRunStrategy = useCallback(() => {
    if (
      typeof entryPercentileInput !== 'number' ||
      typeof exitPercentileInput !== 'number' ||
      typeof otmCallPctInput !== 'number' ||
      typeof otmPutPctInput !== 'number'
    ) {
      setParamsError('All strategy parameters are required.')
      return
    }
    if (entryPercentileInput < 0 || entryPercentileInput > 100 || exitPercentileInput < 0 || exitPercentileInput > 100) {
      setParamsError('Entry/Exit Percentile must be between 0 and 100.')
      return
    }
    if (otmCallPctInput <= 0 || otmPutPctInput <= 0) {
      setParamsError('OTM Call % and OTM Put % must be greater than 0.')
      return
    }
    setParamsError(null)
    setAppliedParams({
      entryPercentile: entryPercentileInput,
      exitPercentile: exitPercentileInput,
      otmCallPct: otmCallPctInput,
      otmPutPct: otmPutPctInput,
    })
  }, [entryPercentileInput, exitPercentileInput, otmCallPctInput, otmPutPctInput])

  // Step 3 — Results, driven by whichever mode is active.
  const strangleOhlcRows = mode === 'historical' ? ohlcRows : (syntheticDataset?.niftyRows ?? EMPTY_OHLC_ROWS)
  const strangleVixRows = mode === 'historical' ? vixRows : (syntheticDataset?.vixRows ?? EMPTY_VIX_ROWS)
  const strangleOptionChainRows = mode === 'historical' ? optionChainRows : (syntheticDataset?.optionChainRows ?? EMPTY_OPTION_CHAIN_ROWS)
  const hasDataset = mode === 'historical' ? vixRows.length > 0 && optionChainRows.length > 0 : syntheticDataset !== null

  const strangleResult = useMemo(
    () => runShortStrangleBacktest(strangleOhlcRows, strangleVixRows, strangleOptionChainRows, appliedParams),
    [strangleOhlcRows, strangleVixRows, strangleOptionChainRows, appliedParams],
  )
  const comparison = useMemo(
    () => computeBuyAndHoldComparison(strangleOhlcRows, strangleResult.trades),
    [strangleOhlcRows, strangleResult.trades],
  )

  // Step 4 — Download.
  const handleDownload = useCallback(() => {
    const csv = buildSimulationResultsCsv({
      simulationType: mode === 'historical' ? 'Historical' : 'Synthetic',
      niftyRows: strangleOhlcRows,
      vixRows: strangleVixRows,
      optionChainRows: strangleOptionChainRows,
      vixSeries: strangleResult.vixSeries,
      signals: strangleResult.signals,
      trades: strangleResult.trades,
      openPosition: strangleResult.openPosition,
      equityCurve: comparison?.equityCurve ?? [],
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `strangle-simulation-results-${Date.now()}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }, [mode, strangleOhlcRows, strangleVixRows, strangleOptionChainRows, strangleResult, comparison])

  const toggleButtonClass = (active: boolean) =>
    `rounded-xl px-4 py-2 text-sm font-semibold transition ${
      active
        ? 'bg-violet-600 text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
    }`

  return (
    <>
      <Card
        id="strategy"
        title="Short Strangle Strategy"
        description="Evaluate the India VIX rolling-percentile Short Strangle on a generated synthetic market — or, if you'd rather, the real historical market."
      >
        <div className="mb-5 flex items-center gap-2">
          <button type="button" onClick={() => setMode('synthetic')} className={toggleButtonClass(mode === 'synthetic')}>
            Synthetic Market
          </button>
          <button type="button" onClick={() => setMode('historical')} className={toggleButtonClass(mode === 'historical')}>
            Historical Data
          </button>
        </div>

        <div className="mb-6 space-y-3 border-b border-slate-100 pb-6 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Historical India VIX</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fetched live from Yahoo Finance ({VIX_TICKER}) — used to derive the Synthetic market's VIX distribution, and for the
            rolling percentile in both modes.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Start Date</span>
              <input
                type="date"
                value={vixStartDate}
                onChange={(e) => setVixStartDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">End Date</span>
              <input
                type="date"
                value={vixEndDate}
                onChange={(e) => setVixEndDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleFetchVix}
            disabled={!vixStartDate || !vixEndDate || vixLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
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
          {optionChainError && (
            <p role="alert" className="flex items-center gap-2 text-sm font-medium text-rose-500 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" /> {optionChainError}
            </p>
          )}
          {yahooLoaded && !vixError && (
            <div className="rounded-xl bg-teal-50 p-3 text-sm dark:bg-teal-900/20">
              <p className="font-semibold text-teal-700 dark:text-teal-300">Loaded Data</p>
              <p className="text-teal-700 dark:text-teal-300">Ticker : {VIX_TICKER}</p>
              <p className="text-teal-700 dark:text-teal-300">
                Period : {formatDate(yahooLoaded.start)} → {formatDate(yahooLoaded.end)}
              </p>
              <p className="text-teal-700 dark:text-teal-300">Rows Loaded : {yahooLoaded.rowCount.toLocaleString('en-IN')}</p>
            </div>
          )}
        </div>

        {mode === 'synthetic' ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">1. Generate Synthetic Market</p>
            <div className="flex flex-wrap items-end gap-4">
              <InputControl id="random-seed" label="Random Seed (optional)" value={randomSeedInput} onChange={setRandomSeedInput} step={1} />
              <button
                type="button"
                onClick={handleGenerateMarket}
                disabled={vixRows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayCircle className="h-4 w-4" />
                Generate Market
              </button>
            </div>
            {syntheticDataset && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="h-4 w-4" /> Generated {syntheticDataset.niftyRows.length.toLocaleString('en-IN')} trading days of
                simulated NIFTY, India VIX, and option prices.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">1. Historical Market</p>
            {vixRows.length > 0 && optionChainRows.length > 0 && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="h-4 w-4" /> Ready — real historical NIFTY, India VIX, and Option Chain data loaded.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">2. Configure Strategy</p>
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
          <button
            type="button"
            onClick={handleRunStrategy}
            disabled={!hasDataset}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlayCircle className="h-4 w-4" />
            Run Strategy
          </button>
        </div>
      </Card>

      {hasDataset && (
        <Card title="Results">
          <div className="space-y-8">
            <StrangleSimplePerformanceSummary
              performance={strangleResult.performance}
              strategyReturnPct={comparison?.strategyReturnPct ?? 0}
              buyHoldReturnPct={comparison?.buyHoldReturnPct ?? 0}
            />

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Simulated NIFTY</p>
              <StranglePriceChart
                rows={strangleOhlcRows}
                trades={strangleResult.trades}
                openPosition={strangleResult.openPosition}
                signals={strangleResult.signals}
                isDark={isDark}
              />
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-6 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Simulated India VIX</p>
              <VixPathChart vixSeries={strangleResult.vixSeries} signals={strangleResult.signals} isDark={isDark} />
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-6 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Strategy Equity Curve</p>
              {comparison ? (
                <EquityCurveChart equityCurve={comparison.equityCurve} strategyName="Short Strangle" isDark={isDark} />
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No completed trades yet to chart.</p>
              )}
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-6 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Trade History</p>
              <StrangleTradeHistoryTable trades={strangleResult.trades} simulationSource={mode === 'historical' ? 'historical' : 'synthetic'} />
            </div>

            <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" />
                Download Simulation Results
              </button>
            </div>
          </div>
        </Card>
      )}
    </>
  )
}
