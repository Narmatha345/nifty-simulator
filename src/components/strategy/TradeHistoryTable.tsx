import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Trade } from '../../types/strategy'
import { formatDate, formatNumber, formatPercent } from '../../utils/format'

const PAGE_SIZE = 15

interface Props {
  trades: Trade[]
}

export default function TradeHistoryTable({ trades }: Props) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(trades.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)

  const pageRows = useMemo(
    () => trades.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [trades, currentPage],
  )

  if (trades.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No completed trades over the loaded data range.</p>
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Trade #</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Entry Date</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Entry Price</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Exit Date</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Exit Price</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Holding Days</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Profit / Loss</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Return %</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((trade) => (
              <tr key={trade.tradeNumber} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-200">{trade.tradeNumber}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-600 dark:text-slate-300">{formatDate(trade.entryDate)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(trade.entryPrice, 2)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-600 dark:text-slate-300">{formatDate(trade.exitDate)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(trade.exitPrice, 2)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{trade.holdingDays}</td>
                <td className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums font-semibold ${trade.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatNumber(trade.profitLoss, 2)}
                </td>
                <td className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums font-semibold ${trade.returnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatPercent(trade.returnPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-500 dark:text-slate-400">{trades.length.toLocaleString('en-IN')} trades total</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-slate-600 dark:text-slate-300">
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
