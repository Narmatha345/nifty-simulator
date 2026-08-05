import type { OhlcRow } from '../types'
import type { BuyAndHoldComparison, EquityPoint, StrangleTrade } from '../types/strangle'

function buildStrangleEquityCurve(rows: OhlcRow[], trades: StrangleTrade[]): EquityPoint[] {
  const strategyPlByExit = new Map<string, number>()
  const buyHoldPlByExit = new Map<string, number>()
  for (const trade of trades) {
    strategyPlByExit.set(trade.exitDate, (strategyPlByExit.get(trade.exitDate) ?? 0) + trade.totalProfitLoss)
    const buyHoldPl = trade.exitNiftyPrice - trade.entryNiftyPrice
    buyHoldPlByExit.set(trade.exitDate, (buyHoldPlByExit.get(trade.exitDate) ?? 0) + buyHoldPl)
  }

  let cumulativeStrategy = 0
  let cumulativeBuyHold = 0
  return rows.map((row) => {
    const strategyPl = strategyPlByExit.get(row.date)
    if (strategyPl !== undefined) cumulativeStrategy += strategyPl
    const buyHoldPl = buyHoldPlByExit.get(row.date)
    if (buyHoldPl !== undefined) cumulativeBuyHold += buyHoldPl
    return { date: row.date, cumulativeProfitLoss: cumulativeStrategy, buyAndHoldProfitLoss: cumulativeBuyHold }
  })
}

/**
 * Compares the Short Strangle strategy against simply buying and holding
 * NIFTY over the same trade windows: for every trade, Buy & Hold profit =
 * Exit NIFTY Price - Entry NIFTY Price, summed across all trades.
 */
export function computeBuyAndHoldComparison(rows: OhlcRow[], trades: StrangleTrade[]): BuyAndHoldComparison | null {
  if (trades.length === 0) return null

  const first = trades[0]
  const last = trades[trades.length - 1]

  const buyHoldProfit = trades.reduce((sum, t) => sum + (t.exitNiftyPrice - t.entryNiftyPrice), 0)
  const strategyProfit = trades.reduce((sum, t) => sum + t.totalProfitLoss, 0)
  const entryPrice = first.entryNiftyPrice

  return {
    entryDate: first.entryDate,
    exitDate: last.exitDate,
    entryPrice,
    exitPrice: last.exitNiftyPrice,
    buyHoldProfit,
    buyHoldReturnPct: entryPrice > 0 ? (buyHoldProfit / entryPrice) * 100 : 0,
    strategyProfit,
    strategyReturnPct: entryPrice > 0 ? (strategyProfit / entryPrice) * 100 : 0,
    difference: strategyProfit - buyHoldProfit,
    outperformed: strategyProfit > buyHoldProfit,
    equityCurve: buildStrangleEquityCurve(rows, trades),
  }
}
