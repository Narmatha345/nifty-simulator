import type { BuyAndHoldComparison } from '../../types/strangle'
import { formatNumber } from '../../utils/format'

interface Props {
  comparison: BuyAndHoldComparison
}

interface MetricCard {
  label: string
  value: string
  accent?: 'positive' | 'negative' | 'neutral'
}

export default function StrangleComparisonSummary({ comparison }: Props) {
  const cards: MetricCard[] = [
    {
      label: 'Buy & Hold Profit',
      value: formatNumber(comparison.buyHoldProfit, 2),
      accent: comparison.buyHoldProfit >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Short Strangle Profit',
      value: formatNumber(comparison.strategyProfit, 2),
      accent: comparison.strategyProfit >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Difference',
      value: formatNumber(comparison.difference, 2),
      accent: comparison.difference >= 0 ? 'positive' : 'negative',
    },
  ]

  const accentClass: Record<NonNullable<MetricCard['accent']>, string> = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-slate-700 dark:text-slate-200',
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${accentClass[card.accent ?? 'neutral']}`}>{card.value}</p>
          </div>
        ))}
      </div>
      <p
        className={`rounded-xl p-3 text-center text-sm font-semibold ${
          comparison.outperformed
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
        }`}
      >
        {comparison.outperformed ? 'Strategy Outperformed Buy & Hold' : 'Buy & Hold Outperformed Strategy'}
      </p>
    </div>
  )
}
