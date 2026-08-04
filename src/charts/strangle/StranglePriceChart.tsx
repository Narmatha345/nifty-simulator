import { useMemo } from 'react'
import { CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { OhlcRow } from '../../types'
import type { StrangleOpenPosition, StrangleSignal, StrangleTrade } from '../../types/strangle'
import { getChartPalette } from '../colors'
import { tooltipContentStyle } from '../ChartTooltipStyle'
import { formatDate, formatNumber } from '../../utils/format'

// Fixed status colors (entry/exit are discrete signal states, not a magnitude/polarity encoding) — never themed.
const STATUS_GOOD = '#0ca30c'
const STATUS_CRITICAL = '#d03b3b'
const HOLDING_FILL = '#6366f1'

interface Props {
  rows: OhlcRow[]
  trades: StrangleTrade[]
  openPosition: StrangleOpenPosition | null
  signals: StrangleSignal[]
  isDark: boolean
}

interface ChartDatum {
  date: string
  close: number
  entryPrice: number | null
  exitPrice: number | null
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
  if (close === undefined || close === null) return null

  return (
    <div style={tooltipContentStyle(isDark)} className="px-3 py-2">
      <p className="font-semibold">{formatDate(label ?? '')}</p>
      <p>Close: {formatNumber(close, 2)}</p>
    </div>
  )
}

export default function StranglePriceChart({ rows, trades, openPosition, signals, isDark }: Props) {
  const palette = getChartPalette(isDark)

  const data = useMemo<ChartDatum[]>(() => {
    const entryPriceByDate = new Map(signals.filter((s) => s.type === 'ENTRY').map((s) => [s.date, s.niftyPrice]))
    const exitPriceByDate = new Map(signals.filter((s) => s.type === 'EXIT').map((s) => [s.date, s.niftyPrice]))
    return rows.map((row) => ({
      date: row.date,
      close: row.close,
      entryPrice: entryPriceByDate.get(row.date) ?? null,
      exitPrice: exitPriceByDate.get(row.date) ?? null,
    }))
  }, [rows, signals])

  const holdingPeriods = useMemo(() => {
    const closed = trades.map((trade) => ({ x1: trade.entryDate, x2: trade.exitDate, key: `trade-${trade.tradeNumber}` }))
    if (openPosition && rows.length > 0) {
      closed.push({ x1: openPosition.entryDate, x2: rows[rows.length - 1].date, key: 'open-position' })
    }
    return closed
  }, [trades, openPosition, rows])

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
          {holdingPeriods.map((period) => (
            <ReferenceArea key={period.key} x1={period.x1} x2={period.x2} fill={HOLDING_FILL} fillOpacity={0.08} strokeOpacity={0} />
          ))}
          <Line type="monotone" dataKey="close" stroke={palette.blue} strokeWidth={1.5} dot={false} isAnimationActive={false} name="Close" />
          <Line dataKey="entryPrice" stroke="none" isAnimationActive={false} dot={<EntryDot />} activeDot={false} legendType="none" connectNulls={false} />
          <Line dataKey="exitPrice" stroke="none" isAnimationActive={false} dot={<ExitDot />} activeDot={false} legendType="none" connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full" style={{ background: palette.blue }} /> NIFTY Close
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-0 border-x-4 border-b-[7px] border-x-transparent" style={{ borderBottomColor: STATUS_GOOD }} /> Entry
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-0 border-x-4 border-t-[7px] border-x-transparent" style={{ borderTopColor: STATUS_CRITICAL }} /> Exit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full" style={{ background: HOLDING_FILL, opacity: 0.4 }} /> Holding period
        </span>
      </div>
    </div>
  )
}
