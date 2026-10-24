// Watchlist.tsx: the list of coins, with a search box.
// Shows three key React ideas:
//   1. LOCAL STATE (useState): the search text belongs only to this component
//   2. CONTROLLED INPUT: the <input> shows the state, and typing updates the state
//   3. RENDERING LISTS: .map() turns an array of data into an array of rows, each with a `key`
//
// Phase 3: the watchlist no longer receives prices or the selection as props.
// Each row reads its own data from the store, so a price tick doesn't re-render this list.

import { useState } from 'react'
import type { WatchlistItem } from '../config'
import { WatchlistRow } from './WatchlistRow'

type WatchlistProps = {
  items: WatchlistItem[] // which coins to list (names only)
}

export function Watchlist({ items }: WatchlistProps) {
  // useState('') creates a piece of state that starts as an empty string.
  //   search    → the current value
  //   setSearch → the function to change it. Calling it RE-RENDERS this component.
  const [search, setSearch] = useState('')

  // DERIVED DATA: computed from props + state on every render, never stored separately.
  // Keep only coins whose symbol contains the search text (case-insensitive).
  const filtered = items.filter((item) =>
    item.symbol.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    // h-full flex-col: search box on top, scrollable list below
    <div className="flex h-full flex-col">
      {/* ===== Search box (a "controlled input") ===== */}
      <div className="p-2">
        <input
          value={search}                                // input ALWAYS shows the state...
          onChange={(e) => setSearch(e.target.value)}   // ...and every keystroke updates it
          placeholder="Search symbol…"
          className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
      </div>

      {/* ===== Column headings ===== */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 pb-1 text-xs text-muted">
        <span>Pair</span>
        <span>Price</span>
        <span className="w-16 text-right">24h %</span>
      </div>

      {/* ===== The rows (overflow-y-auto = scroll if the list is long) ===== */}
      <div className="flex-1 overflow-y-auto">
        {/* .map(): for each coin, return a <WatchlistRow>.
            key={item.symbol}: a stable, unique id so React can tell which row is which
            when the list changes (don't use the array index for lists that reorder or filter). */}
        {filtered.map((item) => (
          <WatchlistRow key={item.symbol} item={item} />
        ))}

        {/* CONDITIONAL RENDERING: show this message only when nothing matches */}
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-muted">No symbols match "{search}"</p>
        )}
      </div>
    </div>
  )
}
