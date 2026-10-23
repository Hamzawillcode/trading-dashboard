// mockTickers.ts: FAKE, hard-coded watchlist data for Phase 1.
// We use this so we can learn React without worrying about live data.
// In Phase 2–3 this is replaced by real prices streamed from Binance.
// The numbers are only roughly realistic.

import type { Ticker } from '../types'

// "Ticker[]" means "an array of Ticker objects". TypeScript checks every entry.
export const MOCK_TICKERS: Ticker[] = [
  { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', price: 67250.5, changePercent: 2.34, high: 68100, low: 65400, volume: 18234.5 },
  { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', price: 3480.12, changePercent: -1.12, high: 3560, low: 3420, volume: 254310.2 },
  { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT', price: 592.3, changePercent: 0.45, high: 598.1, low: 584.7, volume: 412000 },
  { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', price: 168.42, changePercent: 5.87, high: 171.2, low: 157.9, volume: 3120000 },
  { symbol: 'XRPUSDT', base: 'XRP', quote: 'USDT', price: 0.5234, changePercent: -0.76, high: 0.535, low: 0.519, volume: 98000000 },
  { symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT', price: 0.4521, changePercent: -2.41, high: 0.468, low: 0.448, volume: 120000000 },
  { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT', price: 0.1587, changePercent: 3.1, high: 0.162, low: 0.152, volume: 1500000000 },
  { symbol: 'AVAXUSDT', base: 'AVAX', quote: 'USDT', price: 35.67, changePercent: 1.05, high: 36.4, low: 34.8, volume: 2900000 },
]
