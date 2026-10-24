// config.ts: app-wide settings in ONE place.

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
