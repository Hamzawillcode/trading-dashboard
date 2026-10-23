// types.ts: TypeScript "shapes" of the data our app uses.
// A type has no effect when the app runs. It only lets TypeScript warn us
// if we, for example, misspell a field or put text where a number should be.

// One row of the watchlist: the latest market info for one trading pair.
export type Ticker = {
  symbol: string        // trading pair id, e.g. "BTCUSDT" (Bitcoin priced in USDT)
  base: string          // the coin being traded, e.g. "BTC"
  quote: string         // the currency it's priced in, e.g. "USDT" (a US-dollar stablecoin)
  price: number         // last traded price
  changePercent: number // % change over the last 24 hours (negative = fell)
  high: number          // highest price in the last 24h
  low: number           // lowest price in the last 24h
  volume: number        // how much of the base coin was traded in the last 24h
}
