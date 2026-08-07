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

export interface StrangleStrategyParams {
  /** Enter when the rolling VIX percentile is >= this value. */
  entryPercentile: number
  /** Exit when the rolling VIX percentile is <= this value. */
  exitPercentile: number
  /** OTM call strike target, as % above spot: strike ~= spot * (1 + otmCallPct/100). */
  otmCallPct: number
  /** OTM put strike target, as % below spot: strike ~= spot * (1 - otmPutPct/100). */
  otmPutPct: number
}

export type SimulationSource = 'historical' | 'synthetic'

export interface EquityPoint {
  date: string
  cumulativeProfitLoss: number
  buyAndHoldProfitLoss: number
}

export interface BuyAndHoldComparison {
  entryDate: string
  exitDate: string
  entryPrice: number
  exitPrice: number
  buyHoldProfit: number
  buyHoldReturnPct: number
  strategyProfit: number
  strategyReturnPct: number
  difference: number
  outperformed: boolean
  equityCurve: EquityPoint[]
  /** Buy & Hold's own Total Trades / Win Rate / Avg Holding Days / Max Profit / Max Loss — one "trade" per Short Strangle trade window (buy at that trade's entry NIFTY price, sell at its exit price), so it's directly comparable to the strategy's own StranglePerformance. */
  buyHoldPerformance: StranglePerformance
}
