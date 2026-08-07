import type { StranglePerformance } from '../../types/strangle'
import { formatNumber, formatPercent } from '../../utils/format'

export interface ModeScenario {
  performance: StranglePerformance
  strategyReturnPct: number
}

interface Props {
  historical: ModeScenario | null
  synthetic: ModeScenario | null
}

interface Row {
  metric: string
  historical: string
  synthetic: string
  pnl?: boolean
}

function extractOrDash(scenario: ModeScenario | null, extract: (s: ModeScenario) => string): string {
  return scenario ? extract(scenario) : '—'
}

/** Step 11 — Historical vs Synthetic performance, side by side, for the currently generated datasets of each. */
export default function StrangleModeComparisonTable({ historical, synthetic }: Props) {
  const rows: Row[] = [
    { metric: 'Total Trades', historical: extractOrDash(historical, (s) => s.performance.totalTrades.toLocaleString('en-IN')), synthetic: extractOrDash(synthetic, (s) => s.performance.totalTrades.toLocaleString('en-IN')) },
    { metric: 'Winning Trades', historical: extractOrDash(historical, (s) => s.performance.winningTrades.toLocaleString('en-IN')), synthetic: extractOrDash(synthetic, (s) => s.performance.winningTrades.toLocaleString('en-IN')) },
    { metric: 'Losing Trades', historical: extractOrDash(historical, (s) => s.performance.losingTrades.toLocaleString('en-IN')), synthetic: extractOrDash(synthetic, (s) => s.performance.losingTrades.toLocaleString('en-IN')) },
    { metric: 'Win Rate', historical: extractOrDash(historical, (s) => `${s.performance.winRate.toFixed(1)}%`), synthetic: extractOrDash(synthetic, (s) => `${s.performance.winRate.toFixed(1)}%`) },
    {
      metric: 'Average Holding Days',
      historical: extractOrDash(historical, (s) => s.performance.averageHoldingDays.toFixed(1)),
      synthetic: extractOrDash(synthetic, (s) => s.performance.averageHoldingDays.toFixed(1)),
    },
    {
      metric: 'Total Profit',
      historical: extractOrDash(historical, (s) => formatNumber(s.performance.totalProfitLoss, 2)),
      synthetic: extractOrDash(synthetic, (s) => formatNumber(s.performance.totalProfitLoss, 2)),
      pnl: true,
    },
    {
      metric: 'Strategy Return',
      historical: extractOrDash(historical, (s) => formatPercent(s.strategyReturnPct)),
      synthetic: extractOrDash(synthetic, (s) => formatPercent(s.strategyReturnPct)),
      pnl: true,
    },
  ]

  const pnlClass = (scenario: ModeScenario | null): string => {
    if (!scenario) return 'text-slate-600 dark:text-slate-300'
    return scenario.performance.totalProfitLoss >= 0 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-rose-600 dark:text-rose-400'
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Metric</th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Historical</th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Synthetic</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metric} className="border-t border-slate-100 dark:border-slate-800">
              <td className="whitespace-nowrap px-3 py-1.5 text-left text-slate-600 dark:text-slate-300">{row.metric}</td>
              <td className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${row.pnl ? pnlClass(historical) : 'text-slate-600 dark:text-slate-300'}`}>
                {row.historical}
              </td>
              <td className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${row.pnl ? pnlClass(synthetic) : 'text-slate-600 dark:text-slate-300'}`}>
                {row.synthetic}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
