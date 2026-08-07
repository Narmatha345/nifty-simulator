import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, PlayCircle } from 'lucide-react'
import type { SyntheticMarketDataset } from '../../utils/syntheticMarketSimulation'
import {
  buildOptionChainCsv,
  buildSimulatedNiftyCsv,
  buildSimulatedVixCsv,
  buildSyntheticMarketCsv,
  buildSyntheticMarketPreview,
} from '../../utils/syntheticMarketSimulation'
import { formatDate, formatNumber } from '../../utils/format'

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const PAGE_SIZE = 15

interface Props {
  dataset: SyntheticMarketDataset | null
  onRunSimulation: () => void
}

/**
 * Step 1's standalone Simulation Module UI — "Run Market Simulation" generates and
 * stores one complete synthetic market (see syntheticMarketSimulation.ts),
 * then this previews it and offers a CSV export. The Short Strangle strategy
 * itself only ever reads the already-generated `dataset` — it never
 * regenerates data as part of running.
 */
export default function StrangleSimulationPanel({ dataset, onRunSimulation }: Props) {
  const [page, setPage] = useState(0)

  const previewRows = useMemo(() => (dataset ? buildSyntheticMarketPreview(dataset) : []), [dataset])
  const pageCount = Math.max(1, Math.ceil(previewRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = useMemo(
    () => previewRows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [previewRows, currentPage],
  )

  const handleRun = () => {
    setPage(0)
    onRunSimulation()
  }

  const suffix = dataset?.generatedAt ?? Date.now()
  const downloadButtonClass =
    'inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          <PlayCircle className="h-4 w-4" />
          Run Market Simulation
        </button>
        <button
          type="button"
          onClick={() => previewRows.length > 0 && downloadCsv(`simulation-summary-${suffix}.csv`, buildSyntheticMarketCsv(previewRows))}
          disabled={!dataset}
          className={downloadButtonClass}
        >
          <Download className="h-4 w-4" />
          Download Summary CSV
        </button>
        <button
          type="button"
          onClick={() => dataset && downloadCsv(`simulated-nifty-${suffix}.csv`, buildSimulatedNiftyCsv(dataset))}
          disabled={!dataset}
          className={downloadButtonClass}
        >
          <Download className="h-4 w-4" />
          Download NIFTY CSV
        </button>
        <button
          type="button"
          onClick={() => dataset && downloadCsv(`simulated-india-vix-${suffix}.csv`, buildSimulatedVixCsv(dataset))}
          disabled={!dataset}
          className={downloadButtonClass}
        >
          <Download className="h-4 w-4" />
          Download India VIX CSV
        </button>
        <button
          type="button"
          onClick={() => dataset && downloadCsv(`synthetic-option-chain-${suffix}.csv`, buildOptionChainCsv(dataset))}
          disabled={!dataset}
          className={downloadButtonClass}
        >
          <Download className="h-4 w-4" />
          Download Option Chain CSV
        </button>
      </div>

      {!dataset && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Click "Run Market Simulation" to generate a complete synthetic market — Random NIFTY path, Random India VIX path, and
          a Black-Scholes option chain priced off both — before running the strategy on it.
        </p>
      )}

      {dataset && (
        <>
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Generated {new Date(dataset.generatedAt).toLocaleString('en-IN')} · {dataset.niftyRows.length.toLocaleString('en-IN')} trading
            days
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Simulated NIFTY</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">
                    Simulated India VIX
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">CE Premium</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">PE Premium</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.date} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="whitespace-nowrap px-3 py-1.5 text-left text-slate-600 dark:text-slate-300">{formatDate(row.date)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {formatNumber(row.niftySpot, 2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {formatNumber(row.vix, 2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {formatNumber(row.cePremium, 2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {formatNumber(row.pePremium, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-slate-500 dark:text-slate-400">{previewRows.length.toLocaleString('en-IN')} rows total</p>
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
        </>
      )}
    </div>
  )
}
