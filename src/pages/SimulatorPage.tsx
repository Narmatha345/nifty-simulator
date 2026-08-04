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
import { computeSMA } from '../utils/movingAverage'
import { createSmaCrossoverStrategy } from '../utils/strategy'
import { runBacktest } from '../utils/backtest'
import StrategySummary from '../components/strategy/StrategySummary'
import PerformanceMetrics from '../components/strategy/PerformanceMetrics'
import TradeHistoryTable from '../components/strategy/TradeHistoryTable'
import PriceWithSignalsChart from '../charts/strategy/PriceWithSignalsChart'
import EquityCurveChart from '../charts/strategy/EquityCurveChart'
import type { OptionChainRow, StrangleStrategyParams, VixRow } from '../types/strangle'
import { DEFAULT_STRANGLE_PARAMS, runShortStrangleBacktest } from '../utils/strangleStrategy'
import StrangleDataSourcePanel from '../components/strangle/StrangleDataSourcePanel'
import StrangleDashboard from '../components/strangle/StrangleDashboard'
import StrangleTradeHistoryTable from '../components/strangle/StrangleTradeHistoryTable'
import StranglePerformanceSummary from '../components/strangle/StranglePerformanceSummary'
import StranglePriceChart from '../charts/strangle/StranglePriceChart'

const DEFAULT_SMA_WINDOW = 30

type StrategyType = 'moving-average' | 'short-strangle'

const NAV_ITEMS: NavItem[] = [
  { id: 'data', label: 'Data', icon: Database },
  { id: 'distribution', label: 'Distribution', icon: BarChart3 },
  { id: 'simulate', label: 'Simulate', icon: SlidersHorizontal },
  { id: 'results', label: 'Results', icon: LineChartIcon },
  { id: 'statistics', label: 'Stats', icon: Sigma },
  { id: 'strategy', label: 'Strategy', icon: Repeat },
]

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

  // Trading strategy backtest — independent of the scenario simulator above;
  // runs directly on the loaded historical OHLC data.
  const [smaWindowInput, setSmaWindowInput] = useState<number | ''>(DEFAULT_SMA_WINDOW)
  const smaWindow = typeof smaWindowInput === 'number' && smaWindowInput >= 2 ? Math.round(smaWindowInput) : DEFAULT_SMA_WINDOW
  const smaCrossoverStrategy = useMemo(() => createSmaCrossoverStrategy(smaWindow), [smaWindow])
  const sma = useMemo(() => computeSMA(ohlcRows.map((row) => row.close), smaWindow), [ohlcRows, smaWindow])
  const signals = useMemo(() => smaCrossoverStrategy.generateSignals(ohlcRows), [smaCrossoverStrategy, ohlcRows])
  const backtestResult = useMemo(() => runBacktest(ohlcRows, signals), [ohlcRows, signals])
  const hasEnoughDataForStrategy = ohlcRows.length > smaWindow

  // Short Strangle strategy — a second, independent strategy option. Uses the
  // same loaded NIFTY data as the underlying, plus its own Option Chain CSV
  // and India VIX data for premiums and entry/exit signals respectively.
  const [strategyType, setStrategyType] = useState<StrategyType>('moving-average')
  const [optionChainRows, setOptionChainRows] = useState<OptionChainRow[]>([])
  const [vixRows, setVixRows] = useState<VixRow[]>([])
  const [strangleParams, setStrangleParams] = useState<StrangleStrategyParams>(DEFAULT_STRANGLE_PARAMS)
  const niftyDateRange = ohlcRows.length > 0 ? { start: ohlcRows[0].date, end: ohlcRows[ohlcRows.length - 1].date } : null
  const hasStrangleData = optionChainRows.length > 0 && vixRows.length > 0
  const strangleResult = useMemo(
    () => runShortStrangleBacktest(ohlcRows, vixRows, optionChainRows, strangleParams),
    [ohlcRows, vixRows, optionChainRows, strangleParams],
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
              title="Trading Strategy Backtest"
              description={
                strategyType === 'moving-average'
                  ? `${smaCrossoverStrategy.name}, backtested on the historical NIFTY data loaded above. Independent of the scenario simulator — this is a demonstration strategy for Version 1.`
                  : 'India VIX rolling-percentile-driven Short Strangle, backtested on the historical NIFTY data loaded above using real option premiums from the bundled Option Chain dataset.'
              }
            >
              <div className="mb-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStrategyType('moving-average')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    strategyType === 'moving-average'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  Moving Average Strategy
                </button>
                <button
                  type="button"
                  onClick={() => setStrategyType('short-strangle')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    strategyType === 'short-strangle'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  Short Strangle Strategy
                </button>
              </div>

              {strategyType === 'moving-average' && (
                <>
                  <div className="mb-5 max-w-xs">
                    <InputControl
                      id="sma-window"
                      label="Moving Average Window (days)"
                      value={smaWindowInput}
                      onChange={setSmaWindowInput}
                      min={2}
                      max={200}
                      step={1}
                      helperText={`Currently ${smaWindow} day${smaWindow === 1 ? '' : 's'}`}
                    />
                  </div>
                  {hasEnoughDataForStrategy ? (
                    <StrategySummary
                      strategyName={smaCrossoverStrategy.name}
                      totalTrades={backtestResult.trades.length}
                      hasOpenPosition={backtestResult.openPosition !== null}
                    />
                  ) : (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Need more than {smaWindow} trading days loaded to compute a {smaWindow}-day moving average — load a
                      longer date range above or lower the window.
                    </p>
                  )}
                </>
              )}

              {strategyType === 'short-strangle' && (
                <StrangleDataSourcePanel
                  niftyDateRange={niftyDateRange}
                  onOptionChainChange={setOptionChainRows}
                  onVixChange={setVixRows}
                  onParamsChange={setStrangleParams}
                />
              )}
            </Card>

            {strategyType === 'moving-average' && hasEnoughDataForStrategy && (
              <>
                <Card title="Performance Metrics">
                  <PerformanceMetrics performance={backtestResult.performance} />
                </Card>

                <Card title="NIFTY Chart with SMA + Buy/Sell Signals">
                  <PriceWithSignalsChart rows={ohlcRows} sma={sma} signals={signals} isDark={isDark} />
                </Card>

                <Card title="Trade History">
                  <TradeHistoryTable trades={backtestResult.trades} />
                </Card>

                <Card
                  title="Equity Curve (Cumulative P&L)"
                  description="Strategy P&L vs. simply buying and holding NIFTY from the first to the last loaded date."
                >
                  <EquityCurveChart
                    equityCurve={backtestResult.equityCurve}
                    strategyName={smaCrossoverStrategy.name}
                    isDark={isDark}
                  />
                </Card>
              </>
            )}

            {strategyType === 'short-strangle' && hasStrangleData && (
              <>
                <Card title="Short Strangle Dashboard">
                  <StrangleDashboard
                    vixSeries={strangleResult.vixSeries}
                    openPosition={strangleResult.openPosition}
                    hasCompletedTrades={strangleResult.trades.length > 0}
                  />
                </Card>

                <Card
                  title="NIFTY Chart with Entry/Exit Markers"
                  description="Shaded regions mark each trade's holding period."
                >
                  <StranglePriceChart
                    rows={ohlcRows}
                    trades={strangleResult.trades}
                    openPosition={strangleResult.openPosition}
                    signals={strangleResult.signals}
                    isDark={isDark}
                  />
                </Card>

                <Card title="Trade History">
                  <StrangleTradeHistoryTable trades={strangleResult.trades} />
                </Card>

                <Card title="Performance Summary">
                  <StranglePerformanceSummary performance={strangleResult.performance} />
                </Card>
              </>
            )}
          </>
        )}
      </div>

      <BottomNavigation items={NAV_ITEMS} />
    </div>
  )
}
