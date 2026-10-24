// types.ts: TypeScript "shapes" of the data our app uses.
// A type has no effect when the app runs. It only lets TypeScript warn us
// if we, for example, misspell a field or put text where a number should be.

import type { CHART_INTERVALS, WatchlistItem } from './config'

// The latest market info for one trading pair.
// "WatchlistItem & {...}" = all fields of WatchlistItem (symbol, base, quote) PLUS these:
export type Ticker = WatchlistItem & {
  price: number         // last traded price
  changePercent: number // % change over the last 24 hours (negative = fell)
  high: number          // highest price in the last 24h
  low: number           // lowest price in the last 24h
  volume: number        // how much of the base coin was traded in the last 24h
  // Which way the price moved on the last change (drives the green/red flash).
  // Filled in by the store (Phase 3). "?" = missing until there are two prices to compare.
  move?: 'up' | 'down'
}

// Map of symbol → latest ticker, e.g. { BTCUSDT: {...}, ETHUSDT: {...} }.
// Record<K, V> = an object whose keys are K and whose values are V.
// Partial = a symbol may be missing until its first update arrives.
export type TickerMap = Partial<Record<string, Ticker>>

// One of the candle sizes in CHART_INTERVALS: '1m' | '5m' | ... | '1d'.
// (typeof X)[number] = "the type of any element of the array X"
export type ChartInterval = (typeof CHART_INTERVALS)[number]

// ONE candlestick = what the price did during one interval (e.g. one minute).
// OHLC: Open (first price), High, Low, Close (last price).
export type Candle = {
  time: number   // when the candle STARTED, in seconds (that's what the chart library wants)
  open: number
  high: number
  low: number
  close: number
}

// The states our WebSocket connection can be in (a "union type": exactly one of these strings)
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

// Everything the UI needs to show the connection badge
export type ConnectionStatus = {
  state: ConnectionState
  attempt: number          // how many reconnect attempts in a row (0 when healthy)
  nextRetryMs: number | null // how long until the next retry (null if not waiting)
}
