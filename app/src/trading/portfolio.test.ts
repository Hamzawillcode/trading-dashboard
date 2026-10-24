// portfolio.test.ts: UNIT TESTS for the P&L maths (portfolio.ts).
//
// A unit test checks ONE small piece of logic on its own: no browser, no network, no React.
// Pure functions are the easiest thing to test: give inputs, check the output. Each test runs in
// a fraction of a millisecond, so we can afford many of them.
//
// The shape of every test (the "AAA" pattern, same as JUnit):
//   ARRANGE: set up the inputs     ACT: call the function     ASSERT: check the result
//
//   describe('group name', () => { it('does something', () => { expect(actual).toBe(expected) }) })
//   describe ≈ a JUnit test class, it ≈ a @Test method, expect(...).toBe ≈ assertEquals

import { describe, expect, it } from 'vitest'
import type { Order, Position } from '../types'
import {
  applyFill,
  clean,
  holdingsValue,
  pnlPercent,
  reservedCash,
  reservedQuantity,
  totalRealized,
  totalUnrealized,
  unrealizedPnl,
} from './portfolio'

// A small helper to build test data: only the fields a test cares about need to be written
const position = (quantity: number, avgPrice: number, realizedPnl = 0): Position => ({
  symbol: 'BTCUSDT',
  quantity,
  avgPrice,
  realizedPnl,
})

describe('applyFill: buying', () => {
  it('opens a new position at the fill price', () => {
    const p = applyFill(undefined, 'BTCUSDT', 'BUY', 2, 100)
    expect(p).toEqual(position(2, 100))
  })

  it('averages the cost when buying more at a different price', () => {
    // hold 1 @ 100, buy 1 @ 200 → 2 coins that cost 300 in total → avg 150
    const p = applyFill(position(1, 100), 'BTCUSDT', 'BUY', 1, 200)
    expect(p.quantity).toBe(2)
    expect(p.avgPrice).toBe(150)
  })

  it('weights the average by quantity', () => {
    // 3 @ 100 + 1 @ 200 = 500 for 4 coins → avg 125 (not 150!)
    const p = applyFill(position(3, 100), 'BTCUSDT', 'BUY', 1, 200)
    expect(p.avgPrice).toBe(125)
  })

  it('does not change the object it was given (immutability)', () => {
    const before = position(1, 100)
    applyFill(before, 'BTCUSDT', 'BUY', 1, 200)
    expect(before).toEqual(position(1, 100))
  })
})

describe('applyFill: selling', () => {
  it('realizes profit on the part sold and keeps the average of the rest', () => {
    // hold 2 @ 150, sell 1 @ 180 → +30 realized, still 1 @ 150
    const p = applyFill(position(2, 150), 'BTCUSDT', 'SELL', 1, 180)
    expect(p).toEqual(position(1, 150, 30))
  })

  it('realizes a loss when selling below the average', () => {
    const p = applyFill(position(2, 150), 'BTCUSDT', 'SELL', 2, 100)
    expect(p.realizedPnl).toBe(-100)
  })

  it('resets the average price after selling everything', () => {
    const p = applyFill(position(2, 150), 'BTCUSDT', 'SELL', 2, 150)
    expect(p.quantity).toBe(0)
    expect(p.avgPrice).toBe(0)
  })

  it('leaves exactly zero, not float dust, after buying and selling decimals', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in floating point. clean() must hide that.
    let p = applyFill(undefined, 'BTCUSDT', 'BUY', 0.1, 100)
    p = applyFill(p, 'BTCUSDT', 'BUY', 0.2, 100)
    p = applyFill(p, 'BTCUSDT', 'SELL', 0.3, 100)
    expect(p.quantity).toBe(0)
  })
})

describe('unrealized P&L', () => {
  it('is (mark − avg) × quantity', () => {
    expect(unrealizedPnl(position(2, 100), 130)).toBe(60)
    expect(unrealizedPnl(position(2, 100), 90)).toBe(-20)
  })

  it('as a percentage of the average price', () => {
    expect(pnlPercent(position(1, 200), 210)).toBeCloseTo(5) // toBeCloseTo: compare floats safely
    expect(pnlPercent(position(0, 0), 210)).toBe(0) // no position → 0%, not a divide-by-zero
  })
})

describe('account totals', () => {
  const positions = { BTCUSDT: position(1, 100, 10), ETHUSDT: { ...position(2, 50, -5), symbol: 'ETHUSDT' } }
  const tickers = {
    BTCUSDT: { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', price: 120, changePercent: 0, high: 0, low: 0, volume: 0 },
    // no ETH price yet: ETH must simply be left out, not counted as 0 or NaN
  }

  it('values only holdings that have a live price', () => {
    expect(holdingsValue(positions, tickers)).toBe(120)
    expect(totalUnrealized(positions, tickers)).toBe(20)
  })

  it('adds up realized P&L across all positions', () => {
    expect(totalRealized(positions)).toBe(5)
  })
})

describe('reservations for open limit orders', () => {
  const order = (side: Order['side'], symbol: string, quantity: number, price: number): Order => ({
    id: `${side}-${symbol}-${price}`,
    symbol,
    side,
    type: 'LIMIT',
    quantity,
    price,
    status: 'OPEN',
    createdAt: 0,
  })
  const open = [order('BUY', 'BTCUSDT', 0.5, 100), order('BUY', 'ETHUSDT', 2, 10), order('SELL', 'BTCUSDT', 0.25, 200)]

  it('reserves cash for every open BUY', () => {
    expect(reservedCash(open)).toBe(70) // 0.5×100 + 2×10
  })

  it('reserves coins for open SELLs of that symbol only', () => {
    expect(reservedQuantity(open, 'BTCUSDT')).toBe(0.25)
    expect(reservedQuantity(open, 'ETHUSDT')).toBe(0)
  })
})

describe('clean', () => {
  it('removes floating-point noise', () => {
    expect(0.1 + 0.2).not.toBe(0.3) // the problem...
    expect(clean(0.1 + 0.2)).toBe(0.3) // ...and the fix
  })
})
