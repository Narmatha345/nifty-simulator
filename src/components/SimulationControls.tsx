import { Play, Loader2 } from 'lucide-react'
import InputControl from './InputControl'

const PATH_COUNT_PRESETS = [100, 500, 1000, 5000, 10000]

interface Props {
  currentLevel: number | ''
  forecastDays: number | ''
  numPaths: number | ''
  onCurrentLevelChange: (value: number | '') => void
  onForecastDaysChange: (value: number | '') => void
  onNumPathsChange: (value: number | '') => void
  onRun: () => void
  isRunning: boolean
  progress: { completed: number; total: number } | null
  canRun: boolean
}

export default function SimulationControls({
  currentLevel,
  forecastDays,
  numPaths,
  onCurrentLevelChange,
  onForecastDaysChange,
  onNumPathsChange,
  onRun,
  isRunning,
  progress,
  canRun,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <InputControl
          id="current-level"
          label="Current NIFTY Level"
          value={currentLevel}
          onChange={onCurrentLevelChange}
          min={1}
          step={1}
        />
        <InputControl
          id="forecast-days"
          label="Forecast Length (trading days)"
          value={forecastDays}
          onChange={onForecastDaysChange}
          min={1}
          max={2000}
          step={1}
        />
        <InputControl
          id="num-paths"
          label="Number of Simulated Paths"
          value={numPaths}
          onChange={onNumPathsChange}
          min={1}
          max={50000}
          step={1}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {PATH_COUNT_PRESETS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onNumPathsChange(count)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              numPaths === count
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {count.toLocaleString('en-IN')}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={!canRun || isRunning}
        className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {isRunning ? 'Simulating…' : 'Run Simulation'}
      </button>

      {isRunning && progress && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {progress.completed.toLocaleString('en-IN')} / {progress.total.toLocaleString('en-IN')} paths
          </p>
        </div>
      )}
    </div>
  )
}
