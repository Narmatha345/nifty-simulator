import type { BuyAndHoldComparison } from '../../types/strangle'
import { formatDate, formatNumber, formatPercent } from '../../utils/format'

interface Props {
  comparison: BuyAndHoldComparison
}

export default function StrangleComparisonTable({ comparison: c }: Props) {
  const rows: { metric: string; buyHold: string; strangle: string; pnl?: 'buyHold' | 'strangle' | 'both' }[] = [
    { metric: 'Entry Date', buyHold: formatDate(c.entryDate), strangle: formatDate(c.entryDate) },
    { metric: 'Exit Date', buyHold: formatDate(c.exitDate), strangle: formatDate(c.exitDate) },
    { metric: 'Entry Price', buyHold: formatNumber(c.entryPrice, 2), strangle: formatNumber(c.entryPrice, 2) },
    { metric: 'Exit Price', buyHold: formatNumber(c.exitPrice, 2), strangle: formatNumber(c.exitPrice, 2) },
    { metric: 'Profit', buyHold: formatNumber(c.buyHoldProfit, 2), strangle: formatNumber(c.strategyProfit, 2), pnl: 'both' },
    { metric: 'Return %', buyHold: formatPercent(c.buyHoldReturnPct), strangle: formatPercent(c.strategyReturnPct), pnl: 'both' },
  ]

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Metric</th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Buy &amp; Hold</th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Short Strangle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metric} className="border-t border-slate-100 dark:border-slate-800">
              <td className="whitespace-nowrap px-3 py-1.5 text-left text-slate-600 dark:text-slate-300">{row.metric}</td>
              <td
                className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                  row.pnl ? (c.buyHoldProfit >= 0 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-rose-600 dark:text-rose-400') : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {row.buyHold}
              </td>
              <td
                className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${
                  row.pnl ? (c.strategyProfit >= 0 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-rose-600 dark:text-rose-400') : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {row.strangle}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
