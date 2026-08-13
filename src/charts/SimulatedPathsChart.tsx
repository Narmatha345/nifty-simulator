import { useMemo } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts'
import type { SimulatedPath } from '../types'
import { getChartPalette } from './colors'
import { tooltipContentStyle } from './ChartTooltipStyle'
import { formatNumber } from '../utils/format'

const MAX_RENDERED_PATHS = 150

interface Props {
  paths: SimulatedPath[]
  currentLevel: number
  isDark: boolean
}

interface PathsTooltipPayloadItem {
  dataKey?: string
  value?: number
}

function PathsTooltip({ active, label, payload, isDark }: { active?: boolean; label?: number; payload?: PathsTooltipPayloadItem[]; isDark: boolean }) {
  if (!active || !payload?.length) return null
  const median = payload.find((item) => item.dataKey === 'median')
  if (!median || median.value === undefined) return null
  return (
    <div style={tooltipContentStyle(isDark)} className="px-3 py-2">
      <p className="font-semibold">Day {label}</p>
      <p>Median-outcome path: {formatNumber(median.value, 2)}</p>
    </div>
  )
}

/** Evenly samples up to `max` paths from the full set so the chart stays fast to render. */
function samplePaths(paths: SimulatedPath[], max: number): SimulatedPath[] {
  if (paths.length <= max) return paths
  const step = paths.length / max
  const sampled: SimulatedPath[] = []
  for (let i = 0; i < max; i++) sampled.push(paths[Math.floor(i * step)])
  return sampled
}

export default function SimulatedPathsChart({ paths, currentLevel, isDark }: Props) {
  const palette = getChartPalette(isDark)
  const displayedPaths = useMemo(() => samplePaths(paths, MAX_RENDERED_PATHS), [paths])

  const medianFinalPath = useMemo(() => {
    if (paths.length === 0) return null
    const sorted = [...paths].sort((a, b) => a.finalLevel - b.finalLevel)
    return sorted[Math.floor(sorted.length / 2)]
  }, [paths])

  const data = useMemo(() => {
    const forecastDays = paths[0]?.levels.length ?? 0
    const rows: Record<string, number>[] = []
    for (let day = 0; day < forecastDays; day++) {
      const row: Record<string, number> = { day }
      displayedPaths.forEach((path, i) => {
        row[`p${i}`] = path.levels[day]
      })
      if (medianFinalPath) row.median = medianFinalPath.levels[day]
      rows.push(row)
    }
    return rows
  }, [displayedPaths, paths, medianFinalPath])

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={palette.gridline} vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: palette.textSecondary }}
            stroke={palette.axis}
            label={{ value: 'Trading day', position: 'insideBottom', offset: -4, fontSize: 11, fill: palette.muted }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: palette.textSecondary }}
            stroke={palette.axis}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => formatNumber(v, 0)}
            width={64}
          />
          <ReferenceLine y={currentLevel} stroke={palette.muted} strokeDasharray="4 4" label={{ value: 'Current level', position: 'insideTopLeft', fontSize: 10, fill: palette.muted }} />
          <Tooltip content={<PathsTooltip isDark={isDark} />} />
          {displayedPaths.map((path, i) => (
            <Line
              key={path.pathId}
              type="monotone"
              dataKey={`p${i}`}
              stroke={palette.blue}
              strokeOpacity={0.18}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              legendType="none"
            />
          ))}
          {medianFinalPath && (
            <Line
              type="monotone"
              dataKey="median"
              stroke={palette.orange}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="Median-outcome path"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing {displayedPaths.length.toLocaleString('en-IN')} of {paths.length.toLocaleString('en-IN')} simulated
        paths (thin green), with one representative median-outcome path highlighted (orange).
      </p>
    </div>
  )
}
