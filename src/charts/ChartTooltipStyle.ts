import type { CSSProperties } from 'react'

/** Shared Recharts <Tooltip> contentStyle/itemStyle, matching the app's card chrome. */
export function tooltipContentStyle(isDark: boolean): CSSProperties {
  return {
    background: isDark ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
    color: isDark ? '#f1f5f9' : '#0f172a',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  }
}
