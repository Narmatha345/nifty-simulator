import type { OhlcRow } from '../types'
import type { BacktestResult, EquityPoint, OpenPosition, Signal, StrategyPerformance, Trade } from '../types/strategy'

/**
 * Runs a simple single-unit, no-leverage, no-shorting backtest: a BUY signal
 * opens one unit (ignored if already holding one), the next SELL signal
 * closes it. No transaction costs, brokerage, or slippage are modelled.
 */
export function runBacktest(rows: OhlcRow[], signals: Signal[]): BacktestResult {
  const trades: Trade[] = []
  let openEntry: OpenPosition | null = null

  for (const signal of signals) {
    if (signal.type === 'BUY' && !openEntry) {
      openEntry = { entryDate: signal.date, entryPrice: signal.price }
    } else if (signal.type === 'SELL' && openEntry) {
      const profitLoss = signal.price - openEntry.entryPrice
      trades.push({
        tradeNumber: trades.length + 1,
        entryDate: openEntry.entryDate,
        entryPrice: openEntry.entryPrice,
        exitDate: signal.date,
        exitPrice: signal.price,
        holdingDays: daysBetween(openEntry.entryDate, signal.date),
        profitLoss,
        returnPct: (profitLoss / openEntry.entryPrice) * 100,
      })
      openEntry = null
    }
  }

  // Initial capital is modelled as the cost of holding the 1 unit from day
  // one — the simplest baseline that lets "final portfolio value" and
  // "overall return %" mean something for a single-unit, no-leverage strategy.
  const initialCapital = rows[0]?.close ?? 0

  return {
    trades,
    equityCurve: buildEquityCurve(rows, trades),
    performance: computePerformance(trades, initialCapital),
    openPosition: openEntry,
  }
}

function daysBetween(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`)
  const end = Date.parse(`${endIso}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
}

function buildEquityCurve(rows: OhlcRow[], trades: Trade[]): EquityPoint[] {
  const profitLossByExitDate = new Map<string, number>()
  for (const trade of trades) {
    profitLossByExitDate.set(trade.exitDate, (profitLossByExitDate.get(trade.exitDate) ?? 0) + trade.profitLoss)
  }

  const startingPrice = rows[0]?.close ?? 0

  let cumulative = 0
  return rows.map((row) => {
    const pl = profitLossByExitDate.get(row.date)
    if (pl !== undefined) cumulative += pl
    return { date: row.date, cumulativeProfitLoss: cumulative, buyAndHoldProfitLoss: row.close - startingPrice }
  })
}

function computePerformance(trades: Trade[], initialCapital: number): StrategyPerformance {
  const totalTrades = trades.length
  const winningTrades = trades.filter((t) => t.profitLoss > 0)
  const losingTrades = trades.filter((t) => t.profitLoss < 0)
  const totalProfitLoss = trades.reduce((sum, t) => sum + t.profitLoss, 0)

  let peak = 0
  let cumulative = 0
  let maxDrawdown = 0
  for (const trade of trades) {
    cumulative += trade.profitLoss
    peak = Math.max(peak, cumulative)
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative)
  }

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0,
    totalProfitLoss,
    averageProfit: winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.profitLoss, 0) / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? losingTrades.reduce((s, t) => s + t.profitLoss, 0) / losingTrades.length : 0,
    maxDrawdown,
    initialCapital,
    finalPortfolioValue: initialCapital + totalProfitLoss,
    overallReturnPct: initialCapital > 0 ? (totalProfitLoss / initialCapital) * 100 : 0,
  }
}
