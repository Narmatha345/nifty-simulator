export interface OhlcRow {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface ReturnPoint {
  date: string
  close: number
  returnPct: number | null
}

export interface HistogramBin {
  rangeMin: number
  rangeMax: number
  label: string
  count: number
}

export interface ProbabilityBin extends HistogramBin {
  probability: number
}

export type DatePreset = '1Y' | '2Y' | '3Y' | '5Y' | 'ALL' | 'CUSTOM'

export interface DateRange {
  start: string
  end: string
}

export interface SimulationParams {
  currentLevel: number
  forecastDays: number
  numPaths: number
}

export interface SimulatedPath {
  pathId: number
  levels: number[]
  dailyReturns: number[]
  finalLevel: number
  maxRise: number
  maxFall: number
}

export interface SimulationResult {
  params: SimulationParams
  paths: SimulatedPath[]
  generatedAt: number
}

export interface SummaryStatistics {
  expectedFinal: number
  medianFinal: number
  minFinal: number
  maxFinal: number
  stdDevFinal: number
  avgDailyReturn: number
  avgMaxRise: number
  avgMaxFall: number
}
