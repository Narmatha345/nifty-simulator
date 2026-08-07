import { useCallback, useState } from 'react'
import { FlaskConical, Loader2 } from 'lucide-react'
import type { StrategyScenarioSummary } from '../../types/strangle'
import { formatNumber, formatPercent } from '../../utils/format'
import InputControl from '../InputControl'

interface Props {
  historical: StrategyScenarioSummary | null
  onRun: (runCount: number) => Promise<StrategyScenarioSummary[]>
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

/**
 * Step 7 — Strategy Validation: runs the Short Strangle strategy on many
 * independently generated synthetic markets (strangleBatchSimulation.ts) and
 * lists each run's performance next to the Historical baseline, so the user
 * can judge whether the strategy holds up across scenarios rather than just
 * on the one historical path.
 */
export default function StrangleSyntheticBatchPanel({ historical, onRun }: Props) {
  const [runCount, setRunCount] = useState<number | ''>(10)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<StrategyScenarioSummary[] | null>(null)

  const handleRun = useCallback(async () => {
    if (typeof runCount !== 'number' || runCount < 1) return
    setIsRunning(true)
    try {
      const batch = await onRun(runCount)
      setResults(batch)
    } finally {
      setIsRunning(false)
    }
  }, [runCount, onRun])

  const rows: StrategyScenarioSummary[] = [...(historical ? [historical] : []), ...(results ?? [])]
  const profitableRuns = results ? results.filter((r) => r.totalProfitLoss > 0).length : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="max-w-[10rem]">
          <InputControl id="synthetic-run-count" label="Synthetic Runs" value={runCount} onChange={setRunCount} min={1} max={200} step={1} />
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning || typeof runCount !== 'number' || runCount < 1}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          Run Synthetic Markets
        </button>
      </div>

      {results && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {profitableRuns} of {results.length} synthetic runs were profitable · Average Return{' '}
          {formatPercent(average(results.map((r) => r.strategyReturnPct)))} · Average Trades{' '}
          {formatNumber(average(results.map((r) => r.totalTrades)), 1)}
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Scenario</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Total Trades</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Win Rate</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Avg Holding Days</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Total Profit</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Strategy Return</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="whitespace-nowrap px-3 py-1.5 text-left font-medium text-slate-700 dark:text-slate-200">{row.label}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.totalTrades}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.winRate.toFixed(1)}%</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.averageHoldingDays.toFixed(1)}</td>
                  <td
                    className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold tabular-nums ${row.totalProfitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {formatNumber(row.totalProfitLoss, 2)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold tabular-nums ${row.strategyReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {formatPercent(row.strategyReturnPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!results && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Run a batch of independently generated synthetic markets to see whether the strategy's edge holds up beyond the
          historical path.
        </p>
      )}
    </div>
  )
}
