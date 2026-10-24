// portfolio.ts: the MONEY MATH of the app, as PURE FUNCTIONS.
//
// Pure = output depends only on the inputs, and nothing outside is changed.
// No React, no store, no network. That makes them:
//   • easy to reason about (one formula per function)
//   • easy to unit-test (Phase 9): applyFill(pos, 'BUY', 1, 100) → check the result
//
// THE KEY IDEAS:
//   Average price (cost basis): what you paid per coin, on average, for what you still hold.
//   Unrealized P&L: profit/loss ON PAPER = (current price − avg price) × quantity held.
//                   It moves with every tick, and nothing is locked in until you sell.
//   Realized P&L:   profit/loss LOCKED IN by selling = (sell price − avg price) × quantity sold.

import type { Order, Position, Side, TickerMap } from '../types'

// Floating-point numbers can't store most decimals exactly (0.1 + 0.2 = 0.30000000000000004).
// After many additions, a position of "0" might really be 0.000000000000001.
// Rounding to 10 decimals removes that noise (crypto quantities never need more than 8).
export const clean = (n: number) => Number(n.toFixed(10))

// Update a position after one fill (one executed trade). Returns a NEW object (never mutates).
export function applyFill(
  pos: Position | undefined,
  symbol: string,
  side: Side,
  quantity: number,
  price: number,
): Position {
  // No position yet → start from zero
  const p = pos ?? { symbol, quantity: 0, avgPrice: 0, realizedPnl: 0 }

  if (side === 'BUY') {
    // New average = total cost of all coins ÷ total coins.
    // e.g. hold 1 @ 100, buy 1 @ 200 → (1×100 + 1×200) / 2 = avg 150
    const newQty = clean(p.quantity + quantity)
    const avgPrice = (p.quantity * p.avgPrice + quantity * price) / newQty
    return { ...p, quantity: newQty, avgPrice }
  }

  // SELL: lock in profit/loss on the part sold. The avg price of what's LEFT doesn't change.
  // e.g. hold 2 @ avg 150, sell 1 @ 180 → realized += (180 − 150) × 1 = +30, still hold 1 @ 150
  const newQty = clean(p.quantity - quantity)
  return {
    ...p,
    quantity: newQty,
    realizedPnl: p.realizedPnl + (price - p.avgPrice) * quantity,
    avgPrice: newQty > 0 ? p.avgPrice : 0, // sold everything → no cost basis any more
  }
}

// Paper profit/loss of a position at the current market price ("mark price")
export function unrealizedPnl(pos: Position, markPrice: number): number {
  return (markPrice - pos.avgPrice) * pos.quantity
}

// The same as a percentage of what was paid: +5% means the price is 5% above your average
export function pnlPercent(pos: Position, markPrice: number): number {
  return pos.avgPrice > 0 ? (markPrice / pos.avgPrice - 1) * 100 : 0
}

// ----- Totals over all positions (for the account summary) -----
type Positions = Partial<Record<string, Position>>

// Current market value of all coins held
export function holdingsValue(positions: Positions, tickers: TickerMap): number {
  let total = 0
  for (const p of Object.values(positions)) {
    const price = p && tickers[p.symbol]?.price
    if (p && price) total += p.quantity * price
  }
  return total
}

export function totalUnrealized(positions: Positions, tickers: TickerMap): number {
  let total = 0
  for (const p of Object.values(positions)) {
    const price = p && tickers[p.symbol]?.price
    if (p && price) total += unrealizedPnl(p, price)
  }
  return total
}

export function totalRealized(positions: Positions): number {
  return Object.values(positions).reduce((sum, p) => sum + (p?.realizedPnl ?? 0), 0)
}

// ----- RESERVATIONS: money/coins promised to open LIMIT orders -----
// A limit BUY waiting in the book has "spoken for" its cash: you can't spend it twice.
// Same for a limit SELL and its coins. "Available" = what you have minus what's reserved.

export function reservedCash(openOrders: Order[]): number {
  return openOrders
    .filter((o) => o.side === 'BUY')
    .reduce((sum, o) => sum + o.price * o.quantity, 0)
}

export function reservedQuantity(openOrders: Order[], symbol: string): number {
  return openOrders
    .filter((o) => o.side === 'SELL' && o.symbol === symbol)
    .reduce((sum, o) => sum + o.quantity, 0)
}
