// Header.tsx: the top bar of the app.
// Phase 3: no props any more. The pieces inside read what they need from the store.
// Phase 8: a theme toggle, and on phones the less important bits are hidden to save space.

import { useMarketStore } from '../store/marketStore'
import { ConnectionBadge } from './ConnectionBadge'
import { FeedStats } from './FeedStats'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  // Re-renders only when the selection changes (not on price ticks)
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol)

  return (
    // flex-wrap: on narrow screens the items wrap onto a second line instead of overflowing.
    // pt-[max(...)]: on phones with a notch, push the header below it (safe-area inset), else 12px.
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      {/* MOBILE-FIRST: the short title is the default, the full one appears from sm (640px) up */}
      <h1 className="text-lg font-bold text-accent">
        <span className="sm:hidden">Trading</span>
        <span className="max-sm:hidden">Trading Dashboard</span>
      </h1>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* hidden on phones (the Market screen already shows the coin), visible from md (768px) */}
        <span className="text-sm text-muted max-md:hidden">
          Selected: <span className="font-semibold text-text">{selectedSymbol}</span>
        </span>
        {/* a developer stat: only on large screens */}
        <span className="max-lg:hidden">
          <FeedStats />
        </span>
        <ConnectionBadge />
        <ThemeToggle />
      </div>
    </header>
  )
}
