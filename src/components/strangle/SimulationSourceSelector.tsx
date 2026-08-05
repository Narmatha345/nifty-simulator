import { Shuffle } from 'lucide-react'
import type { SimulationSource } from '../../types/strangle'

interface Props {
  value: SimulationSource
  onChange: (source: SimulationSource) => void
  onRegenerate: () => void
}

export default function SimulationSourceSelector({ value, onChange, onRegenerate }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Simulation Source</p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="radio"
            name="simulation-source"
            checked={value === 'historical'}
            onChange={() => onChange('historical')}
            className="h-4 w-4 accent-indigo-600"
          />
          Historical NIFTY
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="radio"
            name="simulation-source"
            checked={value === 'random'}
            onChange={() => onChange('random')}
            className="h-4 w-4 accent-indigo-600"
          />
          Random Generated NIFTY
        </label>
        {value === 'random' && (
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Shuffle className="h-4 w-4" />
            Generate New Random Path
          </button>
        )}
      </div>
    </div>
  )
}
