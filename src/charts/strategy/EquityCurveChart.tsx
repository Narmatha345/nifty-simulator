import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { EquityPoint } from '../../types/strategy'
import { getChartPalette } from '../colors'
import { tooltipContentStyle } from '../ChartTooltipStyle'
import { formatDate, formatNumber } from '../../utils/format'

interface Props {
  equityCurve: EquityPoint[]
  strategyName: string
  isDark: boolean
}

interface TooltipPayloadItem {
  value?: number
  dataKey?: string
  color?: string
}

function EquityTooltip({
  active,
  label,
  payload,
  isDark,
  strategyName,
}: {
  active?: boolean
  label?: string
  payload?: TooltipPayloadItem[]
  isDark: boolean
  strategyName: string
}) {
  if (!active || !payload?.length) return null
  const strategyPoint = payload.find((p) => p.dataKey === 'cumulativeProfitLoss')
  const buyAndHoldPoint = payload.find((p) => p.dataKey === 'buyAndHoldProfitLoss')
  return (
    <div style={tooltipContentStyle(isDark)} className="px-3 py-2">
      <p className="font-semibold">{formatDate(label ?? '')}</p>
      {strategyPoint?.value !== undefined && (
        <p style={{ color: strategyPoint.color }}>
          {strategyName}: {formatNumber(strategyPoint.value, 2)}
        </p>
      )}
      {buyAndHoldPoint?.value !== undefined && (
        <p style={{ color: buyAndHoldPoint.color }}>Buy &amp; Hold: {formatNumber(buyAndHoldPoint.value, 2)}</p>
      )}
    </div>
  )
}

export default function EquityCurveChart({ equityCurve, strategyName, isDark }: Props) {
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
        <Tooltip content={<EquityTooltip isDark={isDark} strategyName={strategyName} />} />
        <Legend wrapperStyle={{ fontSize: 12, color: palette.textSecondary }} />
        <Line
          type="stepAfter"
          dataKey="cumulativeProfitLoss"
          name={strategyName}
          stroke={palette.blue}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="buyAndHoldProfitLoss"
          name="Buy & Hold"
          stroke={palette.orange}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
