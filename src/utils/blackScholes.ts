// Abramowitz & Stegun 7.1.26 erf approximation (~1e-7 max error) — good enough
// for option pricing without pulling in a stats dependency.
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * ax)
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax)
  return sign * y
}

function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2))
}

export interface BlackScholesInputs {
  spot: number
  strike: number
  /** Time to expiry, in years. */
  timeToExpiryYears: number
  /** Annualized risk-free rate, as a decimal (e.g. 0.065 for 6.5%). */
  riskFreeRate: number
  /** Annualized volatility, as a decimal (e.g. 0.15 for 15%). */
  volatility: number
}

export interface BlackScholesPremiums {
  call: number
  put: number
}

/**
 * Standard Black-Scholes European option pricing. Falls back to intrinsic
 * value at/after expiry or when volatility is non-positive, since d1/d2 are
 * undefined at sigma*sqrt(T) = 0.
 */
export function priceBlackScholes(inputs: BlackScholesInputs): BlackScholesPremiums {
  const { spot, strike, timeToExpiryYears: T, riskFreeRate: r, volatility: sigma } = inputs

  if (T <= 0 || sigma <= 0) {
    return { call: Math.max(spot - strike, 0), put: Math.max(strike - spot, 0) }
  }

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(spot / strike) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const discountedStrike = strike * Math.exp(-r * T)

  const call = spot * normCdf(d1) - discountedStrike * normCdf(d2)
  const put = discountedStrike * normCdf(-d2) - spot * normCdf(-d1)

  return { call: Math.max(call, 0), put: Math.max(put, 0) }
}
