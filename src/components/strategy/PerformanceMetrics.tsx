import type { StrategyPerformance } from '../../types/strategy'
import { formatNumber, formatPercent } from '../../utils/format'

interface Props {
  performance: StrategyPerformance
}

interface MetricCard {
  label: string
  value: string
  accent?: 'positive' | 'negative' | 'neutral'
}

export default function PerformanceMetrics({ performance: p }: Props) {
  const cards: MetricCard[] = [
    { label: 'Total Trades', value: p.totalTrades.toLocaleString('en-IN') },
    { label: 'Winning Trades', value: p.winningTrades.toLocaleString('en-IN'), accent: 'positive' },
    { label: 'Losing Trades', value: p.losingTrades.toLocaleString('en-IN'), accent: 'negative' },
    { label: 'Win Rate', value: `${p.winRate.toFixed(1)}%` },
    { label: 'Total Profit / Loss', value: formatNumber(p.totalProfitLoss, 2), accent: p.totalProfitLoss >= 0 ? 'positive' : 'negative' },
    { label: 'Average Profit', value: formatNumber(p.averageProfit, 2), accent: 'positive' },
    { label: 'Average Loss', value: formatNumber(p.averageLoss, 2), accent: 'negative' },
    { label: 'Maximum Drawdown', value: formatNumber(p.maxDrawdown, 2), accent: 'negative' },
    { label: 'Final Portfolio Value', value: formatNumber(p.finalPortfolioValue, 2) },
    { label: 'Overall Return', value: formatPercent(p.overallReturnPct), accent: p.overallReturnPct >= 0 ? 'positive' : 'negative' },
  ]

  const accentClass: Record<NonNullable<MetricCard['accent']>, string> = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-slate-700 dark:text-slate-200',
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${accentClass[card.accent ?? 'neutral']}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
