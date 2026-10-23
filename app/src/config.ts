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
