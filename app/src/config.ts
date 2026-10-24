// config.ts: app-wide settings in ONE place.

import type { SymbolRules } from './types'

// The coins shown in the watchlist. Only the names live here: the prices come live from Binance.
export type WatchlistItem = {
  symbol: string // Binance trading pair id, e.g. "BTCUSDT"
  base: string   // coin being traded, e.g. "BTC"
  quote: string  // currency it's priced in, e.g. "USDT"
}

export const WATCHLIST: WatchlistItem[] = [
  { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT' },
  { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT' },
  { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT' },
  { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT' },
  { symbol: 'XRPUSDT', base: 'XRP', quote: 'USDT' },
  { symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT' },
  { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT' },
  { symbol: 'AVAXUSDT', base: 'AVAX', quote: 'USDT' },
]

// Binance public WebSocket endpoints (no API key needed for market data).
// If one fails we rotate to the next on reconnect. data-stream.binance.vision is
// Binance's market-data-only mirror, which helps on networks that block the main domain.
export const BINANCE_WS_URLS = [
  'wss://stream.binance.com:9443/ws',
  'wss://data-stream.binance.vision/ws',
]

// Binance public REST endpoints, for HISTORY (past candles). Same idea: try them in order.
// data-api.binance.vision is the market-data-only host, and it allows calls from browsers (CORS).
export const BINANCE_REST_URLS = ['https://data-api.binance.vision', 'https://api.binance.com']

// The candle sizes the chart offers. Strings are exactly what Binance expects ("1m" = 1 minute).
// "as const" makes TypeScript treat them as fixed values, not just any string.
export const CHART_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const

// How many past candles to load when the chart opens (Binance allows up to 1000 per request)
export const CANDLE_HISTORY_LIMIT = 500

// ===================== TRADING RULES (Phase 5) =====================
// Every exchange has rules about which orders it accepts. These are Binance's real values,
// copied from GET /api/v3/exchangeInfo on 2026-10-24 (the "PRICE_FILTER", "LOT_SIZE" and
// "NOTIONAL" filters). A production app would fetch them at startup, because they can change.
export const SYMBOL_RULES: Record<string, SymbolRules> = {
  //            price step         quantity step + minimum         min order value (USDT)
  BTCUSDT: { tickSize: 0.01, stepSize: 0.00001, minQty: 0.00001, minNotional: 5 },
  ETHUSDT: { tickSize: 0.01, stepSize: 0.0001, minQty: 0.0001, minNotional: 5 },
  BNBUSDT: { tickSize: 0.01, stepSize: 0.001, minQty: 0.001, minNotional: 5 },
  SOLUSDT: { tickSize: 0.01, stepSize: 0.001, minQty: 0.001, minNotional: 5 },
  XRPUSDT: { tickSize: 0.0001, stepSize: 0.1, minQty: 0.1, minNotional: 5 },
  ADAUSDT: { tickSize: 0.0001, stepSize: 0.1, minQty: 0.1, minNotional: 5 },
  DOGEUSDT: { tickSize: 0.00001, stepSize: 1, minQty: 1, minNotional: 1 },
  AVAXUSDT: { tickSize: 0.001, stepSize: 0.01, minQty: 0.01, minNotional: 5 },
}

// The simulated account starts with this much cash (in USDT)
export const STARTING_CASH = 10_000

// ===================== ORDER BOOK (Phase 6) =====================
export const BOOK_SNAPSHOT_LIMIT = 1000 // levels per side in the REST snapshot (Binance max is 5000)
export const BOOK_LEVELS_SHOWN = 12     // max levels per side drawn (fewer if the panel is short)
