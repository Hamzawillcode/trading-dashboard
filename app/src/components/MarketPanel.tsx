// MarketPanel.tsx: the middle panel. The live price summary on top, then a switch between
// the candlestick CHART (Phase 4) and the OPTION CHAIN (Phase 7).
//
// The tab choice is local state. This component doesn't subscribe to prices, so ticks never
// re-render it: only SymbolSummary (and the chain, while it's open) re-render on ticks.
//
// CONDITIONAL RENDERING unmounts the hidden view: switching to the option chain removes the
// chart (its WebSocket closes in the effect cleanup), and switching back loads it fresh.

import { useState } from 'react'
import { ChartPanel } from './ChartPanel'
import { OptionChain } from './OptionChain'
import { SymbolSummary } from './SymbolSummary'

type View = 'chart' | 'options'

export function MarketPanel() {
  const [view, setView] = useState<View>('chart')

  const tabs: [View, string][] = [
    ['chart', 'Chart'],
    ['options', 'Option chain'],
  ]

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SymbolSummary />

      {/* ===== Tab bar: the active tab gets a yellow underline ===== */}
      <div className="flex gap-4 border-b border-border text-sm">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={`-mb-px border-b-2 pb-1.5 ${view === id ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ===== The chosen view: fills whatever height is left in the panel (flex-1).
          Virtualization needs a BOUNDED height (in a box that grows to fit its content, every row
          is "visible" and all 201 render). Since Phase 8 the panel is bounded on phones too (it fills
          the screen between header and tab bar), so the same flex-1 works on every size.
          min-h-80 (320px): on a very short screen, keep the chart usable and let the page scroll. ===== */}
      <div className="flex min-h-80 flex-1 flex-col">
        {view === 'chart' ? <ChartPanel /> : <OptionChain />}
      </div>
    </div>
  )
}
