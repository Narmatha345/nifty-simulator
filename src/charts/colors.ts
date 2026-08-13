export interface ChartPalette {
  gridline: string
  axis: string
  textSecondary: string
  muted: string
  blue: string
  red: string
  orange: string
}

const LIGHT: ChartPalette = {
  gridline: '#e1e0d9',
  axis: '#c3c2b7',
  textSecondary: '#52514e',
  muted: '#898781',
  blue: '#7c3aed',
  red: '#e34948',
  orange: '#eb6834',
}

const DARK: ChartPalette = {
  gridline: '#2c2c2a',
  axis: '#383835',
  textSecondary: '#c3c2b7',
  muted: '#898781',
  blue: '#a78bfa',
  red: '#e66767',
  orange: '#d95926',
}

export function getChartPalette(isDark: boolean): ChartPalette {
  return isDark ? DARK : LIGHT
}
