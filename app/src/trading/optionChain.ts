// optionChain.ts: builds the ROWS of an option chain (expiries, strikes, IV, open interest).
// Pure functions. The PRICES and Greeks are computed later, live, with Black–Scholes.
//
// WHAT'S REAL vs MODELLED (be honest about this in interviews):
//   REAL:      the spot price (live from Binance), the Black–Scholes maths, the Greeks
//   MODELLED:  implied volatility (a typical "smile" shape) and open interest (a typical bell shape).
//              A real chain would get both from an options exchange (e.g. Deribit's API).

import { STRIKES_EACH_SIDE } from '../config'

export type Expiry = {
  id: string    // e.g. "2026-10-30"
  time: number  // expiry moment in ms
  label: string // e.g. "30 Oct"
}

export type StrikeRow = {
  strike: number
  iv: number     // implied volatility for this strike (0.55 = 55%)
  callOi: number // open interest: how many call contracts are currently open
  putOi: number
}

const DAY_MS = 24 * 60 * 60 * 1000
export const YEAR_MS = 365 * DAY_MS

// Crypto options usually expire on FRIDAYS at 08:00 UTC. We offer: the next 4 Fridays,
// then roughly 2, 3 and 6 months out.
export function upcomingExpiries(now = Date.now()): Expiry[] {
  const d = new Date(now)
  // Next Friday 08:00 UTC. getUTCDay(): 0 = Sunday ... 5 = Friday
  const first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7), 8)
  const start = first > now ? first : first + 7 * DAY_MS // already past this Friday's 08:00 → next week

  return [0, 1, 2, 3, 8, 12, 26].map((weeks) => {
    const time = start + weeks * 7 * DAY_MS
    return {
      id: new Date(time).toISOString().slice(0, 10),
      time,
      label: new Date(time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    }
  })
}

// A "nice" gap between strikes, about 0.5% of the spot price: 1, 2, 2.5 or 5 × a power of 10.
// e.g. BTC at 80,000 → 500, ETH at 3,000 → 20, DOGE at 0.16 → 0.001
export function strikeStep(spot: number): number {
  const raw = spot * 0.005
  const power = 10 ** Math.floor(Math.log10(raw))
  const nice = [1, 2, 2.5, 5, 10].find((m) => m * power >= raw)!
  return nice * power
}

// A deterministic "random" number in [0, 1) from a seed: the same strike always gets the same OI,
// so the numbers don't jump around on every render.
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// Build the rows around `anchor` (the spot price when the chain was opened).
export function buildStrikes(anchor: number, atmVol: number, expiry: Expiry): StrikeRow[] {
  const step = strikeStep(anchor)
  const center = Math.round(anchor / step) * step
  const rows: StrikeRow[] = []

  for (let i = -STRIKES_EACH_SIDE; i <= STRIKES_EACH_SIDE; i++) {
    const strike = Number((center + i * step).toFixed(10)) // toFixed: remove float noise (0.1 + 0.2...)
    if (strike <= 0) continue

    // MONEYNESS: how far the strike is from spot, on a log scale. 0 = at the money.
    const m = Math.log(strike / anchor)

    // VOLATILITY SMILE: real markets price far-away strikes with HIGHER IV than ATM (crash/moon
    // insurance costs more), so IV plotted against strike looks like a smile. The −0.08·m term
    // adds "skew": downside puts a bit pricier than upside calls.
    const iv = Math.max(0.05, atmVol + 0.6 * m * m - 0.08 * m)

    // OPEN INTEREST: most contracts sit near the money, with extra at round-number strikes.
    // Calls cluster a bit above spot, puts a bit below.
    const round = Math.abs(strike / (step * 10) - Math.round(strike / (step * 10))) < 1e-9 ? 2.5 : 1
    const seed = strike + expiry.time / DAY_MS
    const bell = (shift: number) => Math.exp(-(((m - shift) / 0.12) ** 2))
    rows.push({
      strike,
      iv,
      callOi: Math.round((50 + 4000 * bell(0.04) * round) * (0.6 + 0.8 * noise(seed))),
      putOi: Math.round((50 + 4000 * bell(-0.04) * round) * (0.6 + 0.8 * noise(seed + 1))),
    })
  }
  return rows
}
