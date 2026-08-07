import { useMemo } from 'react'
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { StrangleSignal, VixPercentilePoint } from '../../types/strangle'
import { getChartPalette } from '../colors'
import { tooltipContentStyle } from '../ChartTooltipStyle'
import { formatDate, formatNumber } from '../../utils/format'

// Fixed status colors, matching StranglePriceChart's entry/exit markers — never themed.
const STATUS_GOOD = '#0ca30c'
const STATUS_CRITICAL = '#d03b3b'

interface Props {
  vixSeries: VixPercentilePoint[]
  signals: StrangleSignal[]
  isDark: boolean
}

interface ChartDatum {
  date: string
  vix: number
  entryVix: number | null
  exitVix: number | null
}

interface DotProps {
  cx?: number
  cy?: number
  value?: number | null
}

function EntryDot({ cx, cy, value }: DotProps) {
  if (cx === undefined || cy === undefined || value === undefined || value === null) return null
  const y = cy + 12
  return <polygon points={`${cx},${y - 6} ${cx - 6},${y + 6} ${cx + 6},${y + 6}`} fill={STATUS_GOOD} />
}

function ExitDot({ cx, cy, value }: DotProps) {
  if (cx === undefined || cy === undefined || value === undefined || value === null) return null
  const y = cy - 12
  return <polygon points={`${cx},${y + 6} ${cx - 6},${y - 6} ${cx + 6},${y - 6}`} fill={STATUS_CRITICAL} />
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number | null
}

function VixTooltip({
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
  const vix = payload.find((item) => item.dataKey === 'vix')?.value
  if (vix === undefined || vix === null) return null

  return (
    <div style={tooltipContentStyle(isDark)} className="px-3 py-2">
      <p className="font-semibold">{formatDate(label ?? '')}</p>
      <p>India VIX: {formatNumber(vix, 2)}</p>
    </div>
  )
}

/** India VIX path chart — historical or simulated, driven by whatever `vixSeries` the strangle engine ran on. */
export default function VixPathChart({ vixSeries, signals, isDark }: Props) {
  const palette = getChartPalette(isDark)

  const data = useMemo<ChartDatum[]>(() => {
    const entryDates = new Map(signals.filter((s) => s.type === 'ENTRY').map((s) => [s.date, true]))
    const exitDates = new Map(signals.filter((s) => s.type === 'EXIT').map((s) => [s.date, true]))
    return vixSeries.map((point) => ({
      date: point.date,
      vix: point.vix,
      entryVix: entryDates.get(point.date) ? point.vix : null,
      exitVix: exitDates.get(point.date) ? point.vix : null,
    }))
  }, [vixSeries, signals])

  if (data.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No VIX data loaded yet.</p>
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
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
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => formatNumber(v, 0)}
            width={48}
          />
          <Tooltip content={<VixTooltip isDark={isDark} />} />
          <Line type="monotone" dataKey="vix" stroke={palette.orange} strokeWidth={1.5} dot={false} isAnimationActive={false} name="India VIX" />
          <Line dataKey="entryVix" stroke="none" isAnimationActive={false} dot={<EntryDot />} activeDot={false} legendType="none" connectNulls={false} />
          <Line dataKey="exitVix" stroke="none" isAnimationActive={false} dot={<ExitDot />} activeDot={false} legendType="none" connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full" style={{ background: palette.orange }} /> India VIX
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-0 border-x-4 border-b-[7px] border-x-transparent" style={{ borderBottomColor: STATUS_GOOD }} /> Entry
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-0 border-x-4 border-t-[7px] border-x-transparent" style={{ borderTopColor: STATUS_CRITICAL }} /> Exit
        </span>
      </div>
    </div>
  )
}
