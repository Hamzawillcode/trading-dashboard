// WatchlistRow.tsx: ONE row of the watchlist (one coin).
//
// Phase 3: the row now reads its OWN live data from the store, instead of getting it
// as props from App. With selectors, a BTC tick re-renders the BTC row only, and the
// other 7 rows don't re-render.
//
// It's also wrapped in React.memo: when the PARENT (Watchlist) re-renders, e.g. while
// you type in the search box, memo skips re-rendering a row whose props haven't changed.

import { memo } from 'react'
import type { WatchlistItem } from '../config'
import { useMarketStore } from '../store/marketStore'
import { formatPercent } from '../utils/format'
import { FlashingPrice } from './FlashingPrice'

type WatchlistRowProps = {
  item: WatchlistItem // the coin's name. It comes from the constant WATCHLIST array, so it never changes
}

// memo(Component): "only re-render if my props changed (shallow compare)".
// Re-renders caused by the row's OWN store subscriptions still happen, and that's what we want.
export const WatchlistRow = memo(function WatchlistRow({ item }: WatchlistRowProps) {
  // SELECTORS: each picks one small slice of the store.
  // The row re-renders only if what its selector returns is different from last time.
  const ticker = useMarketStore((s) => s.tickers[item.symbol])
  // Returns a boolean, so only 2 rows re-render when the selection changes (the old one and the new one)
  const isSelected = useMarketStore((s) => s.selectedSymbol === item.symbol)
  // Actions never change, so selecting one never causes a re-render
  const selectSymbol = useMarketStore((s) => s.selectSymbol)

  // Green or red text for the 24h change. "?." = don't crash if ticker is still undefined
  const change = ticker?.changePercent
  const changeColor = change === undefined ? 'text-muted' : change >= 0 ? 'text-up' : 'text-down'

  return (
    // A <button> (not a <div>) so it works with the keyboard and screen readers.
    <button
      type="button"
      onClick={() => selectSymbol(item.symbol)}
      // The selected row gets a highlighted background
      className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 text-left text-sm hover:bg-white/5 ${
        isSelected ? 'bg-white/10' : ''
      }`}
    >
      {/* Column 1: coin name, e.g. "BTC /USDT" */}
      <span className="font-medium">
        {item.base}
        <span className="text-xs text-muted"> /{item.quote}</span>
      </span>

      {/* Column 2: last price, flashing green/red on each change */}
      <FlashingPrice price={ticker?.price} move={ticker?.move} />

      {/* Column 3: 24h change in green/red. w-16 + text-right keeps the column aligned */}
      <span className={`w-16 text-right tabular-nums ${changeColor}`}>{formatPercent(change)}</span>
    </button>
  )
})
