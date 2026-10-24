// Panel.tsx: a reusable dark "card" with a title.
// It shows COMPOSITION: Panel doesn't know what goes inside it. Whatever we
// put between <Panel> and </Panel> arrives as the special prop `children`.
//
//   <Panel title="Watchlist">
//     <Watchlist ... />      ← this becomes `children`
//   </Panel>

import type { ReactNode } from 'react'

// Props type: what this component accepts from its parent
type PanelProps = {
  title: string
  children?: ReactNode // "?" = optional. ReactNode = anything React can render (elements, text...)
  className?: string   // extra classes from the parent, e.g. where to sit in the page grid (Phase 5)
}

export function Panel({ title, children, className = '' }: PanelProps) {
  return (
    // flex flex-col: stack title and content vertically. min-h-0 lets the inner list scroll.
    <section className={`flex min-h-0 min-w-0 flex-col rounded-lg border border-border bg-panel ${className}`}>
      {/* Title bar of the card */}
      <h2 className="border-b border-border px-3 py-2 text-sm font-semibold text-muted">
        {title}
      </h2>
      {/* The content area: whatever the parent passed in. flex-1 = fill remaining height */}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}
