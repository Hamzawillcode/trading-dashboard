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

// ===================== TRADING (Phase 5) =====================

export type Side = 'BUY' | 'SELL'
// MARKET = "fill now at whatever the price is". LIMIT = "fill only at this price or better".
export type OrderType = 'MARKET' | 'LIMIT'
export type OrderStatus = 'OPEN' | 'FILLED' | 'CANCELED'

export type Order = {
  id: string
  symbol: string
  side: Side
  type: OrderType
  quantity: number    // how many coins
  price: number       // LIMIT: the limit price. MARKET: the price it was sent at
  status: OrderStatus
  createdAt: number   // timestamps in ms (Date.now())
  closedAt?: number   // when it was filled or canceled
  fillPrice?: number  // the price it actually executed at
}

// What you currently hold of one coin, and how it has gone so far
export type Position = {
  symbol: string
  quantity: number    // coins held (0 after you sell everything)
  avgPrice: number    // average price paid per coin (the "cost basis")
  realizedPnl: number // profit/loss already LOCKED IN by selling, in USDT
}

// Exchange rules for one symbol (see SYMBOL_RULES in config.ts)
export type SymbolRules = {
  tickSize: number    // price must be a multiple of this (e.g. 0.01 → 67250.50 ok, 67250.505 not)
  stepSize: number    // quantity must be a multiple of this
  minQty: number      // smallest quantity allowed
  minNotional: number // smallest order VALUE (price × quantity) allowed, in USDT
}

// The states our WebSocket connection can be in (a "union type": exactly one of these strings)
export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

// Everything the UI needs to show the connection badge
export type ConnectionStatus = {
  state: ConnectionState
  attempt: number          // how many reconnect attempts in a row (0 when healthy)
  nextRetryMs: number | null // how long until the next retry (null if not waiting)
}
