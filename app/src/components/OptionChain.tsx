// OptionChain.tsx: a 201-strike option chain, priced LIVE from the spot price with Black–Scholes.
//
//      CALLS                          │ STRIKE │                           PUTS
//   OI   IV   Delta  Theta  Price     │ 80,000 │    Price  Theta  Delta   IV   OI
//
// PERFORMANCE, the point of this phase:
//   201 rows × 11–15 cells ≈ 3,000 DOM elements, all recalculated on every price tick.
//   VIRTUALIZATION (react-window) renders ONLY the ~15 rows you can see (+ a few spare).
//   As you scroll, the same few row elements are reused for different strikes.
//   So each tick reprices and re-renders ~20 rows, not 201.
//
//   Plus:
//   • useMemo: the strike table (IV/OI) is rebuilt only when the expiry changes, not on every tick
//   • React.memo: the column header doesn't re-render on ticks (its props don't change)
//   • react-window itself wraps each row in React.memo, and compares rowProps value by value

import { memo, useMemo, useState } from 'react'
import { List, useListRef, type RowComponentProps } from 'react-window'
import { MODEL_VOL } from '../config'
import { useNow } from '../hooks/useNow'
import { useMarketStore } from '../store/marketStore'
import { priceOption, type OptionQuote } from '../trading/blackScholes'
import { buildStrikes, upcomingExpiries, YEAR_MS, type StrikeRow } from '../trading/optionChain'
import { formatCompact, formatOptionValue, formatPrice, formatTickPrice } from '../utils/format'

const ROW_HEIGHT = 24 // px. react-window needs to know row heights to work out which rows are visible
const COL_WIDTH = 64  // px, minimum width of each data column
const STRIKE_WIDTH = 96

// ===================== Column definitions, as DATA =====================
// Each column knows how to show its CALL value and its PUT value. The table is built by
// looping over this list, so adding a column is one line, not edits in 3 places.
type Column = {
  label: string
  extra?: boolean // only shown when "Γ & Vega" is ticked
  call: (q: OptionQuote, r: StrikeRow) => string
  put: (q: OptionQuote, r: StrikeRow) => string
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`

const COLUMNS: Column[] = [
  { label: 'OI', call: (_, r) => formatCompact(r.callOi), put: (_, r) => formatCompact(r.putOi) },
  { label: 'IV', call: (_, r) => pct(r.iv), put: (_, r) => pct(r.iv) },
  { label: 'Delta', call: (q) => q.callDelta.toFixed(3), put: (q) => q.putDelta.toFixed(3) },
  // Gamma is tiny for high-priced coins (BTC ≈ 0.00002), so show 2 significant digits
  { label: 'Gamma', extra: true, call: (q) => q.gamma.toPrecision(2), put: (q) => q.gamma.toPrecision(2) },
  { label: 'Theta', call: (q) => formatOptionValue(q.callTheta), put: (q) => formatOptionValue(q.putTheta) },
  { label: 'Vega', extra: true, call: (q) => formatOptionValue(q.vega), put: (q) => formatOptionValue(q.vega) },
  { label: 'Price', call: (q) => formatOptionValue(q.callPrice), put: (q) => formatOptionValue(q.putPrice) },
]

// The CSS grid shape of every row: N call columns | strike | N put columns.
// It depends on how many columns are shown, so it's a function (used as an inline style).
const gridTemplate = (n: number) =>
  `repeat(${n}, minmax(${COL_WIDTH}px, 1fr)) ${STRIKE_WIDTH}px repeat(${n}, minmax(${COL_WIDTH}px, 1fr))`

// ===================== The panel =====================

export function OptionChain() {
  const symbol = useMarketStore((s) => s.selectedSymbol)
  const spot = useMarketStore((s) => s.tickers[s.selectedSymbol]?.price)

  if (spot === undefined) {
    return <p className="p-4 text-center text-sm text-muted">Waiting for a live price…</p>
  }
  // key={symbol}: a new coin remounts the chain, so strikes are rebuilt around the new coin's price
  return <ChainTable key={symbol} symbol={symbol} spot={spot} />
}

function ChainTable({ symbol, spot }: { symbol: string; spot: number }) {
  // The ANCHOR is the spot price when the chain opened. Strikes are built around it and then stay
  // FIXED, so rows don't shift under your eyes as the price moves (only the prices inside them change).
  // useState(initialValue) only uses the value on the FIRST render, which is exactly what we want.
  const [anchor] = useState(spot)
  const [expiries] = useState(() => upcomingExpiries()) // a function: computed once, on mount
  const [expiry, setExpiry] = useState(expiries[1])
  const [showExtra, setShowExtra] = useState(false)
  const listRef = useListRef(null) // lets us call listRef.current.scrollToRow(...)
  const now = useNow(60_000) // the clock, refreshed every minute (time decay doesn't need more)

  // useMemo: "remember this result until one of the dependencies changes".
  // Building 201 rows of IV/OI doesn't depend on the live price, so don't redo it every tick.
  const rows = useMemo(() => buildStrikes(anchor, MODEL_VOL[symbol], expiry), [anchor, symbol, expiry])

  // Same idea: the visible column list only changes when the checkbox changes.
  // Keeping it the SAME array object between renders also lets memo(ChainHeader) skip re-rendering.
  const columns = useMemo(() => COLUMNS.filter((c) => showExtra || !c.extra), [showExtra])

  // Time to expiry in YEARS. Shrinks as `now` advances, so time decay (theta) is live too.
  const T = Math.max(0, (expiry.time - now) / YEAR_MS)
  const days = T * 365

  // ATM = the strike closest to the live spot price
  const atmIndex = rows.reduce(
    (best, r, i) => (Math.abs(r.strike - spot) < Math.abs(rows[best].strike - spot) ? i : best),
    0,
  )
  const scrollToAtm = () => listRef.current?.scrollToRow({ index: atmIndex, align: 'center', behavior: 'smooth' })

  const template = gridTemplate(columns.length)
  const minWidth = columns.length * 2 * COL_WIDTH + STRIKE_WIDTH

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      {/* ===== Controls: expiry buttons, info, toggles ===== */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-1">
          {expiries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setExpiry(e)}
              aria-pressed={e.id === expiry.id}
              className={`rounded px-2 py-1 ${e.id === expiry.id ? 'bg-accent/15 font-semibold text-accent' : 'text-muted hover:text-text'}`}
            >
              {e.label}
            </button>
          ))}
        </div>
        <span className="text-muted">
          {days.toFixed(1)} days · ATM IV {pct(rows[atmIndex].iv)} · spot <span className="text-text tabular-nums">{formatPrice(spot)}</span>
        </span>
        {/* ml-auto pushes this group to the right end of the row */}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1 text-muted">
            {/* A checkbox is a controlled input too: `checked` shows state, onChange updates it */}
            <input type="checkbox" checked={showExtra} onChange={(e) => setShowExtra(e.target.checked)} className="accent-accent" />
            Γ &amp; Vega
          </label>
          <button type="button" onClick={scrollToAtm} className="rounded border border-border px-2 py-0.5 text-muted hover:text-text">
            ATM
          </button>
        </div>
      </div>

      {/* ===== The table. overflow-x-auto: on narrow screens, scroll sideways instead of squashing ===== */}
      <div className="min-h-0 flex-1 overflow-x-auto rounded-md border border-border">
        {/* min-width keeps every column readable; flex-col so the list fills the height under the header */}
        <div className="flex h-full flex-col" style={{ minWidth }}>
          <ChainHeader columns={columns} template={template} />
          {/* THE VIRTUALIZED LIST: it measures its own height, works out which rows are visible
              from the scroll position, and renders only those (+ overscanCount spare rows above/below). */}
          <List
            listRef={listRef}
            rowComponent={ChainRow}
            rowCount={rows.length}
            rowHeight={ROW_HEIGHT}
            rowProps={{ rows, spot, T, columns, template, atmIndex, symbol }}
            overscanCount={5}
            // Start scrolled so the ATM strike is in view (≈ 6 rows below the top)
            defaultScrollOffset={Math.max(0, (atmIndex - 6) * ROW_HEIGHT)}
            className="min-h-0 flex-1"
          />
        </div>
      </div>

      <p className="text-muted">
        Prices &amp; Greeks: Black–Scholes on the live spot price (r = 0). IV and OI are modelled, not exchange data.
      </p>
    </div>
  )
}

// ===================== Header (memoized) =====================
// memo(): re-render ONLY if `columns` or `template` change. The parent re-renders on every tick,
// but these props are the same objects each time (thanks to useMemo), so this is skipped.
const ChainHeader = memo(function ChainHeader({ columns, template }: { columns: Column[]; template: string }) {
  return (
    <div className="grid border-b border-border bg-panel py-1 text-muted" style={{ gridTemplateColumns: template }}>
      {columns.map((c) => (
        <span key={`c-${c.label}`} className="px-2 text-right">{c.label}</span>
      ))}
      <span className="text-center font-semibold text-text">Strike</span>
      {/* Puts mirror the calls: the same columns in REVERSE order, so "Price" sits next to the strike on both sides */}
      {[...columns].reverse().map((c) => (
        <span key={`p-${c.label}`} className="px-2 text-left">{c.label}</span>
      ))}
    </div>
  )
})

// ===================== One row (rendered by react-window) =====================

type RowProps = {
  rows: StrikeRow[]
  spot: number
  T: number
  columns: Column[]
  template: string
  atmIndex: number
  symbol: string
}

// react-window calls this for each VISIBLE row, passing `index` (which strike) and `style`
// (the absolute position: top = index × 24px). We MUST apply that style, or rows would stack up.
function ChainRow({ index, style, ariaAttributes, rows, spot, T, columns, template, atmIndex, symbol }: RowComponentProps<RowProps>) {
  const r = rows[index]
  // Black–Scholes runs HERE, for visible rows only: ~20 calculations per tick instead of 201
  const q = priceOption({ S: spot, K: r.strike, T, sigma: r.iv })

  // IN THE MONEY: a call is ITM when strike < spot (you could buy below the market), a put when strike > spot.
  // We shade the ITM side, like most exchanges do.
  const callItm = r.strike < spot
  const putItm = r.strike > spot
  const isAtm = index === atmIndex

  return (
    <div
      {...ariaAttributes}
      // style from react-window (position) + our grid layout, merged into one object
      style={{ ...style, gridTemplateColumns: template }}
      className={`grid items-center tabular-nums hover:bg-hover ${isAtm ? 'border-y border-accent/40' : ''}`}
    >
      {columns.map((c) => (
        <span key={`c-${c.label}`} className={`h-full px-2 text-right leading-6 ${callItm ? 'bg-up/5' : ''}`}>
          {c.call(q, r)}
        </span>
      ))}
      <span className={`h-full text-center font-semibold leading-6 ${isAtm ? 'bg-accent/15 text-accent' : 'bg-bg/60'}`}>
        {formatTickPrice(r.strike, symbol)}
      </span>
      {[...columns].reverse().map((c) => (
        <span key={`p-${c.label}`} className={`h-full px-2 text-left leading-6 ${putItm ? 'bg-down/5' : ''}`}>
          {c.put(q, r)}
        </span>
      ))}
    </div>
  )
}
