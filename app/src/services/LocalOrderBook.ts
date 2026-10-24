// LocalOrderBook.ts: our own copy of the exchange's order book, kept in sync with
// SNAPSHOT + DIFFS, and SEQUENCE NUMBERS to detect missed messages.
//
// The idea: Binance gives every change to the book an increasing UPDATE ID (a version number).
//   • The REST snapshot says: "here is the whole book, as of version lastUpdateId"
//   • Each WebSocket diff says: "these levels changed, covering versions U through u"
//
// Our book is at version `lastUpdateId`. For each diff:
//
//   u ≤ lastUpdateId          → STALE: already included in what we have. Ignore it.
//   U > lastUpdateId + 1      → GAP: we MISSED some versions in between. Our book is now
//                               wrong, and we can't patch it. Throw it away and resync.
//   otherwise                 → APPLY each level, then lastUpdateId = u
//
//   our version: 100     diff [101..105] ✓ apply → 105     diff [106..110] ✓ → 110
//                        diff [112..115] ✗ GAP (111 is missing!) → resync from a new snapshot
//
// Plain class, no React, no network: so it's easy to unit-test with made-up messages.

import type { DepthDiff, DepthSnapshot } from '../types'
import { BookSide } from './BookSide'

export type DiffResult = 'applied' | 'stale' | 'gap'

export class LocalOrderBook {
  readonly bids = new BookSide('bids')
  readonly asks = new BookSide('asks')
  lastUpdateId = 0

  // Replace everything with a fresh snapshot
  loadSnapshot(snapshot: DepthSnapshot) {
    this.bids.clear()
    this.asks.clear()
    for (const [price, qty] of snapshot.bids) this.bids.set(price, qty)
    for (const [price, qty] of snapshot.asks) this.asks.set(price, qty)
    this.lastUpdateId = snapshot.lastUpdateId
  }

  // Try to apply one diff. Tells the caller what happened, so it can resync on a gap.
  applyDiff(diff: DepthDiff): DiffResult {
    if (diff.finalUpdateId <= this.lastUpdateId) return 'stale'
    if (diff.firstUpdateId > this.lastUpdateId + 1) return 'gap'

    for (const [price, qty] of diff.bids) this.bids.set(price, qty)
    for (const [price, qty] of diff.asks) this.asks.set(price, qty)
    this.lastUpdateId = diff.finalUpdateId
    return 'applied'
  }
}
