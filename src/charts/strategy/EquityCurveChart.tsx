import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { EquityPoint } from '../../types/strategy'
import { getChartPalette } from '../colors'
import { tooltipContentStyle } from '../ChartTooltipStyle'
import { formatDate, formatNumber } from '../../utils/format'

interface Props {
  equityCurve: EquityPoint[]
  isDark: boolean
}

interface TooltipPayloadItem {
  value?: number
}

function EquityTooltip({ active, label, payload, isDark }: { active?: boolean; label?: string; payload?: TooltipPayloadItem[]; isDark: boolean }) {
  if (!active || !payload?.length || payload[0].value === undefined) return null
  return (
    <div style={tooltipContentStyle(isDark)} className="px-3 py-2">
      <p className="font-semibold">{formatDate(label ?? '')}</p>
      <p>Cumulative P&amp;L: {formatNumber(payload[0].value, 2)}</p>
    </div>
  )
}

export default function EquityCurveChart({ equityCurve, isDark }: Props) {
  const palette = getChartPalette(isDark)

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={equityCurve} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
          width={64}
        />
        <ReferenceLine y={0} stroke={palette.muted} strokeDasharray="4 4" />
        <Tooltip content={<EquityTooltip isDark={isDark} />} />
        <Line type="stepAfter" dataKey="cumulativeProfitLoss" stroke={palette.blue} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
