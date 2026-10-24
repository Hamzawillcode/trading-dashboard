// Screen.tsx: one "screen" of the mobile layout, and one grid area of the desktop layout (Phase 8).
//
//   Phones/tablets (under lg = 1024px): visible ONLY when its tab is the active one in the bottom bar.
//   Large screens: ALWAYS visible (every panel side by side).
//
// HOW IT HIDES: with CSS (max-lg:hidden = display:none below 1024px), not by unmounting.
// The hidden panels stay mounted, so they keep their state (a half-typed order, the chart's
// history, the order book's sync) and switching tabs is instant. The cost: their live data
// keeps updating in the background. (Conditional rendering {active && ...} would be the opposite
// trade-off: it saves that work, but loses the state and reloads on every tab switch.)
//
// WHY A SEPARATE COMPONENT: it subscribes to `mobileTab` itself, so a tab switch re-renders only
// the Screens, not App. App still subscribes to nothing.

import type { ReactNode } from 'react'
import { useUiStore, type MobileTab } from '../store/uiStore'

type ScreenProps = {
  tab: MobileTab
  className?: string // grid placement on large screens, e.g. lg:row-span-2
  children: ReactNode
}

export function Screen({ tab, className = '', children }: ScreenProps) {
  // A boolean selector: a tab switch re-renders only the 2 Screens whose answer changed
  const active = useUiStore((s) => s.mobileTab === tab)

  return (
    // flex-col + min-h-0: the panel(s) inside fill this area and scroll internally.
    // max-lg:hidden only when inactive. It's a VARIANT class, so it beats the plain `flex`
    // (Tailwind outputs variants after base utilities), and from lg up it does nothing.
    <div className={`flex min-h-0 min-w-0 flex-col ${active ? '' : 'max-lg:hidden'} ${className}`}>
      {children}
    </div>
  )
}
