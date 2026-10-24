// binanceRest.ts: loads HISTORY from Binance's REST API.
//
// REST vs WebSocket, and why we need both:
//   • REST (HTTP request → response): "give me the last 500 candles". Good for the PAST, asked once.
//   • WebSocket (push):              "tell me every time the current candle changes". Good for the LIVE edge.
// A chart needs both: history to fill the screen, then live updates on top.

import { BINANCE_REST_URLS, BOOK_SNAPSHOT_LIMIT, CANDLE_HISTORY_LIMIT } from '../config'
import type { Candle, ChartInterval, DepthSnapshot } from '../types'
import { restRowToCandle, toDepthSnapshot, type RawDepthSnapshot, type RawKlineRow } from './binanceMessages'

// ASYNC FUNCTION: it returns a Promise (a "value that arrives later").
// Inside, `await` pauses THIS function until a Promise finishes, without freezing the page.
// The caller does: const candles = await fetchCandles('BTCUSDT', '1m', signal)
//
// `signal` (from an AbortController) lets the caller CANCEL the request, e.g. when the user
// switches symbol before the old request finished, so a stale answer can't overwrite the new chart.
export async function fetchCandles(
  symbol: string,
  interval: ChartInterval,
  signal: AbortSignal,
): Promise<Candle[]> {
  // URLSearchParams builds the "?symbol=BTCUSDT&interval=1m&limit=500" part safely
  const query = new URLSearchParams({ symbol, interval, limit: String(CANDLE_HISTORY_LIMIT) })
  const rows = await getJson<RawKlineRow[]>(`/api/v3/klines?${query}`, signal)
  return rows.map(restRowToCandle)
}

// Phase 6: the order book SNAPSHOT (the full book at one moment, with its version number)
export async function fetchDepth(symbol: string, signal: AbortSignal): Promise<DepthSnapshot> {
  const query = new URLSearchParams({ symbol, limit: String(BOOK_SNAPSHOT_LIMIT) })
  const raw = await getJson<RawDepthSnapshot>(`/api/v3/depth?${query}`, signal)
  return toDepthSnapshot(raw)
}

// Shared helper: GET a path from the first Binance host that answers, and parse the JSON.
// <T> is a GENERIC type parameter: the caller says what shape it expects back.
async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  let lastError: unknown
  // Try each host in order. The first one that works wins.
  for (const base of BINANCE_REST_URLS) {
    try {
      // fetch() = the browser's built-in HTTP client. It resolves when the response HEADERS arrive.
      const res = await fetch(`${base}${path}`, { signal })
      // fetch does NOT throw on HTTP errors like 404/500, so check res.ok (true for 200–299) ourselves
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // .json() reads the BODY and parses it. That's a second wait, so it's awaited too.
      return (await res.json()) as T
    } catch (err) {
      // Cancelled on purpose: stop right away, don't try the next host
      if (signal.aborted) throw err
      lastError = err // network/HTTP failure: remember it and try the next host
    }
  }
  throw lastError // every host failed: let the caller show an error
}
