import type { SimulationSource, StrangleOpenPosition, VixPercentilePoint } from '../../types/strangle'
import { formatNumber, formatSimulationSource } from '../../utils/format'

interface Props {
  vixSeries: VixPercentilePoint[]
  openPosition: StrangleOpenPosition | null
  hasCompletedTrades: boolean
  simulationSource: SimulationSource
}

interface StatCard {
  label: string
  value: string
  accent?: 'positive' | 'negative' | 'neutral'
}

export default function StrangleDashboard({ vixSeries, openPosition, hasCompletedTrades, simulationSource }: Props) {
  const latest = vixSeries.length > 0 ? vixSeries[vixSeries.length - 1] : null
  const percentile = latest?.percentile ?? null

  const entrySignalActive = !openPosition && percentile !== null && percentile >= 80
  const exitSignalActive = openPosition !== null && percentile !== null && percentile < 50

  const entryStatus = openPosition
    ? 'Position already open'
    : percentile === null
      ? 'Insufficient VIX history'
      : entrySignalActive
        ? 'ENTRY signal active'
        : 'Not met'

  const exitStatus = !openPosition
    ? 'No open position'
    : percentile === null
      ? 'Insufficient VIX history'
      : exitSignalActive
        ? 'EXIT signal active'
        : 'Not met'

  const tradeStatus = openPosition ? 'Trade Active' : hasCompletedTrades ? 'Trade Closed' : 'Waiting for Entry'

  const cards: StatCard[] = [
    { label: 'Current India VIX', value: latest ? formatNumber(latest.vix, 2) : '—' },
    { label: '30-Day Rolling Percentile', value: percentile !== null ? `${percentile.toFixed(1)}%` : '—' },
    { label: 'Entry Status', value: entryStatus, accent: entrySignalActive ? 'positive' : 'neutral' },
    { label: 'Exit Status', value: exitStatus, accent: exitSignalActive ? 'negative' : 'neutral' },
    { label: 'Current Position', value: openPosition ? 'Open' : 'Closed', accent: openPosition ? 'positive' : 'neutral' },
    { label: 'Trade Status', value: tradeStatus, accent: tradeStatus === 'Trade Active' ? 'positive' : 'neutral' },
    { label: 'Simulation Source', value: formatSimulationSource(simulationSource) },
  ]

  const accentClass: Record<NonNullable<StatCard['accent']>, string> = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-slate-700 dark:text-slate-200',
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${accentClass[card.accent ?? 'neutral']}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
