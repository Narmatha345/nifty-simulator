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
import StrangleValidationWorkflow from '../components/strangle/StrangleValidationWorkflow'

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

        {ohlcRows.length > 0 && <StrangleValidationWorkflow ohlcRows={ohlcRows} isDark={isDark} />}
      </div>

      <BottomNavigation items={NAV_ITEMS} />
    </div>
  )
}
