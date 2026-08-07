import { useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { OptionChainRow } from '../../types/strangle'
import { getChartPalette } from '../colors'
import { tooltipContentStyle } from '../ChartTooltipStyle'
import { formatDate, formatNumber } from '../../utils/format'

interface Props {
  optionChainRows: OptionChainRow[]
  isDark: boolean
}

interface ChartDatum {
  date: string
  ce: number | null
  pe: number | null
}

interface TooltipPayloadItem {
  value?: number | null
  dataKey?: string
  color?: string
}

function PremiumTooltip({
  active,
  label,
  payload,
  isDark,
}: {
  active?: boolean
  label?: string
  payload?: TooltipPayloadItem[]
  isDark: boolean
}) {
  if (!active || !payload?.length) return null
  const ce = payload.find((p) => p.dataKey === 'ce')
  const pe = payload.find((p) => p.dataKey === 'pe')
  return (
    <div style={tooltipContentStyle(isDark)} className="px-3 py-2">
      <p className="font-semibold">{formatDate(label ?? '')}</p>
      {ce?.value !== undefined && ce.value !== null && (
        <p style={{ color: ce.color }}>CE: {formatNumber(ce.value, 2)}</p>
      )}
      {pe?.value !== undefined && pe.value !== null && (
        <p style={{ color: pe.color }}>PE: {formatNumber(pe.value, 2)}</p>
      )}
    </div>
  )
}

type PremiumSide = 'both' | 'CE' | 'PE'

/** Option Premium Chart — lets the user pick any strike (and CE / PE / both) from the generated chain and see the premium evolve across the simulated (or historical) market. */
export default function OptionPremiumChart({ optionChainRows, isDark }: Props) {
  const palette = getChartPalette(isDark)

  const strikes = useMemo(() => {
    const unique = new Set(optionChainRows.map((row) => row.strike))
    return Array.from(unique).sort((a, b) => a - b)
  }, [optionChainRows])

  const [selectedStrike, setSelectedStrike] = useState<number | null>(null)
  const activeStrike = selectedStrike !== null && strikes.includes(selectedStrike) ? selectedStrike : (strikes[Math.floor(strikes.length / 2)] ?? null)
  const [side, setSide] = useState<PremiumSide>('both')

  const data = useMemo<ChartDatum[]>(() => {
    if (activeStrike === null) return []
    const byDate = new Map<string, { ce: number | null; pe: number | null }>()
    for (const row of optionChainRows) {
      if (row.strike !== activeStrike) continue
      const entry = byDate.get(row.date) ?? { ce: null, pe: null }
      if (row.instrumentType === 'CE') entry.ce = row.close
      else entry.pe = row.close
      byDate.set(row.date, entry)
    }
    return Array.from(byDate.entries())
      .map(([date, v]) => ({ date, ce: v.ce, pe: v.pe }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [optionChainRows, activeStrike])

  if (strikes.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No option chain data to chart yet.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Strike Price</span>
          <select
            value={activeStrike ?? ''}
            onChange={(e) => setSelectedStrike(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {strikes.map((strike) => (
              <option key={strike} value={strike}>
                {strike.toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Show</span>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as PremiumSide)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="both">CE + PE</option>
            <option value="CE">CE only</option>
            <option value="PE">PE only</option>
          </select>
        </label>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={palette.gridline} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: palette.textSecondary }}
            stroke={palette.axis}
            interval="preserveStartEnd"
            minTickGap={60}
            tickFormatter={(d: string) => formatDate(d)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: palette.textSecondary }}
            stroke={palette.axis}
            tickFormatter={(v: number) => formatNumber(v, 0)}
            width={56}
          />
          <Tooltip content={<PremiumTooltip isDark={isDark} />} />
          <Legend wrapperStyle={{ fontSize: 12, color: palette.textSecondary }} />
          {side !== 'PE' && (
            <Line type="monotone" dataKey="ce" name="CE Premium" stroke={palette.blue} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          )}
          {side !== 'CE' && (
            <Line type="monotone" dataKey="pe" name="PE Premium" stroke={palette.red} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
