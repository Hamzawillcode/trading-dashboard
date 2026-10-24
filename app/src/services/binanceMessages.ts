// binanceMessages.ts: understands the raw JSON messages Binance sends us.
// Binance uses short one-letter field names and sends numbers as STRINGS
// (to avoid floating-point precision loss), so we convert them into our clean Ticker type.

import { WATCHLIST } from '../config'
import type { Candle, DepthDiff, DepthSnapshot, Ticker } from '../types'

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

// ===================== CANDLES (Phase 4) =====================

// Binance sends times in UTC, and the chart library draws whatever time we give it AS IS.
// To show the user's LOCAL time on the axis, we shift every timestamp by the timezone offset.
// getTimezoneOffset() is in minutes and NEGATIVE east of UTC (India = -330), so we subtract it.
const TZ_OFFSET_SEC = new Date().getTimezoneOffset() * 60
const toChartTime = (ms: number) => ms / 1000 - TZ_OFFSET_SEC

// Shape of a "kline" (= candle) stream message. Docs: "Kline/Candlestick Streams".
// Binance pushes the CURRENT, still-forming candle every ~2 seconds, and x=true when it closes.
export type RawKlineMessage = {
  e: 'kline'
  s: string // symbol
  k: {
    t: number  // candle open time (ms)
    i: string  // interval, e.g. "1m"
    o: string  // open
    h: string  // high
    l: string  // low
    c: string  // close (= the latest price while the candle is still forming)
    x: boolean // is this candle finished?
  }
}

export function isKlineMessage(msg: unknown): msg is RawKlineMessage {
  return typeof msg === 'object' && msg !== null && (msg as { e?: string }).e === 'kline'
}

export function klineToCandle({ k }: RawKlineMessage): Candle {
  return { time: toChartTime(k.t), open: Number(k.o), high: Number(k.h), low: Number(k.l), close: Number(k.c) }
}

// The REST endpoint returns each candle as an ARRAY, not an object (it's smaller to send):
//   [openTime, "open", "high", "low", "close", "volume", closeTime, ...]
export type RawKlineRow = [number, string, string, string, string, ...unknown[]]

// Array destructuring picks out the positions we need
export function restRowToCandle([t, o, h, l, c]: RawKlineRow): Candle {
  return { time: toChartTime(t), open: Number(o), high: Number(h), low: Number(l), close: Number(c) }
}

// Stream name for live candles, e.g. "btcusdt@kline_1m"
export const klineStream = (symbol: string, interval: string) =>
  `${symbol.toLowerCase()}@kline_${interval}`

// ===================== ORDER BOOK (Phase 6) =====================

// "[price, qty]" string pairs → number pairs
const toPairs = (rows: [string, string][]): [number, number][] =>
  rows.map(([p, q]) => [Number(p), Number(q)])

// REST GET /api/v3/depth answer
export type RawDepthSnapshot = {
  lastUpdateId: number
  bids: [string, string][]
  asks: [string, string][]
}

export function toDepthSnapshot(raw: RawDepthSnapshot): DepthSnapshot {
  return { lastUpdateId: raw.lastUpdateId, bids: toPairs(raw.bids), asks: toPairs(raw.asks) }
}

// WebSocket "<symbol>@depth@100ms" message (Docs: "Diff. Depth Stream").
// Every 100ms: all the levels that CHANGED, and the range of update ids they cover.
export type RawDepthMessage = {
  e: 'depthUpdate'
  s: string            // symbol
  U: number            // first update id in this message
  u: number            // final update id in this message
  b: [string, string][] // changed bids [price, new quantity]
  a: [string, string][] // changed asks
}

export function isDepthMessage(msg: unknown): msg is RawDepthMessage {
  return typeof msg === 'object' && msg !== null && (msg as { e?: string }).e === 'depthUpdate'
}

export function toDepthDiff(raw: RawDepthMessage): DepthDiff {
  return { firstUpdateId: raw.U, finalUpdateId: raw.u, bids: toPairs(raw.b), asks: toPairs(raw.a) }
}

// Stream name, e.g. "btcusdt@depth@100ms" (diffs pushed every 100ms)
export const depthStream = (symbol: string) => `${symbol.toLowerCase()}@depth@100ms`
