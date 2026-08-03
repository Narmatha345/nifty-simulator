import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HistogramBin } from '../types'
import { getChartPalette, type ChartPalette } from './colors'
import { tooltipContentStyle } from './ChartTooltipStyle'

interface BinDatum extends HistogramBin {
  relativeFrequency: number
  midpoint: number
}

interface TooltipPayloadItem {
  payload: BinDatum
}

interface BarShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: BinDatum
}

interface Props {
  bins: HistogramBin[]
  totalObservations: number
  isDark: boolean
}

function ReturnHistogramTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null
  const bin = payload[0].payload
  return (
    <div className="space-y-0.5">
      <p className="font-semibold">{bin.label}</p>
      <p>{bin.count} trading day{bin.count === 1 ? '' : 's'}</p>
      <p>{(bin.relativeFrequency * 100).toFixed(2)}% of observations</p>
    </div>
  )
}

export default function ReturnHistogramChart({ bins, totalObservations, isDark }: Props) {
  const palette = getChartPalette(isDark)
  const data = bins.map((bin) => ({
    ...bin,
    relativeFrequency: totalObservations > 0 ? bin.count / totalObservations : 0,
    midpoint: (bin.rangeMin + bin.rangeMax) / 2,
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 32 }} barCategoryGap={2}>
        <CartesianGrid stroke={palette.gridline} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: palette.textSecondary }}
          stroke={palette.axis}
          angle={-60}
          textAnchor="end"
          interval="preserveStartEnd"
          height={70}
        />
        <YAxis tick={{ fontSize: 11, fill: palette.textSecondary }} stroke={palette.axis} allowDecimals={false} />
        <Tooltip content={<ReturnHistogramTooltip />} contentStyle={tooltipContentStyle(isDark)} cursor={{ fill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="count" isAnimationActive={false} shape={(props: BarShapeProps) => <HistogramBar {...props} palette={palette} />} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function HistogramBar({ x = 0, y = 0, width = 0, height = 0, payload, palette }: BarShapeProps & { palette: ChartPalette }) {
  const fill = (payload?.midpoint ?? 0) >= 0 ? palette.blue : palette.red
  return <rect x={x} y={y} width={width} height={height} rx={3} ry={3} fill={fill} />
}
