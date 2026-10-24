// OrderBook.tsx: the live order book panel.
//
//   Price      Amount     Total        ← ASKS (sellers), red. Lowest ask sits just above the middle
//   80,128.10  0.0120     2.1056
//   80,127.57  1.9527     1.9527
//   ───── 80,127.565  spread 0.01 ─────  ← the MIDDLE: mid price and spread
//   80,127.56  2.3726     2.3726       ← BIDS (buyers), green. Highest bid sits just below the middle
//   80,127.55  0.0006     2.3732
//
// "Total" = CUMULATIVE amount: everything from the best price down to this row. The shaded
// bar behind each row shows that total, so you can SEE where the big walls of orders are.

import { useMarketStore } from '../store/marketStore'
import { useOrderBook } from '../hooks/useOrderBook'
import type { Level } from '../types'
import { formatQuantity, formatTickPrice } from '../utils/format'

export function OrderBook() {
  const symbol = useMarketStore((s) => s.selectedSymbol)
  // key={symbol}: a new coin REMOUNTS the book, so its state starts fresh ("Syncing…")
  // instead of briefly showing the old coin's prices. (Same trick as the order form.)
  return <BookLadder key={symbol} symbol={symbol} />
}

function BookLadder({ symbol }: { symbol: string }) {
  const { view, simulateGap } = useOrderBook(symbol)

  // Add a running total to each level (best price first)
  const withTotals = (levels: Level[]) => {
    let running = 0
    return levels.map((l) => ({ ...l, total: (running += l.quantity) }))
  }
  const bids = withTotals(view.bids)
  const asks = withTotals(view.asks)
  // The widest bar = the biggest cumulative total on screen (either side)
  const maxTotal = Math.max(bids.at(-1)?.total ?? 0, asks.at(-1)?.total ?? 0)

  // Best prices, spread and mid
  const bestBid = view.bids[0]?.price
  const bestAsk = view.asks[0]?.price
  const spread = bestBid !== undefined && bestAsk !== undefined ? bestAsk - bestBid : undefined
  const mid = spread !== undefined ? (bestAsk! + bestBid!) / 2 : undefined

  const row = (l: Level & { total: number }, side: 'bid' | 'ask') => (
    // relative: the depth bar (absolute) is positioned inside this row
    <div key={l.price} className="relative grid grid-cols-3 px-3 py-0.5 tabular-nums">
      {/* DEPTH BAR: its width is DATA, so it's set with an inline style (Tailwind classes are fixed at build time).
          right-0 = grows from the right edge leftwards, like most exchanges */}
      <div
        className={`absolute inset-y-0 right-0 ${side === 'bid' ? 'bg-up/10' : 'bg-down/10'}`}
        style={{ width: `${(l.total / maxTotal) * 100}%` }}
      />
      {/* "relative" puts the text above the bar */}
      <span className={`relative ${side === 'bid' ? 'text-up' : 'text-down'}`}>{formatTickPrice(l.price, symbol)}</span>
      <span className="relative text-right">{formatQuantity(l.quantity, symbol)}</span>
      <span className="relative text-right text-muted">{formatQuantity(l.total, symbol)}</span>
    </div>
  )

  return (
    <div className="flex h-full flex-col text-xs">
      {/* Column headings */}
      <div className="grid grid-cols-3 px-3 py-1 text-muted">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {view.status !== 'live' ? (
        // While syncing (or if the snapshot failed), show a message instead of a half-built book
        <p className="flex-1 p-4 text-center text-muted">
          {view.status === 'syncing' ? 'Syncing order book…' : 'Could not load the order book. Retrying…'}
        </p>
      ) : (
        // Two equal halves around the spread row. Each half shows as many levels as fit and
        // hides the rest (overflow-hidden), so the spread always stays in the middle.
        <div className="flex min-h-0 flex-1 flex-col">
          {/* ASKS: best (lowest) ask must sit closest to the middle, so we draw them in REVERSE.
              justify-end pushes them to the bottom of their half; if there are too many, the
              ones cut off are at the TOP, the furthest from the market price. */}
          <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
            {[...asks].reverse().map((l) => row(l, 'ask'))}
          </div>

          {/* MIDDLE ROW: mid price and spread */}
          <div className="flex items-baseline justify-between border-y border-border px-3 py-1.5">
            <span className="text-sm font-semibold tabular-nums">{mid !== undefined ? formatTickPrice(mid, symbol) : '—'}</span>
            <span className="text-muted tabular-nums">
              Spread {spread !== undefined ? `${formatTickPrice(spread, symbol)} (${((spread / mid!) * 100).toFixed(3)}%)` : '—'}
            </span>
          </div>

          {/* BIDS: best (highest) bid first, right under the middle */}
          <div className="min-h-0 flex-1 overflow-hidden">{bids.map((l) => row(l, 'bid'))}</div>
        </div>
      )}

      {/* Footer: the sequence number we're at, how many resyncs happened, and the demo button */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5 text-muted">
        <span className="truncate tabular-nums" title="lastUpdateId: the version of the book we hold">
          #{view.lastUpdateId || '—'} · resyncs {view.resyncs}
        </span>
        <button
          type="button"
          onClick={simulateGap}
          className="shrink-0 rounded border border-border px-2 py-0.5 hover:text-text"
          title="Drop the next diff message, as if it were lost: the gap check should notice and resync"
        >
          Simulate gap
        </button>
      </div>
    </div>
  )
}
