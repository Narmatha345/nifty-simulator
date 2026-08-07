import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Database, LineChart as LineChartIcon, Repeat, Sigma, SlidersHorizontal } from 'lucide-react'
import Header from '../components/Header'
import Card from '../components/Card'
import BottomNavigation, { type NavItem } from '../components/BottomNavigation'
import DataSourcePanel from '../components/DataSourcePanel'
import ProbabilityTable from '../components/ProbabilityTable'
import SimulationControls from '../components/SimulationControls'
import SimulationDataTable from '../components/SimulationDataTable'
import StatisticsSummary from '../components/StatisticsSummary'
import ReturnHistogramChart from '../charts/ReturnHistogramChart'
import SimulatedPathsChart from '../charts/SimulatedPathsChart'
import FinalDistributionChart from '../charts/FinalDistributionChart'
import type { OhlcRow, SimulationResult } from '../types'
import { computeDailyReturns, extractReturnValues } from '../utils/returns'
import { buildHistogram } from '../utils/histogram'
import { computeProbabilityDistribution } from '../utils/probability'
import { runSimulationAsync } from '../utils/simulator'
import { computeSummaryStatistics } from '../utils/statistics'
import InputControl from '../components/InputControl'
import type { OptionChainRow, SimulationSource, StrangleStrategyParams, VixRow } from '../types/strangle'
import { DEFAULT_STRANGLE_PARAMS, runShortStrangleBacktest } from '../utils/strangleStrategy'
import { generateRandomNiftyPath } from '../utils/randomNiftyGenerator'
import { generateSyntheticMarket } from '../utils/syntheticMarketSimulation'
import { computeRollingVixPercentile } from '../utils/vixPercentile'
import { buildHistoricalScenarioSummary, runSyntheticScenarioBatch } from '../utils/strangleBatchSimulation'
import { computeBuyAndHoldComparison } from '../utils/strangleComparison'
import StrangleDataSourcePanel from '../components/strangle/StrangleDataSourcePanel'
import StrangleDashboard from '../components/strangle/StrangleDashboard'
import StrangleTradeHistoryTable from '../components/strangle/StrangleTradeHistoryTable'
import StranglePerformanceSummary from '../components/strangle/StranglePerformanceSummary'
import StranglePriceChart from '../charts/strangle/StranglePriceChart'
import VixPathChart from '../charts/strangle/VixPathChart'
import OptionPremiumChart from '../charts/strangle/OptionPremiumChart'
import SimulationSourceSelector from '../components/strangle/SimulationSourceSelector'
import StrangleComparisonSummary from '../components/strangle/StrangleComparisonSummary'
import StrangleComparisonTable from '../components/strangle/StrangleComparisonTable'
import EquityCurveChart from '../charts/strangle/EquityCurveChart'
import StrangleSyntheticBatchPanel from '../components/strangle/StrangleSyntheticBatchPanel'
import StrangleSimulationPanel from '../components/strangle/StrangleSimulationPanel'
import StrangleModeComparisonTable from '../components/strangle/StrangleModeComparisonTable'

const NAV_ITEMS: NavItem[] = [
  { id: 'data', label: 'Data', icon: Database },
  { id: 'distribution', label: 'Distribution', icon: BarChart3 },
  { id: 'simulate', label: 'Simulate', icon: SlidersHorizontal },
  { id: 'results', label: 'Results', icon: LineChartIcon },
  { id: 'statistics', label: 'Stats', icon: Sigma },
  { id: 'strategy', label: 'Strategy', icon: Repeat },
]

// Stable empty-array fallbacks for when Synthetic Simulation mode has no
// generated dataset yet — reused (not `?? []` inline) so strangleOhlcRows /
// strangleVixRows / strangleOptionChainRows keep a stable reference across
// renders and don't defeat the useMemo below them.
const EMPTY_OHLC_ROWS: OhlcRow[] = []
const EMPTY_VIX_ROWS: VixRow[] = []
const EMPTY_OPTION_CHAIN_ROWS: OptionChainRow[] = []

function useIsDark() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    window.localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return { isDark, toggle: () => setIsDark((v) => !v) }
}

export default function SimulatorPage() {
  const { isDark, toggle } = useIsDark()

  const [ohlcRows, setOhlcRows] = useState<OhlcRow[]>([])
  const handleOhlcRowsChange = useCallback((rows: OhlcRow[]) => setOhlcRows(rows), [])

  const [binWidth, setBinWidth] = useState(0.5)

  const [currentLevel, setCurrentLevel] = useState<number | ''>('')
  const [forecastDays, setForecastDays] = useState<number | ''>(30)
  const [numPaths, setNumPaths] = useState<number | ''>(1000)

  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)

  useEffect(() => {
    if (ohlcRows.length > 0) {
      setCurrentLevel(ohlcRows[ohlcRows.length - 1].close)
      setSimulationResult(null)
    }
  }, [ohlcRows])

  const returnPoints = useMemo(() => computeDailyReturns(ohlcRows), [ohlcRows])
  const returnValues = useMemo(() => extractReturnValues(returnPoints), [returnPoints])
  const histogramBins = useMemo(
    () => buildHistogram(returnValues, binWidth > 0 ? binWidth : 0.5),
    [returnValues, binWidth],
  )
  const probabilityBins = useMemo(
    () => computeProbabilityDistribution(histogramBins, returnValues.length),
    [histogramBins, returnValues.length],
  )

  const canRun =
    probabilityBins.length > 0 &&
    typeof currentLevel === 'number' &&
    currentLevel > 0 &&
    typeof forecastDays === 'number' &&
    forecastDays >= 1 &&
    typeof numPaths === 'number' &&
    numPaths >= 1

  const handleRunSimulation = useCallback(async () => {
    if (!canRun || typeof currentLevel !== 'number' || typeof forecastDays !== 'number' || typeof numPaths !== 'number') {
      return
    }
    setIsRunning(true)
    setProgress({ completed: 0, total: numPaths })
    try {
      const result = await runSimulationAsync(
        probabilityBins,
        { currentLevel, forecastDays, numPaths },
        (completed, total) => setProgress({ completed, total }),
      )
      setSimulationResult(result)
    } finally {
      setIsRunning(false)
    }
  }, [canRun, currentLevel, forecastDays, numPaths, probabilityBins])

  const statistics = useMemo(
    () => (simulationResult ? computeSummaryStatistics(simulationResult) : null),
    [simulationResult],
  )

  // Short Strangle strategy — the app's only trading strategy. Uses the
  // loaded NIFTY data (historical or randomly generated) as the underlying,
  // plus its own Option Chain CSV and India VIX data for premiums and
  // entry/exit signals respectively.
  const [optionChainRows, setOptionChainRows] = useState<OptionChainRow[]>([])
  const [vixRows, setVixRows] = useState<VixRow[]>([])
  const [strangleParams, setStrangleParams] = useState<StrangleStrategyParams>(DEFAULT_STRANGLE_PARAMS)
  const niftyDateRange = ohlcRows.length > 0 ? { start: ohlcRows[0].date, end: ohlcRows[ohlcRows.length - 1].date } : null

  // Simulation Source — lets the same Short Strangle engine run on the
  // loaded historical NIFTY data, a synthetic random NIFTY path generated
  // from that same data's historical return distribution (historical VIX +
  // Option Chain still apply), or a fully synthetic market. The synthetic
  // market is its own standalone module (syntheticMarketSimulation.ts): a
  // "Run Simulation" click generates and stores one complete dataset (Random
  // NIFTY + Random VIX + Black-Scholes option chain), and the strategy below
  // only ever reads that stored dataset — it never generates data itself.
  const [simulationSource, setSimulationSource] = useState<SimulationSource>('historical')
  const [randomPathSeed, setRandomPathSeed] = useState(0)
  const randomNiftyRows = useMemo(
    () => (ohlcRows.length > 0 ? generateRandomNiftyPath(ohlcRows) : []),
    [ohlcRows, randomPathSeed],
  )

  const [syntheticDataset, setSyntheticDataset] = useState<ReturnType<typeof generateSyntheticMarket> | null>(null)
  const handleRunSyntheticMarket = useCallback(() => {
    if (ohlcRows.length === 0 || vixRows.length === 0) return
    setSyntheticDataset(generateSyntheticMarket(ohlcRows, vixRows))
  }, [ohlcRows, vixRows])

  const strangleOhlcRows =
    simulationSource === 'historical' ? ohlcRows : simulationSource === 'random' ? randomNiftyRows : (syntheticDataset?.niftyRows ?? EMPTY_OHLC_ROWS)
  const strangleVixRows = simulationSource === 'synthetic' ? (syntheticDataset?.vixRows ?? EMPTY_VIX_ROWS) : vixRows
  const strangleOptionChainRows = simulationSource === 'synthetic' ? (syntheticDataset?.optionChainRows ?? EMPTY_OPTION_CHAIN_ROWS) : optionChainRows
  const hasStrangleData = simulationSource === 'synthetic' ? syntheticDataset !== null : optionChainRows.length > 0 && vixRows.length > 0

  const strangleResult = useMemo(
    () => runShortStrangleBacktest(strangleOhlcRows, strangleVixRows, strangleOptionChainRows, strangleParams),
    [strangleOhlcRows, strangleVixRows, strangleOptionChainRows, strangleParams],
  )
  const comparison = useMemo(
    () => computeBuyAndHoldComparison(strangleOhlcRows, strangleResult.trades),
    [strangleOhlcRows, strangleResult.trades],
  )

  // Historical and Synthetic backtests, each computed independently of the
  // `simulationSource` toggle above, so the Historical vs Synthetic
  // comparison section and the Strategy Validation batch can always show
  // both sides regardless of which one is currently selected for the main
  // dashboard/charts.
  const historicalStrangleResult = useMemo(
    () =>
      ohlcRows.length > 0 && vixRows.length > 0 && optionChainRows.length > 0
        ? runShortStrangleBacktest(ohlcRows, vixRows, optionChainRows, strangleParams)
        : null,
    [ohlcRows, vixRows, optionChainRows, strangleParams],
  )
  const historicalComparison = useMemo(
    () => (historicalStrangleResult ? computeBuyAndHoldComparison(ohlcRows, historicalStrangleResult.trades) : null),
    [ohlcRows, historicalStrangleResult],
  )
  const historicalScenarioSummary = historicalStrangleResult
    ? buildHistoricalScenarioSummary(historicalStrangleResult.performance, historicalComparison?.strategyReturnPct ?? 0)
    : null

  const syntheticStrangleResult = useMemo(
    () =>
      syntheticDataset
        ? runShortStrangleBacktest(syntheticDataset.niftyRows, syntheticDataset.vixRows, syntheticDataset.optionChainRows, strangleParams)
        : null,
    [syntheticDataset, strangleParams],
  )
  const syntheticComparison = useMemo(
    () => (syntheticDataset && syntheticStrangleResult ? computeBuyAndHoldComparison(syntheticDataset.niftyRows, syntheticStrangleResult.trades) : null),
    [syntheticDataset, syntheticStrangleResult],
  )

  // Pure visualization of the generated dataset itself (Requirement 5) —
  // independent of whether the strategy found any trades on it, so the
  // Simulated NIFTY / India VIX / Option Premium charts always reflect
  // exactly what "Run Market Simulation" produced.
  const syntheticVixSeries = useMemo(
    () => (syntheticDataset ? computeRollingVixPercentile(syntheticDataset.vixRows) : []),
    [syntheticDataset],
  )

  const handleRunSyntheticBatch = useCallback(
    (runCount: number) =>
      new Promise<ReturnType<typeof runSyntheticScenarioBatch>>((resolve) => {
        // Yields to the browser once before the batch's synchronous compute,
        // so the "Running…" state actually paints first.
        setTimeout(() => resolve(runSyntheticScenarioBatch(ohlcRows, vixRows, strangleParams, runCount)), 0)
      }),
    [ohlcRows, vixRows, strangleParams],
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <Header isDark={isDark} onToggleTheme={toggle} />

        <Card
          id="data"
          title="1. Historical Data"
          description="Load NIFTY daily OHLC data for a date range. Only the Close price is used for calculations."
        >
          <DataSourcePanel onChange={handleOhlcRowsChange} />
        </Card>

        <Card
          id="distribution"
          title="2–4. Historical Return Distribution"
          description="Daily % changes, bucketed into a histogram, converted into a probability table — no distribution shape is assumed."
        >
          {returnValues.length > 0 ? (
            <div className="space-y-5">
              <div className="max-w-xs">
                <InputControl
                  id="bin-width"
                  label="Histogram Bin Width (%)"
                  value={binWidth}
                  onChange={(v) => setBinWidth(typeof v === 'number' && v > 0 ? v : 0.5)}
                  min={0.1}
                  max={5}
                  step={0.1}
                />
              </div>
              <ReturnHistogramChart bins={histogramBins} totalObservations={returnValues.length} isDark={isDark} />
              <ProbabilityTable bins={probabilityBins} totalObservations={returnValues.length} />
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Load historical data above to see the return distribution.</p>
          )}
        </Card>

        <Card
          id="simulate"
          title="5–6. Scenario Simulation"
          description="Each simulated day independently samples a return from the historical probability distribution above, then compounds it onto the running NIFTY level."
        >
          <SimulationControls
            currentLevel={currentLevel}
            forecastDays={forecastDays}
            numPaths={numPaths}
            onCurrentLevelChange={setCurrentLevel}
            onForecastDaysChange={setForecastDays}
            onNumPathsChange={setNumPaths}
            onRun={handleRunSimulation}
            isRunning={isRunning}
            progress={progress}
            canRun={canRun}
          />
        </Card>

        {simulationResult && statistics && typeof currentLevel === 'number' && (
          <>
            <Card id="results" title="7. Simulated Paths" description="Each line is one possible future NIFTY path.">
              <SimulatedPathsChart paths={simulationResult.paths} currentLevel={currentLevel} isDark={isDark} />
            </Card>

            <Card title="Distribution of Final NIFTY Values" description="How the simulated final-day values are spread out.">
              <FinalDistributionChart paths={simulationResult.paths} currentLevel={currentLevel} isDark={isDark} />
            </Card>

            <Card title="Simulation Data Table" description="Day-by-day levels, final value, max rise and max fall for every simulated path.">
              <SimulationDataTable paths={simulationResult.paths} />
            </Card>

            <Card id="statistics" title="8. Statistical Summary">
              <StatisticsSummary stats={statistics} currentLevel={currentLevel} />
            </Card>
          </>
        )}

        {ohlcRows.length > 0 && (
          <>
            <Card
              id="strategy"
              title="Short Strangle Strategy"
              description="India VIX rolling-percentile-driven Short Strangle. Historical Backtest uses real option premiums from the bundled Option Chain dataset; Synthetic Simulation prices its own options with Black-Scholes off a simulated NIFTY + India VIX market."
            >
              <div className="mb-5">
                <SimulationSourceSelector
                  value={simulationSource}
                  onChange={setSimulationSource}
                  onRegenerate={() => setRandomPathSeed((s) => s + 1)}
                />
              </div>

              <StrangleDataSourcePanel
                niftyDateRange={niftyDateRange}
                onOptionChainChange={setOptionChainRows}
                onVixChange={setVixRows}
                onParamsChange={setStrangleParams}
              />
            </Card>

            {vixRows.length > 0 && (
              <Card
                title="Synthetic Market Simulation"
                description="Generates one complete synthetic market — Random NIFTY path, Random India VIX path, and a Black-Scholes option chain priced off both — as a standalone step before the strategy runs. Synthetic Simulation mode above always runs on whatever dataset is generated here."
              >
                <StrangleSimulationPanel dataset={syntheticDataset} onRunSimulation={handleRunSyntheticMarket} />
              </Card>
            )}

            {syntheticDataset && (
              <Card
                title="Simulated Market Charts"
                description="Pure visualization of the generated dataset itself — no strategy entry/exit markers — for validating the simulation before (or regardless of) running the strategy on it."
              >
                <div className="space-y-8">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Simulated NIFTY Path</p>
                    <StranglePriceChart rows={syntheticDataset.niftyRows} trades={[]} openPosition={null} signals={[]} isDark={isDark} />
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-6 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Simulated India VIX Path</p>
                    <VixPathChart vixSeries={syntheticVixSeries} signals={[]} isDark={isDark} />
                  </div>
                  <div className="space-y-2 border-t border-slate-100 pt-6 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Synthetic Option Prices</p>
                    <OptionPremiumChart optionChainRows={syntheticDataset.optionChainRows} isDark={isDark} />
                  </div>
                </div>
              </Card>
            )}

            {hasStrangleData && (
              <>
                <Card title="Short Strangle Dashboard">
                  <StrangleDashboard
                    vixSeries={strangleResult.vixSeries}
                    openPosition={strangleResult.openPosition}
                    hasCompletedTrades={strangleResult.trades.length > 0}
                    simulationSource={simulationSource}
                  />
                </Card>

                <Card
                  title="NIFTY Chart with Entry/Exit Markers"
                  description="Shaded regions mark each trade's holding period."
                >
                  <StranglePriceChart
                    rows={strangleOhlcRows}
                    trades={strangleResult.trades}
                    openPosition={strangleResult.openPosition}
                    signals={strangleResult.signals}
                    isDark={isDark}
                  />
                </Card>

                <Card
                  title="India VIX Chart with Entry/Exit Markers"
                  description="The same VIX series the strategy's entry/exit percentile signals are computed from — historical or simulated depending on the source selected above."
                >
                  <VixPathChart vixSeries={strangleResult.vixSeries} signals={strangleResult.signals} isDark={isDark} />
                </Card>

                <Card title="Trade History">
                  <StrangleTradeHistoryTable trades={strangleResult.trades} simulationSource={simulationSource} />
                </Card>

                <Card title="Performance Summary">
                  <StranglePerformanceSummary performance={strangleResult.performance} />
                </Card>

                <Card
                  title="Buy & Hold vs Short Strangle"
                  description="For every trade, Buy & Hold profit is Exit NIFTY Price minus Entry NIFTY Price over the same window the strategy was in the market."
                >
                  {comparison ? (
                    <div className="space-y-5">
                      <StrangleComparisonSummary comparison={comparison} />
                      <StrangleComparisonTable comparison={comparison} strategyPerformance={strangleResult.performance} />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No completed trades yet to compare against Buy & Hold.</p>
                  )}
                </Card>

                <Card
                  title="Equity Curve Comparison"
                  description="Short Strangle cumulative P&L vs. Buy & Hold cumulative P&L, both accrued at each trade's exit date."
                >
                  {comparison ? (
                    <EquityCurveChart equityCurve={comparison.equityCurve} strategyName="Short Strangle" isDark={isDark} />
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No completed trades yet to chart.</p>
                  )}
                </Card>
              </>
            )}

            {(historicalStrangleResult || syntheticStrangleResult) && (
              <Card
                title="Historical vs Synthetic Performance"
                description="The current Historical Backtest (real Option Chain data) next to the current Synthetic Market Simulation dataset generated above — run each mode's data source to fill in its column."
              >
                <StrangleModeComparisonTable
                  historical={
                    historicalStrangleResult
                      ? { performance: historicalStrangleResult.performance, strategyReturnPct: historicalComparison?.strategyReturnPct ?? 0 }
                      : null
                  }
                  synthetic={
                    syntheticStrangleResult
                      ? { performance: syntheticStrangleResult.performance, strategyReturnPct: syntheticComparison?.strategyReturnPct ?? 0 }
                      : null
                  }
                />
              </Card>
            )}

            {(historicalComparison || syntheticComparison) && (
              <Card
                title="Buy & Hold vs Short Strangle — Historical vs Synthetic"
                description="For every trade, Buy & Hold profit is Exit NIFTY Price minus Entry NIFTY Price over the same window the strategy was in the market — shown for both data sources independently of which one is selected above."
              >
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Historical</p>
                    {historicalComparison && historicalStrangleResult ? (
                      <div className="space-y-5">
                        <StrangleComparisonSummary comparison={historicalComparison} />
                        <StrangleComparisonTable comparison={historicalComparison} strategyPerformance={historicalStrangleResult.performance} />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No completed Historical trades yet to compare.</p>
                    )}
                  </div>
                  <div className="space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Synthetic</p>
                    {syntheticComparison && syntheticStrangleResult ? (
                      <div className="space-y-5">
                        <StrangleComparisonSummary comparison={syntheticComparison} />
                        <StrangleComparisonTable comparison={syntheticComparison} strategyPerformance={syntheticStrangleResult.performance} />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No completed Synthetic trades yet — run a simulation above first.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {vixRows.length > 0 && (
              <Card
                title="Strategy Validation — Historical vs Synthetic Markets"
                description="Runs the same Short Strangle engine on many independently generated synthetic markets (fresh Random NIFTY + Random VIX + Black-Scholes options per run) to check whether the strategy's edge holds up beyond the one historical path."
              >
                <StrangleSyntheticBatchPanel historical={historicalScenarioSummary} onRun={handleRunSyntheticBatch} />
              </Card>
            )}
          </>
        )}
      </div>

      <BottomNavigation items={NAV_ITEMS} />
    </div>
  )
}
