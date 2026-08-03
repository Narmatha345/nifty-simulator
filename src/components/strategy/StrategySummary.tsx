interface Props {
  strategyName: string
  totalTrades: number
  hasOpenPosition: boolean
}

export default function StrategySummary({ strategyName, totalTrades, hasOpenPosition }: Props) {
  return (
    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
      <p>
        <strong className="text-slate-900 dark:text-slate-50">{strategyName}</strong> — buy 1 unit when the Close
        price crosses below the SMA, sell that unit when it crosses back above. No leverage, no short selling, no
        transaction costs. This is a demonstration strategy for illustrating the backtesting module, not a
        recommendation.
      </p>
      <p>
        Found <strong className="text-slate-900 dark:text-slate-50">{totalTrades.toLocaleString('en-IN')}</strong>{' '}
        completed trade{totalTrades === 1 ? '' : 's'} over the loaded data range.
        {hasOpenPosition && ' One position is still open (bought, not yet sold) at the end of the data and is excluded from the trade history below.'}
      </p>
    </div>
  )
}
