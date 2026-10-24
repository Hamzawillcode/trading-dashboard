// fakeBinance.ts: a FAKE Binance for the end-to-end tests.
//
// Why not use the real one? Real prices change every second, so "buy 0.01 BTC, expect a cost of
// X" would give a different X on every run, and the network might be slow or blocked (it is in
// many CI machines). Tests must be DETERMINISTIC: same input → same result, every time.
//
// So we MOCK at the network boundary: Playwright intercepts the browser's WebSocket and HTTP
// requests to Binance and answers them itself. The app's code runs completely unchanged; it
// has no idea it's talking to a fake. The test then decides the price: fake.setPrice('BTCUSDT', 50_000).

import type { Page, WebSocketRoute } from '@playwright/test'

export async function fakeBinance(page: Page) {
  let tickerSocket: WebSocketRoute | null = null

  // ----- WebSockets: answer every connection to any Binance stream host -----
  await page.routeWebSocket(/binance/, (ws) => {
    // routeWebSocket WITHOUT connectToServer(): no real server is contacted at all
    ws.onMessage((raw) => {
      const msg = JSON.parse(String(raw)) as { method: string; params?: string[]; id: number }
      // Reply to every request like Binance does: {"result": null, "id": <same id>}
      ws.send(JSON.stringify({ result: null, id: msg.id }))
      // Remember which socket subscribed to the TICKER streams: that's where prices go
      if (msg.method === 'SUBSCRIBE' && msg.params?.some((s) => s.endsWith('@ticker'))) tickerSocket = ws
    })
  })

  // ----- REST: chart history and order-book snapshot -----
  await page.route(/\/api\/v3\/klines/, (route) => route.fulfill({ json: [] })) // an empty chart is fine
  await page.route(/\/api\/v3\/depth/, (route) =>
    route.fulfill({ json: { lastUpdateId: 1, bids: [['49990.00', '1.0']], asks: [['50010.00', '1.0']] } }),
  )

  return {
    // Push one ticker message, in Binance's exact format (numbers as strings)
    setPrice(symbol: string, price: number) {
      if (!tickerSocket) throw new Error('The app has not subscribed to tickers yet')
      tickerSocket.send(
        JSON.stringify({ e: '24hrTicker', s: symbol, c: String(price), P: '1.50', h: String(price * 1.02), l: String(price * 0.98), v: '1234' }),
      )
    },
    isConnected: () => tickerSocket !== null,
  }
}
