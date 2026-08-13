import type { SummaryStatistics } from '../types'
import { formatNumber, formatPercent } from '../utils/format'

interface Props {
  stats: SummaryStatistics
  currentLevel: number
}

interface StatCard {
  label: string
  value: string
  accent?: 'positive' | 'negative' | 'neutral'
}

export default function StatisticsSummary({ stats, currentLevel }: Props) {
  const cards: StatCard[] = [
    { label: 'Expected Final NIFTY', value: formatNumber(stats.expectedFinal, 2), accent: stats.expectedFinal >= currentLevel ? 'positive' : 'negative' },
    { label: 'Median Final NIFTY', value: formatNumber(stats.medianFinal, 2), accent: stats.medianFinal >= currentLevel ? 'positive' : 'negative' },
    { label: 'Minimum Final Value', value: formatNumber(stats.minFinal, 2), accent: 'negative' },
    { label: 'Maximum Final Value', value: formatNumber(stats.maxFinal, 2), accent: 'positive' },
    { label: 'Std Dev of Final Value', value: formatNumber(stats.stdDevFinal, 2), accent: 'neutral' },
    { label: 'Average Daily Return', value: formatPercent(stats.avgDailyReturn), accent: stats.avgDailyReturn >= 0 ? 'positive' : 'negative' },
    { label: 'Average Maximum Rise', value: formatPercent(stats.avgMaxRise), accent: 'positive' },
    { label: 'Average Maximum Fall', value: formatPercent(stats.avgMaxFall), accent: 'negative' },
  ]

  const accentClass: Record<NonNullable<StatCard['accent']>, string> = {
    positive: 'text-green-600 dark:text-green-400',
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
