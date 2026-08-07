import type { BuyAndHoldComparison, StranglePerformance } from '../../types/strangle'
import { formatDate, formatNumber, formatPercent } from '../../utils/format'

interface Props {
  comparison: BuyAndHoldComparison
  /** The Short Strangle's own performance for this same dataset — supplies the Total Trades / Win Rate / Avg Holding Days / Max Profit / Max Loss rows on the "Short Strangle" side. */
  strategyPerformance: StranglePerformance
}

export default function StrangleComparisonTable({ comparison: c, strategyPerformance: sp }: Props) {
  const bh = c.buyHoldPerformance
  const rows: { metric: string; buyHold: string; strangle: string; pnl?: 'buyHold' | 'strangle' | 'both' }[] = [
    { metric: 'Entry Date', buyHold: formatDate(c.entryDate), strangle: formatDate(c.entryDate) },
    { metric: 'Exit Date', buyHold: formatDate(c.exitDate), strangle: formatDate(c.exitDate) },
    { metric: 'Entry Price', buyHold: formatNumber(c.entryPrice, 2), strangle: formatNumber(c.entryPrice, 2) },
    { metric: 'Exit Price', buyHold: formatNumber(c.exitPrice, 2), strangle: formatNumber(c.exitPrice, 2) },
    { metric: 'Total Trades', buyHold: bh.totalTrades.toLocaleString('en-IN'), strangle: sp.totalTrades.toLocaleString('en-IN') },
    { metric: 'Total Profit', buyHold: formatNumber(c.buyHoldProfit, 2), strangle: formatNumber(c.strategyProfit, 2), pnl: 'both' },
    { metric: 'Total Return %', buyHold: formatPercent(c.buyHoldReturnPct), strangle: formatPercent(c.strategyReturnPct), pnl: 'both' },
    { metric: 'Win Rate', buyHold: `${bh.winRate.toFixed(1)}%`, strangle: `${sp.winRate.toFixed(1)}%` },
    { metric: 'Average Holding Days', buyHold: bh.averageHoldingDays.toFixed(1), strangle: sp.averageHoldingDays.toFixed(1) },
    {
      metric: 'Maximum Profit',
      buyHold: formatNumber(bh.maxProfitTrade?.totalProfitLoss ?? 0, 2),
      strangle: formatNumber(sp.maxProfitTrade?.totalProfitLoss ?? 0, 2),
    },
    {
      metric: 'Maximum Loss',
      buyHold: formatNumber(bh.maxLossTrade?.totalProfitLoss ?? 0, 2),
      strangle: formatNumber(sp.maxLossTrade?.totalProfitLoss ?? 0, 2),
    },
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
