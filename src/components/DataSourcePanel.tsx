import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react'
import type { DatePreset, OhlcRow } from '../types'
import { filterByDateRange, loadBundledHistoricalData, parseCsvFile } from '../utils/dataLoader'
import { resolvePresetRange } from '../utils/dateRange'
import { formatDate } from '../utils/format'

type SourceMode = 'bundled' | 'csv'

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: '1Y', label: 'Last 1 Year' },
  { value: '2Y', label: 'Last 2 Years' },
  { value: '3Y', label: 'Last 3 Years' },
  { value: '5Y', label: 'Last 5 Years' },
  { value: 'ALL', label: 'All available' },
  { value: 'CUSTOM', label: 'Custom range' },
]

interface Props {
  onChange: (rows: OhlcRow[]) => void
}

export default function DataSourcePanel({ onChange }: Props) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('bundled')
  const [bundledRows, setBundledRows] = useState<OhlcRow[] | null>(null)
  const [csvRows, setCsvRows] = useState<OhlcRow[] | null>(null)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<DatePreset>('5Y')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    loadBundledHistoricalData()
      .then((rows) => setBundledRows(rows))
      .catch((err: Error) => setError(`Could not load bundled dataset: ${err.message}`))
      .finally(() => setLoading(false))
  }, [])

  const activeRows = sourceMode === 'bundled' ? bundledRows : csvRows
  const earliest = activeRows?.[0]?.date
  const latest = activeRows?.[activeRows.length - 1]?.date

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setLoading(true)
    try {
      const rows = await parseCsvFile(file)
      if (rows.length < 2) throw new Error('Need at least 2 trading days of data to compute returns.')
      setCsvRows(rows)
      setCsvFileName(file.name)
      setPreset('ALL')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse the CSV file.')
      setCsvRows(null)
      setCsvFileName(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!activeRows || !earliest || !latest) {
      onChange([])
      return
    }
    const range = preset === 'CUSTOM' ? { start: customStart || earliest, end: customEnd || latest } : resolvePresetRange(preset, earliest, latest)
    onChange(filterByDateRange(activeRows, range.start, range.end))
  }, [activeRows, earliest, latest, preset, customStart, customEnd, onChange])

  const effectiveRange = activeRows && earliest && latest
    ? preset === 'CUSTOM'
      ? { start: customStart || earliest, end: customEnd || latest }
      : resolvePresetRange(preset, earliest, latest)
    : null
  const loadedCount = activeRows && effectiveRange ? filterByDateRange(activeRows, effectiveRange.start, effectiveRange.end).length : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSourceMode('bundled')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            sourceMode === 'bundled'
              ? 'bg-green-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          Use bundled NIFTY dataset
        </button>
        <button
          type="button"
          onClick={() => setSourceMode('csv')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            sourceMode === 'csv'
              ? 'bg-green-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          Upload my own CSV
        </button>
      </div>

      {sourceMode === 'bundled' && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Real daily NIFTY 50 OHLC data (10 years, sourced from NSE via public market data), bundled with the app.
        </p>
      )}

      {sourceMode === 'csv' && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-green-400 hover:text-green-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-green-500"
          >
            <Upload className="h-4 w-4" />
            {csvFileName ? 'Replace CSV file' : 'Choose CSV file'}
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Needs Date, Open, High, Low, Close columns (header names are matched flexibly).
          </p>
          {csvFileName && csvRows && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="h-4 w-4" /> {csvFileName} — {csvRows.length.toLocaleString('en-IN')} rows loaded
            </p>
          )}
        </div>
      )}

      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading historical data…
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm font-medium text-rose-500 dark:text-rose-400">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      {activeRows && earliest && latest && (
        <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  preset === p.value
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'CUSTOM' && (
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Start date</span>
                <input
                  type="date"
                  value={customStart || earliest}
                  min={earliest}
                  max={latest}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-200">End date</span>
                <input
                  type="date"
                  value={customEnd || latest}
                  min={earliest}
                  max={latest}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Dataset covers <strong>{formatDate(earliest)}</strong> to <strong>{formatDate(latest)}</strong>.{' '}
            {effectiveRange && (
              <>
                Selected range loads <strong>{loadedCount.toLocaleString('en-IN')}</strong> trading days (
                {formatDate(effectiveRange.start)} to {formatDate(effectiveRange.end)}).
              </>
            )}
          </p>
          {loadedCount > 0 && loadedCount < 60 && (
            <p className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" /> Fewer than 60 trading days selected — the historical
              distribution below may not be statistically reliable.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
