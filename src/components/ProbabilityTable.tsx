import type { ProbabilityBin } from '../types'

interface Props {
  bins: ProbabilityBin[]
  totalObservations: number
}

export default function ProbabilityTable({ bins, totalObservations }: Props) {
  return (
    <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Return Range</th>
            <th className="px-4 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Count</th>
            <th className="px-4 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Relative Frequency</th>
            <th className="px-4 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Probability</th>
          </tr>
        </thead>
        <tbody>
          {bins.map((bin) => (
            <tr key={bin.label} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-1.5 text-slate-700 dark:text-slate-200">{bin.label}</td>
              <td className="px-4 py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{bin.count}</td>
              <td className="px-4 py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {(bin.probability * 100).toFixed(2)}%
              </td>
              <td className="px-4 py-1.5 text-right tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                {(bin.probability * 100).toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Based on {totalObservations.toLocaleString('en-IN')} historical trading days.
      </p>
    </div>
  )
}
