import { useMemo } from 'react'
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { OhlcRow } from '../../types'
import type { Signal } from '../../types/strategy'
import { getChartPalette } from '../colors'
import { tooltipContentStyle } from '../ChartTooltipStyle'
import { formatDate, formatNumber } from '../../utils/format'

// Fixed status colors (buy/sell are discrete signal states, not a magnitude/polarity encoding) — never themed.
const STATUS_GOOD = '#0ca30c'
const STATUS_CRITICAL = '#d03b3b'

interface Props {
  rows: OhlcRow[]
  sma: (number | null)[]
  signals: Signal[]
  isDark: boolean
}

interface ChartDatum {
  date: string
  close: number
  sma: number | null
  buyPrice: number | null
  sellPrice: number | null
}

interface DotProps {
  cx?: number
  cy?: number
  value?: number | null
}

// Rendered via each Line's own `dot` prop rather than a separate <Scatter>,
// so markers share the exact same index/coordinate mapping as the Close and
// SMA lines — a Scatter with its own shorter data array does not reliably
// align against a shared category x-axis once the series gets long.
function BuyDot({ cx, cy, value }: DotProps) {
  if (cx === undefined || cy === undefined || value === undefined || value === null) return null
  const y = cy + 12
  return <polygon points={`${cx},${y - 6} ${cx - 6},${y + 6} ${cx + 6},${y + 6}`} fill={STATUS_GOOD} />
}

function SellDot({ cx, cy, value }: DotProps) {
  if (cx === undefined || cy === undefined || value === undefined || value === null) return null
  const y = cy - 12
  return <polygon points={`${cx},${y + 6} ${cx - 6},${y - 6} ${cx + 6},${y - 6}`} fill={STATUS_CRITICAL} />
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number | null
}

function PriceTooltip({
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
  const close = payload.find((item) => item.dataKey === 'close')?.value
  const sma = payload.find((item) => item.dataKey === 'sma')?.value
  if (close === undefined || close === null) return null

  return (
    <div style={tooltipContentStyle(isDark)} className="px-3 py-2">
      <p className="font-semibold">{formatDate(label ?? '')}</p>
      <p>Close: {formatNumber(close, 2)}</p>
      {sma !== undefined && sma !== null && <p>30-Day SMA: {formatNumber(sma, 2)}</p>}
    </div>
  )
}

export default function PriceWithSignalsChart({ rows, sma, signals, isDark }: Props) {
  const palette = getChartPalette(isDark)

  const data = useMemo<ChartDatum[]>(() => {
    const buyPriceByDate = new Map(signals.filter((s) => s.type === 'BUY').map((s) => [s.date, s.price]))
    const sellPriceByDate = new Map(signals.filter((s) => s.type === 'SELL').map((s) => [s.date, s.price]))
    return rows.map((row, i) => ({
      date: row.date,
      close: row.close,
      sma: sma[i],
      buyPrice: buyPriceByDate.get(row.date) ?? null,
      sellPrice: sellPriceByDate.get(row.date) ?? null,
    }))
  }, [rows, sma, signals])

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={380}>
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
            width={64}
          />
          <Tooltip content={<PriceTooltip isDark={isDark} />} />
          <Line type="monotone" dataKey="close" stroke={palette.blue} strokeWidth={1.5} dot={false} isAnimationActive={false} name="Close" />
          <Line type="monotone" dataKey="sma" stroke={palette.orange} strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} name="30-Day SMA" connectNulls />
          <Line dataKey="buyPrice" stroke="none" isAnimationActive={false} dot={<BuyDot />} activeDot={false} legendType="none" connectNulls={false} />
          <Line dataKey="sellPrice" stroke="none" isAnimationActive={false} dot={<SellDot />} activeDot={false} legendType="none" connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full" style={{ background: palette.blue }} /> Close
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full border-dashed" style={{ background: palette.orange }} /> 30-Day SMA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-0 border-x-4 border-b-[7px] border-x-transparent" style={{ borderBottomColor: STATUS_GOOD }} /> Buy signal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-0 border-x-4 border-t-[7px] border-x-transparent" style={{ borderTopColor: STATUS_CRITICAL }} /> Sell signal
        </span>
      </div>
    </div>
  )
}
