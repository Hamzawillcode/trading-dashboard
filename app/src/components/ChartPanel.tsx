// ChartPanel.tsx: the interval buttons (1m, 5m, 15m...) + the candlestick chart below them.
//
// The chosen interval is LOCAL state (useState), not global store state: nothing outside
// the chart cares about it. Rule of thumb: keep state as close as possible to where it's used,
// and put it in the global store only when several distant components need it.
//
// This is a SIBLING of SymbolSummary (not inside it) on purpose: SymbolSummary re-renders on every
// price tick, and the chart shouldn't be re-rendered by those.

import { useState } from 'react'
import { CHART_INTERVALS } from '../config'
import { useMarketStore } from '../store/marketStore'
import type { ChartInterval } from '../types'
import { CandleChart } from './CandleChart'

export function ChartPanel() {
  const symbol = useMarketStore((s) => s.selectedSymbol)
  // (Named pickInterval, not setInterval, so it doesn't get confused with the browser's setInterval timer)
  const [interval, pickInterval] = useState<ChartInterval>('1m')

  return (
    // flex-col: buttons on top, chart fills the rest. min-h-80 (320px) so it's usable on phones too
    <div className="flex min-h-80 flex-1 flex-col gap-2">
      {/* ===== Interval switcher: a row of toggle buttons ===== */}
      <div className="flex gap-1">
        {CHART_INTERVALS.map((iv) => (
          <button
            key={iv}
            type="button"
            onClick={() => pickInterval(iv)}
            // aria-pressed tells screen readers which button is "on"
            aria-pressed={iv === interval}
            // The active interval gets the yellow accent; the others are grey until hovered
            className={`rounded px-2 py-1 text-xs ${
              iv === interval ? 'bg-accent/15 font-semibold text-accent' : 'text-muted hover:text-text'
            }`}
          >
            {iv}
          </button>
        ))}
      </div>

      {/* ===== The chart. flex-1 = take all remaining height ===== */}
      <div className="flex-1">
        <CandleChart symbol={symbol} interval={interval} />
      </div>
    </div>
  )
}
