// MobileNav.tsx: the bottom tab bar on phones and tablets (Phase 8).
//
// A phone can't fit 5 panels side by side, and stacking them all makes one very long page.
// So below the lg breakpoint (1024px) we show ONE screen at a time and switch with these tabs,
// the way the Binance / Robinhood apps do. From lg up this bar is hidden and every panel is shown.
//
// Why at the BOTTOM: that's where your thumb is when you hold a phone one-handed.

import type { ReactNode } from 'react'
import { useUiStore, type MobileTab } from '../store/uiStore'

// Each tab: id, label, and a small SVG icon (24×24 drawing area, stroked with the text colour)
const TABS: { id: MobileTab; label: string; icon: ReactNode }[] = [
  { id: 'markets', label: 'Markets', icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
  { id: 'chart', label: 'Chart', icon: <path d="M3 17l5-5 4 4 8-9M14 7h6v6" /> },
  { id: 'trade', label: 'Trade', icon: <path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" /> },
  { id: 'portfolio', label: 'Portfolio', icon: <path d="M4 8h16v11H4zM9 8V5h6v3M4 13h16" /> },
]

export function MobileNav() {
  const mobileTab = useUiStore((s) => s.mobileTab)
  const showTab = useUiStore((s) => s.showTab)

  return (
    // lg:hidden: only on screens under 1024px.
    // grid-cols-4: four equal-width tabs. bg-panel + border-t: a bar that sits above the content.
    // pb-[env(safe-area-inset-bottom)]: on iPhones, keep the tabs above the home-indicator bar.
    <nav
      aria-label="Screens"
      className="grid shrink-0 grid-cols-4 border-t border-border bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.id === mobileTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => showTab(tab.id)}
            // aria-current tells screen readers "this is the screen you're on"
            aria-current={active ? 'page' : undefined}
            // h-14 = 56px tall: comfortably above the ~44–48px minimum touch-target size.
            // Active tab: yellow; others: grey.
            className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? 'text-accent' : 'text-muted'}`}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {tab.icon}
            </svg>
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
