// LocalOrderBook.test.ts: UNIT TESTS for the order book sync logic (Phase 6).
//
// The book is a plain class with no network, so we can feed it MADE-UP messages and check every
// branch of the algorithm (apply / stale / gap) in milliseconds. In the real app, a gap only happens
// when the network misbehaves, which you can't reliably make happen by hand. Tests can.

import { describe, expect, it } from 'vitest'
import type { DepthDiff } from '../types'
import { BookSide } from './BookSide'
import { LocalOrderBook } from './LocalOrderBook'

// A book at version 100: bids 99/98, asks 101/102
function bookAt100() {
  const book = new LocalOrderBook()
  book.loadSnapshot({
    lastUpdateId: 100,
    bids: [[99, 1], [98, 2]],
    asks: [[101, 1], [102, 3]],
  })
  return book
}
const diff = (U: number, u: number, bids: [number, number][] = [], asks: [number, number][] = []): DepthDiff => ({
  firstUpdateId: U,
  finalUpdateId: u,
  bids,
  asks,
})

describe('BookSide', () => {
  it('keeps bids sorted high → low and asks low → high', () => {
    const bids = new BookSide('bids')
    const asks = new BookSide('asks')
    for (const p of [5, 9, 1, 7]) {
      bids.set(p, 1)
      asks.set(p, 1)
    }
    expect(bids.top(4).map((l) => l.price)).toEqual([9, 7, 5, 1])
    expect(asks.top(4).map((l) => l.price)).toEqual([1, 5, 7, 9])
  })

  it('updates a level in place, and removes it when the quantity is 0', () => {
    const side = new BookSide('asks')
    side.set(10, 1)
    side.set(10, 4)
    expect(side.top(1)).toEqual([{ price: 10, quantity: 4 }])
    side.set(10, 0)
    expect(side.size).toBe(0)
  })
})

describe('LocalOrderBook', () => {
  it('applies a diff that continues right after the snapshot', () => {
    const book = bookAt100()
    // a diff can START before our version (U ≤ 101) as long as it reaches past it
    expect(book.applyDiff(diff(95, 103, [[99, 5]], [[101, 0]]))).toBe('applied')
    expect(book.lastUpdateId).toBe(103)
    expect(book.bids.top(1)).toEqual([{ price: 99, quantity: 5 }]) // quantity changed
    expect(book.asks.top(1)).toEqual([{ price: 102, quantity: 3 }]) // 101 was removed (qty 0)
  })

  it('ignores a STALE diff that the snapshot already includes', () => {
    const book = bookAt100()
    expect(book.applyDiff(diff(90, 100, [[99, 42]]))).toBe('stale')
    expect(book.bids.top(1)[0].quantity).toBe(1) // unchanged
  })

  it('detects a GAP when updates were missed, and changes nothing', () => {
    const book = bookAt100()
    expect(book.applyDiff(diff(102, 105, [[99, 42]]))).toBe('gap') // 101 is missing
    expect(book.lastUpdateId).toBe(100)
    expect(book.bids.top(1)[0].quantity).toBe(1)
  })

  it('applies a chain of consecutive diffs', () => {
    const book = bookAt100()
    expect(book.applyDiff(diff(101, 101, [[100, 1]]))).toBe('applied') // a new best bid
    expect(book.applyDiff(diff(102, 104, [], [[100.5, 2]]))).toBe('applied') // a new best ask
    expect(book.bids.top(1)[0].price).toBe(100)
    expect(book.asks.top(1)[0].price).toBe(100.5)
    expect(book.lastUpdateId).toBe(104)
  })

  it('a new snapshot replaces everything (resync)', () => {
    const book = bookAt100()
    book.loadSnapshot({ lastUpdateId: 500, bids: [[50, 1]], asks: [] })
    expect(book.bids.top(10)).toEqual([{ price: 50, quantity: 1 }])
    expect(book.asks.size).toBe(0)
    expect(book.lastUpdateId).toBe(500)
  })
})
