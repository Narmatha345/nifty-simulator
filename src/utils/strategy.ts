import type { OhlcRow } from '../types'
import type { Signal, TradingStrategy } from '../types/strategy'
import { computeSMA } from './movingAverage'

/**
 * BUY when Close crosses below the SMA, SELL when it crosses back above.
 * A factory (rather than a single fixed function) so future strategies
 * (RSI, MACD, Bollinger Bands, ...) can implement the same TradingStrategy
 * shape and be swapped in without touching the backtest engine.
 */
export function createSmaCrossoverStrategy(window = 30): TradingStrategy {
  return {
    name: `${window}-Day SMA Crossover`,
    generateSignals(rows: OhlcRow[]): Signal[] {
      const closes = rows.map((row) => row.close)
      const sma = computeSMA(closes, window)
      const signals: Signal[] = []

      for (let i = 1; i < rows.length; i++) {
        const prevSma = sma[i - 1]
        const currSma = sma[i]
        if (prevSma === null || currSma === null) continue

        const prevClose = closes[i - 1]
        const currClose = closes[i]

        if (prevClose >= prevSma && currClose < currSma) {
          signals.push({ date: rows[i].date, price: currClose, type: 'BUY' })
        } else if (prevClose <= prevSma && currClose > currSma) {
          signals.push({ date: rows[i].date, price: currClose, type: 'SELL' })
        }
      }

      return signals
    },
  }
}
