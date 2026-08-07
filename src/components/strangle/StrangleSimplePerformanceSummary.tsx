import type { StranglePerformance } from '../../types/strangle'
import { formatNumber, formatPercent } from '../../utils/format'

interface Props {
  performance: StranglePerformance
  strategyReturnPct: number
  buyHoldReturnPct: number
}

interface MetricCard {
  label: string
  value: string
  accent?: 'positive' | 'negative' | 'neutral'
}

/** The eight metrics the simplified workflow surfaces — everything else from the old dashboard (winning/losing trade counts, average profit/loss, per-mode comparisons) is still computable from the CSV export if needed. */
export default function StrangleSimplePerformanceSummary({ performance: p, strategyReturnPct, buyHoldReturnPct }: Props) {
  const cards: MetricCard[] = [
    { label: 'Total Trades', value: p.totalTrades.toLocaleString('en-IN') },
    { label: 'Total Profit/Loss', value: formatNumber(p.totalProfitLoss, 2), accent: p.totalProfitLoss >= 0 ? 'positive' : 'negative' },
    { label: 'Win Rate', value: `${p.winRate.toFixed(1)}%` },
    { label: 'Strategy Return', value: formatPercent(strategyReturnPct), accent: strategyReturnPct >= 0 ? 'positive' : 'negative' },
    { label: 'Buy & Hold Return', value: formatPercent(buyHoldReturnPct), accent: buyHoldReturnPct >= 0 ? 'positive' : 'negative' },
    { label: 'Average Holding Days', value: p.averageHoldingDays.toFixed(1) },
    { label: 'Maximum Profit', value: formatNumber(p.maxProfitTrade?.totalProfitLoss ?? 0, 2), accent: 'positive' },
    { label: 'Maximum Loss', value: formatNumber(p.maxLossTrade?.totalProfitLoss ?? 0, 2), accent: 'negative' },
  ]

  const accentClass: Record<NonNullable<MetricCard['accent']>, string> = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-slate-700 dark:text-slate-200',
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${accentClass[card.accent ?? 'neutral']}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
