import type { OhlcRow } from './index'

export type SignalType = 'BUY' | 'SELL'

export interface Signal {
  date: string
  price: number
  type: SignalType
}

/** Common shape every strategy implements, so new rules (RSI, MACD, ...) can plug in later. */
export interface TradingStrategy {
  name: string
  generateSignals: (rows: OhlcRow[]) => Signal[]
}

export interface Trade {
  tradeNumber: number
  entryDate: string
  entryPrice: number
  exitDate: string
  exitPrice: number
  holdingDays: number
  profitLoss: number
  returnPct: number
}

export interface OpenPosition {
  entryDate: string
  entryPrice: number
}

export interface EquityPoint {
  date: string
  cumulativeProfitLoss: number
  buyAndHoldProfitLoss: number
}

export interface StrategyPerformance {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalProfitLoss: number
  averageProfit: number
  averageLoss: number
  maxDrawdown: number
  initialCapital: number
  finalPortfolioValue: number
  overallReturnPct: number
}

export interface BacktestResult {
  trades: Trade[]
  equityCurve: EquityPoint[]
  performance: StrategyPerformance
  openPosition: OpenPosition | null
}
