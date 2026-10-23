// format.ts: small helper functions that turn numbers into nice display text.
// These are "pure functions": same input → same output, with no side effects.
// That makes them easy to test (Phase 9).

// Price: show more decimals for cheap coins (0.5234) and fewer for expensive ones (67,250.50)
export function formatPrice(price: number): string {
  const decimals = price >= 1000 ? 2 : price >= 1 ? 3 : 4
  // toLocaleString adds thousands separators: 67250.5 → "67,250.50"
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// Percent: always show the sign so up and down are obvious: +2.34% / -1.12%
export function formatPercent(pct: number): string {
  const sign = pct > 0 ? '+' : '' // negative numbers already carry a "-"
  return `${sign}${pct.toFixed(2)}%`
}

// Volume: shorten big numbers, e.g. 1,500,000,000 → "1.50B", 254,310 → "254.31K"
export function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`
  return v.toFixed(2)
}
