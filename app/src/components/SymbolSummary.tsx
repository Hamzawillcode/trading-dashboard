// SymbolSummary.tsx: shows details of the SELECTED coin in the middle panel.
// It's a placeholder until the real candlestick chart arrives in Phase 4.
// It proves that the selection made in the Watchlist reaches a SIBLING component
// (they share state through their common parent, App).

import type { WatchlistItem } from '../config'
import type { Ticker } from '../types'
import { formatPercent, formatPrice, formatVolume } from '../utils/format'

type SymbolSummaryProps = {
  item: WatchlistItem
  ticker: Ticker | undefined // undefined until live data arrives
}

export function SymbolSummary({ item, ticker }: SymbolSummaryProps) {
  // Colour: grey while loading, then green or red
  const color = !ticker ? 'text-muted' : ticker.changePercent >= 0 ? 'text-up' : 'text-down'

  // A small list of [label, value] pairs, rendered with .map() below
  const stats = [
    ['24h High', formatPrice(ticker?.high)],
    ['24h Low', formatPrice(ticker?.low)],
    [`24h Volume (${item.base})`, formatVolume(ticker?.volume)],
  ]

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      {/* ===== Big price display ===== */}
      <div>
        <p className="text-sm text-muted">
          {item.base}/{item.quote}
        </p>
        <p className={`text-3xl font-bold tabular-nums ${color}`}>{formatPrice(ticker?.price)}</p>
        <p className={color}>{ticker ? formatPercent(ticker.changePercent) : 'Waiting for live data…'}</p>
      </div>

      {/* ===== 24h stats in a 3-column grid (stacks to 1 column on phones) ===== */}
      <dl className="grid gap-3 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          // label is unique here, so it works as the key
          <div key={label} className="rounded-md border border-border p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {/* ===== Placeholder for the chart ===== */}
      <div className="flex min-h-40 flex-1 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted">
        Candlestick chart comes in Phase 4
      </div>
    </div>
  )
}
