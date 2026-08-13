import type { ChangeEvent } from 'react'

interface Props {
  id: string
  label: string
  value: number | ''
  onChange: (value: number | '') => void
  min?: number
  max?: number
  step?: number
  helperText?: string
  error?: string
  showSlider?: boolean
  onMax?: () => void
}

// Reusable numeric input, optionally paired with a range slider.
export default function InputControl({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  helperText,
  error,
  showSlider = false,
  onMax,
}: Props) {
  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    onChange(raw === '' ? '' : Number(raw))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          {onMax && (
            <button
              type="button"
              onClick={onMax}
              className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Max
            </button>
          )}
          <input
            id={id}
            type="number"
            inputMode="decimal"
            value={value}
            step={step}
            min={min}
            max={max}
            onChange={handleNumberChange}
            aria-invalid={Boolean(error)}
            aria-describedby={helperText ? `${id}-helper` : undefined}
            className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-base font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {showSlider && (
        <input
          type="range"
          aria-label={`${label} slider`}
          value={typeof value === 'number' && Number.isFinite(value) ? value : (min ?? 0)}
          min={min}
          max={max}
          step={step}
          onChange={handleNumberChange}
          className="w-full"
        />
      )}

      {helperText && !error && (
        <p id={`${id}-helper`} className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-500 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  )
}
