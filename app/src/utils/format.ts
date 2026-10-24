// format.ts: small helper functions that turn numbers into nice display text.
// These are "pure functions": same input → same output, with no side effects.
// That makes them easy to test (Phase 9).
// Each accepts `undefined` (data not arrived yet) and then shows a dash "—".

import { SYMBOL_RULES } from '../config'
import { decimalsOf } from '../trading/validation'

const DASH = '—'

// How many decimals a price deserves: more for cheap coins (0.5234), fewer for expensive ones (67,250.50).
// Shared by formatPrice and the chart's price axis (Phase 4).
export function priceDecimals(price: number): number {
  return price >= 1000 ? 2 : price >= 1 ? 3 : 4
}

// Price with thousands separators and the right number of decimals
export function formatPrice(price: number | undefined): string {
  if (price === undefined) return DASH
  const decimals = priceDecimals(price)
  // toLocaleString adds thousands separators: 67250.5 → "67,250.50"
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// Percent: always show the sign so up and down are obvious: +2.34% / -1.12%
export function formatPercent(pct: number | undefined): string {
  if (pct === undefined) return DASH
  const sign = pct > 0 ? '+' : '' // negative numbers already carry a "-"
  return `${sign}${pct.toFixed(2)}%`
}

// Volume: shorten big numbers, e.g. 1,500,000,000 → "1.50B", 254,310 → "254.31K"
export function formatVolume(v: number | undefined): string {
  if (v === undefined) return DASH
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`
  return v.toFixed(2)
}

// ===================== Phase 5: money & quantities =====================

// USDT amounts: always 2 decimals with separators, e.g. 10000 → "10,000.00"
export function formatUsd(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Profit/loss: like formatUsd but with an explicit sign, e.g. "+12.50" / "-3.20"
export function formatSignedUsd(v: number): string {
  const rounded = Math.abs(v) < 0.005 ? 0 : v // so a tiny -0.001 shows as "0.00", not "-0.00"
  return `${rounded > 0 ? '+' : ''}${formatUsd(rounded)}`
}

// Coin quantity with exactly as many decimals as the symbol's step allows,
// e.g. BTC (step 0.00001) → "0.01000", DOGE (step 1) → "250"
export function formatQuantity(q: number, symbol: string): string {
  return q.toFixed(decimalsOf(SYMBOL_RULES[symbol].stepSize))
}

// Green for profit, red for loss, grey for zero (Tailwind classes)
export function pnlColor(v: number): string {
  return v > 0.004 ? 'text-up' : v < -0.004 ? 'text-down' : 'text-muted'
}

// Phase 6: a price with exactly the symbol's tick decimals (order book rows line up neatly),
// e.g. BTC (tick 0.01) → "80,127.56", DOGE (tick 0.00001) → "0.16234"
export function formatTickPrice(price: number, symbol: string): string {
  const d = decimalsOf(SYMBOL_RULES[symbol].tickSize)
  return price.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

// Phase 7: option prices and Greeks. They can be tiny (0.0012) or large (4,512.30), and negative (theta),
// so the decimals depend on the size of the number, ignoring its sign.
export function formatOptionValue(v: number): string {
  const a = Math.abs(v)
  const decimals = a >= 100 ? 2 : a >= 1 ? 3 : 4
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Big counts in short form: 1234 → "1.2K", 999 → "999"
export function formatCompact(n: number): string {
  return n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
}
