// blackScholes.ts: the Black–Scholes option pricing model + the Greeks. Pure math, no React.
//
// WHAT IT ANSWERS: "what is a fair price for this option right now?" from 5 inputs:
//   S = spot price of the coin (live from Binance)
//   K = strike price (the price the option lets you buy/sell at)
//   T = time to expiry, in YEARS (e.g. 7 days = 7/365)
//   σ = volatility (sigma): how much the price tends to move, per year (0.55 = 55%)
//   r = risk-free interest rate (we use 0: crypto has no single "risk-free" rate, and it barely matters here)
//
// INTUITION (no derivation needed):
//   A call is worth more when: spot is higher, strike is lower, more time is left, volatility is higher.
//   It assumes the price follows a random walk with log-normal returns, and N(d1), N(d2) are
//   roughly "probabilities" that the option ends up worth exercising.
//
// THE GREEKS: how sensitive the option's price is to each input:
//   Delta (Δ): price change per $1 move in spot.       Call 0 → 1, put −1 → 0. ATM ≈ ±0.5
//   Gamma (Γ): how fast DELTA changes per $1 move.      Highest at-the-money, close to expiry
//   Theta (Θ): price change per DAY that passes.        Usually negative: options lose value as time runs out ("time decay")
//   Vega:      price change per 1 percentage point of volatility (e.g. 55% → 56%)

export type OptionInputs = { S: number; K: number; T: number; sigma: number; r?: number }

export type OptionQuote = {
  callPrice: number
  putPrice: number
  callDelta: number
  putDelta: number
  gamma: number      // same for call and put
  vega: number       // same for call and put (per 1 vol point)
  callTheta: number  // per day
  putTheta: number   // per day
}

// Standard normal PDF: the bell curve's height at x
export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

// Standard normal CDF: area under the bell curve to the LEFT of x (= probability a normal value is ≤ x).
// There's no exact formula, so we use the classic Abramowitz & Stegun approximation (error < 1e-7).
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const poly = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const p = 1 - normPdf(Math.abs(x)) * poly // valid for x ≥ 0
  return x >= 0 ? p : 1 - p // the curve is symmetric, so use that for negative x
}

export function priceOption({ S, K, T, sigma, r = 0 }: OptionInputs): OptionQuote {
  // At (or past) expiry, an option is worth only what you'd get by exercising it now ("intrinsic value")
  if (T <= 0 || sigma <= 0) {
    return {
      callPrice: Math.max(S - K, 0),
      putPrice: Math.max(K - S, 0),
      callDelta: S > K ? 1 : 0,
      putDelta: S < K ? -1 : 0,
      gamma: 0,
      vega: 0,
      callTheta: 0,
      putTheta: 0,
    }
  }

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const discount = Math.exp(-r * T) // value today of $1 paid at expiry

  const Nd1 = normCdf(d1)
  const Nd2 = normCdf(d2)
  const pdf1 = normPdf(d1)

  // Shared part of theta: the time decay that comes from volatility
  const decay = -(S * pdf1 * sigma) / (2 * sqrtT)

  return {
    callPrice: S * Nd1 - K * discount * Nd2,
    putPrice: K * discount * (1 - Nd2) - S * (1 - Nd1), // N(−x) = 1 − N(x)
    callDelta: Nd1,
    putDelta: Nd1 - 1,
    gamma: pdf1 / (S * sigma * sqrtT),
    vega: (S * pdf1 * sqrtT) / 100,                            // ÷100: per 1 vol POINT, not per 100%
    callTheta: (decay - r * K * discount * Nd2) / 365,         // ÷365: per DAY, not per year
    putTheta: (decay + r * K * discount * (1 - Nd2)) / 365,
  }
}
