import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SimulatedPath } from '../types'
import { buildHistogram, suggestBinWidth } from '../utils/histogram'
import { getChartPalette, type ChartPalette } from './colors'
import { tooltipContentStyle } from './ChartTooltipStyle'
import { formatNumber } from '../utils/format'

interface Props {
  paths: SimulatedPath[]
  currentLevel: number
  isDark: boolean
}

interface FinalBinDatum {
  rangeMin: number
  rangeMax: number
  label: string
  count: number
  midpoint: number
}

interface TooltipPayloadItem {
  payload: FinalBinDatum
}

interface BarShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: FinalBinDatum
}

function FinalDistributionTooltip({ active, payload, total }: { active?: boolean; payload?: TooltipPayloadItem[]; total: number }) {
  if (!active || !payload?.length) return null
  const bin = payload[0].payload
  return (
    <div className="space-y-0.5">
      <p className="font-semibold">
        {formatNumber(bin.rangeMin, 0)} – {formatNumber(bin.rangeMax, 0)}
      </p>
      <p>{bin.count} path{bin.count === 1 ? '' : 's'}</p>
      <p>{total > 0 ? ((bin.count / total) * 100).toFixed(2) : '0.00'}% of simulations</p>
    </div>
  )
}

function FinalBar({ x = 0, y = 0, width = 0, height = 0, payload, palette, currentLevel }: BarShapeProps & { palette: ChartPalette; currentLevel: number }) {
  const fill = (payload?.midpoint ?? 0) >= currentLevel ? palette.blue : palette.red
  return <rect x={x} y={y} width={width} height={height} rx={2} ry={2} fill={fill} />
}

export default function FinalDistributionChart({ paths, currentLevel, isDark }: Props) {
  const palette = getChartPalette(isDark)

  const data = useMemo<FinalBinDatum[]>(() => {
    const finals = paths.map((p) => p.finalLevel)
    const binWidth = suggestBinWidth(finals, 30)
    return buildHistogram(finals, binWidth).map((bin) => ({
      rangeMin: bin.rangeMin,
      rangeMax: bin.rangeMax,
      label: `${formatNumber(bin.rangeMin, 0)}-${formatNumber(bin.rangeMax, 0)}`,
      count: bin.count,
      midpoint: (bin.rangeMin + bin.rangeMax) / 2,
    }))
  }, [paths])

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 32 }} barCategoryGap={1}>
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
        <ReferenceLine
          x={data.find((bin) => currentLevel >= bin.rangeMin && currentLevel < bin.rangeMax)?.label}
          stroke={palette.muted}
          strokeDasharray="4 4"
          label={{ value: 'Current level', position: 'top', fontSize: 10, fill: palette.muted }}
        />
        <Tooltip content={<FinalDistributionTooltip total={paths.length} />} contentStyle={tooltipContentStyle(isDark)} cursor={{ fill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="count" isAnimationActive={false} shape={(props: BarShapeProps) => <FinalBar {...props} palette={palette} currentLevel={currentLevel} />} />
      </BarChart>
    </ResponsiveContainer>
  )
}
