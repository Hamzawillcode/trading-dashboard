// WatchlistRow.tsx: ONE row of the watchlist (one coin).
// A "presentational" component: it gets everything via props, keeps no
// state of its own, and only reports clicks back up through onSelect.

import type { Ticker } from '../types'
import { formatPercent, formatPrice } from '../utils/format'

type WatchlistRowProps = {
  ticker: Ticker                      // the data to show
  isSelected: boolean                 // is this the row the user clicked?
  onSelect: (symbol: string) => void  // a FUNCTION from the parent: "call me when clicked"
}

export function WatchlistRow({ ticker, isSelected, onSelect }: WatchlistRowProps) {
  // Pick green or red text depending on whether the price went up or down
  const isUp = ticker.changePercent >= 0
  const changeColor = isUp ? 'text-up' : 'text-down'

  return (
    // A <button> (not a <div>) so it works with the keyboard and screen readers.
    // onClick: when clicked, tell the parent which symbol was chosen.
    <button
      type="button"
      onClick={() => onSelect(ticker.symbol)}
      // Template string builds the class list. The selected row gets a highlighted background.
      className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 text-left text-sm hover:bg-white/5 ${
        isSelected ? 'bg-white/10' : ''
      }`}
    >
      {/* Column 1: coin name, e.g. "BTC /USDT" */}
      <span className="font-medium">
        {ticker.base}
        <span className="text-xs text-muted"> /{ticker.quote}</span>
      </span>

      {/* Column 2: last price. tabular-nums makes all digits the same width so numbers line up */}
      <span className="tabular-nums">{formatPrice(ticker.price)}</span>

      {/* Column 3: 24h change in green/red. w-16 + text-right keeps the column aligned */}
      <span className={`w-16 text-right tabular-nums ${changeColor}`}>
        {formatPercent(ticker.changePercent)}
      </span>
    </button>
  )
}
