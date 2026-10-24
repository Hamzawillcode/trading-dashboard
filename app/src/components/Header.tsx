// Header.tsx: the top bar of the app.
// Phase 3: no props any more. The pieces inside read what they need from the store.

import { useMarketStore } from '../store/marketStore'
import { ConnectionBadge } from './ConnectionBadge'
import { FeedStats } from './FeedStats'

export function Header() {
  // Re-renders only when the selection changes (not on price ticks)
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol)

  return (
    // flex-wrap: on narrow screens the items wrap onto a second line instead of overflowing
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h1 className="text-lg font-bold text-accent">Trading Dashboard</h1>
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-muted">
          Selected: <span className="font-semibold text-text">{selectedSymbol}</span>
        </span>
        <FeedStats />
        <ConnectionBadge />
      </div>
    </header>
  )
}
