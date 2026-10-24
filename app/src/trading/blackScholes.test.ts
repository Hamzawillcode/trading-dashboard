// blackScholes.test.ts: UNIT TESTS for option pricing.
//
// How do you test maths you can't eyeball? Three techniques, all used below:
//   1. KNOWN ANSWERS: compare with published textbook values (Hull's classic example)
//   2. INVARIANTS: rules that must ALWAYS hold, whatever the inputs (put–call parity, delta ranges)
//   3. EDGE CASES: expiry, deep in/out of the money, where formulas often break (divide by zero...)
// Floats are compared with toBeCloseTo(expected, digits), never toBe.

import { describe, expect, it } from 'vitest'
import { normCdf, priceOption } from './blackScholes'

describe('normCdf (the bell-curve area function)', () => {
  it('matches standard table values', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6)
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3) // the famous "95% within ±1.96"
    expect(normCdf(-1)).toBeCloseTo(0.1587, 4)
  })

  it('is symmetric: N(x) + N(−x) = 1', () => {
    for (const x of [0.3, 1.2, 2.5]) expect(normCdf(x) + normCdf(-x)).toBeCloseTo(1, 6)
  })
})

describe('priceOption', () => {
  // Textbook case: S=100, K=100, 1 year, 20% vol, 5% interest
  const q = priceOption({ S: 100, K: 100, T: 1, sigma: 0.2, r: 0.05 })

  it('matches the textbook call and put prices', () => {
    expect(q.callPrice).toBeCloseTo(10.4506, 3)
    expect(q.putPrice).toBeCloseTo(5.5735, 3)
  })

  it('satisfies put–call parity: C − P = S − K·e^(−rT)', () => {
    for (const K of [80, 100, 125]) {
      const o = priceOption({ S: 100, K, T: 0.5, sigma: 0.6, r: 0.03 })
      expect(o.callPrice - o.putPrice).toBeCloseTo(100 - K * Math.exp(-0.03 * 0.5), 6)
    }
  })

  it('keeps the Greeks in their valid ranges', () => {
    expect(q.callDelta).toBeGreaterThan(0)
    expect(q.callDelta).toBeLessThan(1)
    expect(q.putDelta).toBeCloseTo(q.callDelta - 1, 6) // put delta = call delta − 1
    expect(q.gamma).toBeGreaterThan(0)
    expect(q.vega).toBeGreaterThan(0)
    expect(q.callTheta).toBeLessThan(0) // options lose value as time passes
  })

  it('gives ATM delta near 0.5, deep ITM near 1, deep OTM near 0', () => {
    const at = (K: number) => priceOption({ S: 100, K, T: 0.1, sigma: 0.5 }).callDelta
    expect(at(100)).toBeCloseTo(0.5, 1)
    expect(at(10)).toBeCloseTo(1, 3)
    expect(at(1000)).toBeCloseTo(0, 3)
  })

  it('is worth exactly its intrinsic value at expiry (T = 0), without NaN', () => {
    const itm = priceOption({ S: 120, K: 100, T: 0, sigma: 0.5 })
    expect(itm.callPrice).toBeCloseTo(20, 6)
    expect(itm.putPrice).toBeCloseTo(0, 6)
    expect(Number.isNaN(itm.gamma)).toBe(false)
  })
})
