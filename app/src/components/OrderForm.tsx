// OrderForm.tsx: the Buy/Sell order ticket in the right panel (simulated, with real exchange rules).
//
// FORM IDEAS in this file:
//   • CONTROLLED INPUTS: every input shows a piece of state, and typing updates that state.
//     React is the "single source of truth" for what's in the form.
//   • Inputs are kept as STRINGS: while typing "0.05" the user passes through "0" and "0.",
//     which aren't useful numbers yet. We convert to numbers only when validating.
//   • VALIDATION is a pure function (trading/validation.ts) run on every render, so errors
//     update live as you type, or as the price moves.
//   • <form onSubmit> + preventDefault(): pressing Enter submits, and the browser doesn't reload the page.
//
// The parent renders <OrderForm key={symbol}>. Changing the key REMOUNTS the form,
// which resets all its state when you pick another coin (no stale quantity from the old coin).

import { useState, type FormEvent, type ReactNode } from 'react'
import { SYMBOL_RULES, WATCHLIST } from '../config'
import { useMarketStore } from '../store/marketStore'
import { availableCash, availableQuantity, useTradingStore, type PlaceResult } from '../store/tradingStore'
import { floorToStep, validateOrder } from '../trading/validation'
import type { OrderType, Side } from '../types'
import { formatPrice, formatQuantity, formatUsd } from '../utils/format'

const PERCENTS = [25, 50, 75, 100] // the quick-fill buttons under the quantity box

// Only allow typing digits and at most one dot (a "decimal" text input).
// We use type="text" instead of type="number": number inputs allow "e", change value
// when you scroll over them, and are hard to style consistently.
const DECIMAL = /^\d*\.?\d*$/

type Props = { symbol: string }

export function OrderForm({ symbol }: Props) {
  // ----- Form state (all local: nothing else in the app needs it) -----
  const [side, setSide] = useState<Side>('BUY')
  const [type, setType] = useState<OrderType>('MARKET')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitted, setSubmitted] = useState(false) // show "empty field" errors only after a submit attempt
  const [result, setResult] = useState<PlaceResult | null>(null) // message after placing

  // ----- Data from the stores (each selector returns a number, so it re-renders only when it changes) -----
  const marketPrice = useMarketStore((s) => s.tickers[symbol]?.price)
  const cash = useTradingStore(availableCash) // a function of the state works directly as a selector
  const held = useTradingStore((s) => availableQuantity(s, symbol))
  const placeOrder = useTradingStore((s) => s.placeOrder)

  const rules = SYMBOL_RULES[symbol]
  const item = WATCHLIST.find((i) => i.symbol === symbol)!

  // DERIVED: validated on every render. No separate "errors" state that could get out of sync.
  const check = validateOrder(
    { symbol, side, type, price, quantity },
    { rules, marketPrice, availableCash: cash, availableQuantity: held },
  )
  // Show a field's error once the user has typed in it, or after they tried to submit
  const showError = (value: string) => value !== '' || submitted

  // Switching to LIMIT pre-fills the price box with the current price (rounded to a valid tick)
  function chooseType(t: OrderType) {
    setType(t)
    if (t === 'LIMIT' && price === '' && marketPrice) setPrice(floorToStep(marketPrice, rules.tickSize))
  }

  // 25% / 50% / ... of what you can afford (BUY) or of what you hold (SELL)
  function fillPercent(pct: number) {
    const p = type === 'LIMIT' ? Number(price) : marketPrice
    const max = side === 'BUY' ? (p ? cash / p : 0) : held
    setQuantity(floorToStep((max * pct) / 100, rules.stepSize))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault() // stop the browser's default "submit = reload the page"
    setSubmitted(true)
    if (!check.valid) return
    const res = placeOrder({ symbol, side, type, price, quantity })
    setResult(res)
    if (res.ok) {
      setQuantity('') // clear for the next order, and hide the "Enter a quantity" error again
      setSubmitted(false)
    }
  }

  const isBuy = side === 'BUY'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-3 text-sm">
      {/* ===== Buy / Sell tabs: green or red when active ===== */}
      <div className="grid grid-cols-2 gap-1 rounded-md bg-bg p-1">
        {(['BUY', 'SELL'] as const).map((s) => (
          <button
            key={s}
            type="button" // type="button" so clicking it does NOT submit the form
            onClick={() => setSide(s)}
            aria-pressed={side === s}
            className={`rounded py-1.5 font-semibold ${
              side === s ? (s === 'BUY' ? 'bg-up text-bg' : 'bg-down text-bg') : 'text-muted hover:text-text'
            }`}
          >
            {s === 'BUY' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>

      {/* ===== Market / Limit toggle ===== */}
      <div className="flex gap-3 text-xs">
        {(['MARKET', 'LIMIT'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => chooseType(t)}
            aria-pressed={type === t}
            className={type === t ? 'font-semibold text-accent' : 'text-muted hover:text-text'}
          >
            {t === 'MARKET' ? 'Market' : 'Limit'}
          </button>
        ))}
      </div>

      {/* ===== Price: an input for LIMIT; for MARKET just show the live price (read-only) ===== */}
      {type === 'LIMIT' ? (
        <Field label="Price" unit={item.quote} error={showError(price) ? check.errors.price : undefined}>
          <input
            name="price" // a name identifies the field (for autofill, forms and accessibility tools)
            value={price}
            inputMode="decimal" // phones show the number keyboard
            onChange={(e) => DECIMAL.test(e.target.value) && setPrice(e.target.value)}
            placeholder={formatPrice(marketPrice)}
            className={INPUT}
          />
        </Field>
      ) : (
        <div className="flex justify-between rounded-md border border-border px-2 py-1.5 text-muted">
          <span>Price</span>
          <span className="tabular-nums">Market ≈ {formatPrice(marketPrice)}</span>
        </div>
      )}

      {/* ===== Quantity + quick % buttons ===== */}
      <Field label="Quantity" unit={item.base} error={showError(quantity) ? check.errors.quantity : undefined}>
        <input
          name="quantity"
          value={quantity}
          inputMode="decimal"
          onChange={(e) => DECIMAL.test(e.target.value) && setQuantity(e.target.value)}
          placeholder={`Min ${rules.minQty}`}
          className={INPUT}
        />
      </Field>
      <div className="grid grid-cols-4 gap-1">
        {PERCENTS.map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => fillPercent(pct)}
            className="rounded border border-border py-1 text-xs text-muted hover:text-text"
          >
            {pct}%
          </button>
        ))}
      </div>

      {/* ===== Order value + what you have available ===== */}
      <dl className="space-y-1 text-xs">
        <div className="flex justify-between">
          <dt className="text-muted">Total</dt>
          <dd className="tabular-nums">
            {Number.isFinite(check.notional) && check.notional > 0 ? `${formatUsd(check.notional)} USDT` : '—'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Available</dt>
          <dd className="tabular-nums">
            {isBuy ? `${formatUsd(cash)} USDT` : `${formatQuantity(held, symbol)} ${item.base}`}
          </dd>
        </div>
      </dl>
      {/* The "total" error (min order value / not enough cash) shows under the totals */}
      {check.errors.total && (showError(quantity) || submitted) && (
        <p className="text-xs text-down">{check.errors.total}</p>
      )}

      {/* ===== Submit: type="submit", so pressing Enter in an input triggers it too ===== */}
      <button
        type="submit"
        className={`rounded-md py-2 font-semibold text-bg ${isBuy ? 'bg-up' : 'bg-down'} hover:opacity-90`}
      >
        {isBuy ? 'Buy' : 'Sell'} {item.base}
      </button>

      {/* Result of the last order (green = placed/filled, red = rejected by the "exchange") */}
      {result && (
        <p role="status" className={`text-xs ${result.ok ? 'text-up' : 'text-down'}`}>
          {result.message}
        </p>
      )}
    </form>
  )
}

// Shared input style: dark box, yellow border when focused. text-right: numbers line up on the right
const INPUT = 'w-full bg-transparent text-right tabular-nums outline-none'

// A small helper component: label on the left, input in the middle, unit on the right, error below.
// <label> wraps the input, so clicking the label focuses the input (and screen readers link them).
function Field(props: { label: string; unit: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label
        className={`flex items-center gap-2 rounded-md border bg-bg px-2 py-1.5 focus-within:border-accent ${
          props.error ? 'border-down' : 'border-border'
        }`}
      >
        <span className="text-muted">{props.label}</span>
        {props.children}
        <span className="text-xs text-muted">{props.unit}</span>
      </label>
      {props.error && <p className="mt-1 text-xs text-down">{props.error}</p>}
    </div>
  )
}
