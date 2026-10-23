// binanceMessages.ts: understands the raw JSON messages Binance sends us.
// Binance uses short one-letter field names and sends numbers as STRINGS
// (to avoid floating-point precision loss), so we convert them into our clean Ticker type.

import { WATCHLIST } from '../config'
import type { Ticker } from '../types'

// Shape of a Binance "24hrTicker" stream message (only the fields we use).
// Docs: Binance Spot API → WebSocket Streams → "Individual Symbol Ticker Streams"
export type RawTickerMessage = {
  e: '24hrTicker' // event type
  s: string       // symbol, e.g. "BTCUSDT"
  c: string       // last price            (c = "close")
  P: string       // price change percent  (capital P; lowercase p is the absolute change)
  h: string       // 24h high
  l: string       // 24h low
  v: string       // 24h volume in the base coin
}

// TYPE GUARD: a function that checks at runtime "is this really a ticker message?".
// The `msg is RawTickerMessage` return type tells TypeScript: if this returns true,
// treat `msg` as a RawTickerMessage from then on.
export function isTickerMessage(msg: unknown): msg is RawTickerMessage {
  return typeof msg === 'object' && msg !== null && (msg as { e?: string }).e === '24hrTicker'
}

// Quick lookup: "BTCUSDT" → { symbol, base, quote }
const ITEM_BY_SYMBOL = new Map(WATCHLIST.map((item) => [item.symbol, item]))

// Convert a raw Binance message into our Ticker type (strings → numbers, short → readable names)
export function toTicker(raw: RawTickerMessage): Ticker | null {
  const item = ITEM_BY_SYMBOL.get(raw.s)
  if (!item) return null // a symbol we don't track: ignore it
  return {
    ...item, // copies symbol, base, quote
    price: Number(raw.c),
    changePercent: Number(raw.P),
    high: Number(raw.h),
    low: Number(raw.l),
    volume: Number(raw.v),
  }
}

// Stream names Binance expects: lowercase symbol + "@ticker", e.g. "btcusdt@ticker"
export const tickerStream = (symbol: string) => `${symbol.toLowerCase()}@ticker`
