export type OptionInstrumentType = 'CE' | 'PE'

export interface OptionChainRow {
  date: string
  niftyClose: number
  tradingSymbol: string
  expiry: string
  strike: number
  instrumentType: OptionInstrumentType
  open: number
  high: number
  low: number
  close: number
}

export interface VixRow {
  date: string
  close: number
}

export interface VixPercentilePoint {
  date: string
  vix: number
  percentile: number | null
}

export interface StrangleSignal {
  date: string
  niftyPrice: number
  type: 'ENTRY' | 'EXIT'
}

export interface StrangleTrade {
  tradeNumber: number
  entryDate: string
  exitDate: string
  entryVix: number
  exitVix: number
  entryPercentile: number
  exitPercentile: number
  entryNiftyPrice: number
  exitNiftyPrice: number
  ceStrike: number
  peStrike: number
  ceSellPremium: number
  ceBuyBackPremium: number
  peSellPremium: number
  peBuyBackPremium: number
  holdingDays: number
  niftyProfitLoss: number
  callProfitLoss: number
  putProfitLoss: number
  totalProfitLoss: number
}

export interface StrangleOpenPosition {
  entryDate: string
  entryVix: number
  entryPercentile: number
  entryNiftyPrice: number
  expiry: string
  ceStrike: number
  peStrike: number
  ceSellPremium: number
  peSellPremium: number
}

export interface StranglePerformance {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalProfitLoss: number
  averageProfit: number
  averageLoss: number
  averageHoldingDays: number
  maxProfitTrade: StrangleTrade | null
  maxLossTrade: StrangleTrade | null
}

export interface StrangleBacktestResult {
  trades: StrangleTrade[]
  openPosition: StrangleOpenPosition | null
  performance: StranglePerformance
  vixSeries: VixPercentilePoint[]
  signals: StrangleSignal[]
}
