// format.ts: small helper functions that turn numbers into nice display text.
// These are "pure functions": same input → same output, with no side effects.
// That makes them easy to test (Phase 9).
// Each accepts `undefined` (data not arrived yet) and then shows a dash "—".

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
