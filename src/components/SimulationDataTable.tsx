import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { SimulatedPath } from '../types'
import { formatNumber, formatPercent } from '../utils/format'

const PAGE_SIZE = 15

interface Props {
  paths: SimulatedPath[]
}

export default function SimulationDataTable({ paths }: Props) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(paths.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const forecastDays = paths[0] ? paths[0].levels.length - 1 : 0

  const pageRows = useMemo(
    () => paths.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [paths, currentPage],
  )

  return (
    <div className="space-y-3">
      <div className="max-h-[28rem] overflow-auto rounded-2xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Path #
              </th>
              {Array.from({ length: forecastDays }, (_, i) => (
                <th key={i} className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">
                  Day {i + 1}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Final NIFTY</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-violet-600 dark:text-violet-400">Max Rise</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400">Max Fall</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((path) => (
              <tr key={path.pathId} className="border-t border-slate-100 dark:border-slate-800">
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {path.pathId}
                </td>
                {path.levels.slice(1).map((level, i) => (
                  <td key={i} className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {formatNumber(level, 2)}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatNumber(path.finalLevel, 2)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-violet-600 dark:text-violet-400">
                  {formatPercent(path.maxRise)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-rose-600 dark:text-rose-400">
                  {formatPercent(path.maxFall)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-500 dark:text-slate-400">
          {paths.length.toLocaleString('en-IN')} simulated paths total
        </p>
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
