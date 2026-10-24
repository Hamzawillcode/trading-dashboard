// SymbolSummary.tsx: the big live price + 24h stats of the SELECTED coin, above the chart.
//
// Phase 3: it reads the selection and the live ticker straight from the store,
// so App doesn't need to pass anything down. (In Phase 1 the selection travelled
// Watchlist → App → SymbolSummary; now both just talk to the store.)

import { WATCHLIST } from '../config'
import { useMarketStore } from '../store/marketStore'
import { formatPercent, formatPrice, formatVolume } from '../utils/format'
import { FlashingPrice } from './FlashingPrice'

export function SymbolSummary() {
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol)
  // Re-renders only when the SELECTED coin's ticker changes, not when other coins tick
  const ticker = useMarketStore((s) => s.tickers[s.selectedSymbol])

  // The coin's names. "!" = we know it exists, because the symbol always comes from WATCHLIST.
  const item = WATCHLIST.find((i) => i.symbol === selectedSymbol)!

  // Colour: grey while loading, then green or red
  const color = !ticker ? 'text-muted' : ticker.changePercent >= 0 ? 'text-up' : 'text-down'

  // A small list of [label, value] pairs, rendered with .map() below
  const stats = [
    ['24h High', formatPrice(ticker?.high)],
    ['24h Low', formatPrice(ticker?.low)],
    [`24h Volume (${item.base})`, formatVolume(ticker?.volume)],
  ]

  return (
    // Phase 7: price on the left, stats on the right (they wrap underneath on narrow screens),
    // to leave more height for the chart / option chain below.
    <div className="flex flex-wrap items-end justify-between gap-3">
      {/* ===== Big price display ===== */}
      <div>
        <p className="text-sm text-muted">
          {item.base}/{item.quote}
        </p>
        {/* -mx-1 cancels FlashingPrice's px-1 so the number lines up with the text above */}
        <p className={`-mx-1 text-3xl font-bold ${color}`}>
          <FlashingPrice price={ticker?.price} move={ticker?.move} />
        </p>
        <p className={color}>{ticker ? formatPercent(ticker.changePercent) : 'Waiting for live data…'}</p>
      </div>

      {/* ===== 24h stats: 3 small boxes side by side ===== */}
      <dl className="grid grid-cols-3 gap-2">
        {stats.map(([label, value]) => (
          // label is unique here, so it works as the key
          <div key={label} className="rounded-md border border-border px-3 py-2">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
