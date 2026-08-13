import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { SimulationSource, StrangleTrade } from '../../types/strangle'
import { formatDate, formatNumber, formatSimulationSource } from '../../utils/format'

const PAGE_SIZE = 15

interface Props {
  trades: StrangleTrade[]
  simulationSource: SimulationSource
}

const COLUMNS: { key: keyof StrangleTrade | 'optionsProfitLoss'; label: string; align?: 'right' }[] = [
  { key: 'entryDate', label: 'Entry Date' },
  { key: 'exitDate', label: 'Exit Date' },
  { key: 'entryVix', label: 'Entry VIX', align: 'right' },
  { key: 'exitVix', label: 'Exit VIX', align: 'right' },
  { key: 'entryPercentile', label: 'Entry %ile', align: 'right' },
  { key: 'exitPercentile', label: 'Exit %ile', align: 'right' },
  { key: 'entryNiftyPrice', label: 'Entry NIFTY', align: 'right' },
  { key: 'exitNiftyPrice', label: 'Exit NIFTY', align: 'right' },
  { key: 'ceStrike', label: 'CE Strike', align: 'right' },
  { key: 'peStrike', label: 'PE Strike', align: 'right' },
  { key: 'ceSellPremium', label: 'CE Sell Premium', align: 'right' },
  { key: 'ceBuyBackPremium', label: 'CE Buy Back Premium', align: 'right' },
  { key: 'peSellPremium', label: 'PE Sell Premium', align: 'right' },
  { key: 'peBuyBackPremium', label: 'PE Buy Back Premium', align: 'right' },
  { key: 'holdingDays', label: 'Holding Days', align: 'right' },
  { key: 'niftyProfitLoss', label: 'NIFTY P&L', align: 'right' },
  { key: 'optionsProfitLoss', label: 'Options P&L', align: 'right' },
  { key: 'totalProfitLoss', label: 'Total P&L', align: 'right' },
]

function cellValue(trade: StrangleTrade, key: (typeof COLUMNS)[number]['key']): string {
  if (key === 'optionsProfitLoss') return formatNumber(trade.callProfitLoss + trade.putProfitLoss, 2)
  if (key === 'entryDate' || key === 'exitDate') return formatDate(trade[key])
  if (key === 'holdingDays' || key === 'ceStrike' || key === 'peStrike') return String(trade[key])
  return formatNumber(trade[key] as number, 2)
}

export default function StrangleTradeHistoryTable({ trades, simulationSource }: Props) {
  const simulationTypeLabel = formatSimulationSource(simulationSource)
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(trades.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)

  const pageRows = useMemo(() => trades.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE), [trades, currentPage])

  if (trades.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No completed short strangle trades over the loaded data range.</p>
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                Simulation Type
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((trade) => (
              <tr key={trade.tradeNumber} className="border-t border-slate-100 dark:border-slate-800">
                {COLUMNS.map((col) => {
                  const isPnl = col.key === 'niftyProfitLoss' || col.key === 'optionsProfitLoss' || col.key === 'totalProfitLoss'
                  const value = col.key === 'optionsProfitLoss' ? trade.callProfitLoss + trade.putProfitLoss : undefined
                  const pnlClass = isPnl
                    ? (col.key === 'optionsProfitLoss' ? value! : (trade[col.key as keyof StrangleTrade] as number)) >= 0
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-600 dark:text-slate-300'
                  return (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-3 py-1.5 tabular-nums ${col.align === 'right' ? 'text-right' : 'text-left'} ${isPnl ? `font-semibold ${pnlClass}` : pnlClass}`}
                    >
                      {cellValue(trade, col.key)}
                    </td>
                  )
                })}
                <td className="whitespace-nowrap px-3 py-1.5 text-left text-slate-600 dark:text-slate-300">{simulationTypeLabel}</td>
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
