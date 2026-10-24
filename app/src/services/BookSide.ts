// BookSide.ts: ONE side of an order book (all the bids, or all the asks), always kept SORTED.
//
// WHY SORTED: the UI constantly asks "what are the best 8 prices?". The best bid is the
// HIGHEST buy price, and the best ask is the LOWEST sell price. If the levels were unsorted,
// we'd have to sort ~1000+ levels on every update (10 times a second).
//
// In Java you'd use a TreeMap<price, qty> (a sorted map: a red-black tree, O(log n) for
// insert/delete/lookup). JavaScript has no built-in sorted map, so we build a simple one:
//   • a Map  price → quantity        (O(1) lookup: "is this price in the book?")
//   • an array of prices, kept sorted (best price first, so "top N" is just slice(0, N))
//   • BINARY SEARCH to find where a price goes in that array: O(log n) to find the spot
//     (then splice shifts the elements after it, which is fast for arrays of a few thousand)

import type { Level } from '../types'

export class BookSide {
  private prices: number[] = []                 // sorted, best first
  private quantities = new Map<number, number>() // price → quantity
  private descending: boolean                    // bids: true (high → low), asks: false (low → high)

  constructor(side: 'bids' | 'asks') {
    this.descending = side === 'bids'
  }

  // Apply one level update. Binance's rule: quantity 0 means "this price level is gone".
  set(price: number, quantity: number) {
    const exists = this.quantities.has(price)

    if (quantity === 0) {
      if (exists) {
        this.quantities.delete(price)
        this.prices.splice(this.findIndex(price), 1) // remove 1 element at that position
      }
      return
    }

    if (!exists) this.prices.splice(this.findIndex(price), 0, price) // insert at the right spot
    this.quantities.set(price, quantity)
  }

  // The best n levels, e.g. top(8) → the 8 highest bids
  top(n: number): Level[] {
    return this.prices.slice(0, n).map((price) => ({ price, quantity: this.quantities.get(price)! }))
  }

  clear() {
    this.prices = []
    this.quantities.clear()
  }

  get size() {
    return this.prices.length
  }

  // BINARY SEARCH: the index where `price` is, or where it would be inserted to keep the order.
  // Halve the search range each step: ~11 steps for 2000 levels, instead of checking all 2000.
  private findIndex(price: number): number {
    let lo = 0
    let hi = this.prices.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1 // middle index (>> 1 = divide by 2, rounding down)
      if (this.comesBefore(this.prices[mid], price)) lo = mid + 1 // target is in the right half
      else hi = mid // target is in the left half (or at mid)
    }
    return lo
  }

  // Does price a sort BEFORE price b on this side? Bids: higher first. Asks: lower first.
  private comesBefore(a: number, b: number) {
    return this.descending ? a > b : a < b
  }
}
