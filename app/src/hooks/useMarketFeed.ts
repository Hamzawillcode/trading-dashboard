// useMarketFeed.ts: a CUSTOM HOOK that plugs the Binance socket into the global store.
// (Replaces Phase 2's useLiveTickers.)
//
// What changed vs Phase 2:
//   Phase 2: every message → setTickers → React re-render         (N messages = N renders)
//   Phase 3: every message → batcher.push → once per frame → store (N messages = at most 60 renders/sec)
//
//   Binance ──msg──> BinanceSocket ──> FrameBatcher ──(1 per frame)──> marketStore ──> only the components whose slice changed
//
// It returns NOTHING. Components read what they need from the store themselves,
// so the component that calls this hook (App) never re-renders because of prices.

import { useEffect } from 'react'
import { BINANCE_WS_URLS } from '../config'
import { BinanceSocket } from '../services/BinanceSocket'
import { FrameBatcher } from '../services/FrameBatcher'
import { isTickerMessage, tickerStream, toTicker } from '../services/binanceMessages'
import { useMarketStore } from '../store/marketStore'
import { useTradingStore } from '../store/tradingStore'
import type { Ticker } from '../types'

export function useMarketFeed(symbols: string[]) {
  // A string, so the effect re-runs only when the symbols ACTUALLY change (see Phase 2 notes)
  const symbolsKey = symbols.join(',')

  useEffect(() => {
    // getState() reads the store WITHOUT subscribing to it: we only need the actions here,
    // and we don't want this hook to cause re-renders.
    const { applyTickers, setStatus, setFeedStats, setSimulateDrop } = useMarketStore.getState()
    const { matchOrders } = useTradingStore.getState()

    // Counters for the "msg/s → updates/s" display. Plain variables are enough: nothing renders them directly.
    let messages = 0
    let updates = 0

    // The batcher hands us one Map of changed tickers per frame → one store update
    const batcher = new FrameBatcher<Ticker>((batch) => {
      updates += 1
      applyTickers(batch)
      matchOrders(batch) // Phase 5: did any waiting LIMIT order's price just get reached?
    })

    const socket = new BinanceSocket({
      urls: BINANCE_WS_URLS,
      onStatusChange: setStatus, // rare (connect/disconnect), so no need to batch these
      onMessage: (msg) => {
        if (!isTickerMessage(msg)) return
        const ticker = toTicker(msg)
        if (!ticker) return
        messages += 1
        batcher.push(ticker.symbol, ticker) // NOT a state update: just parked until the next frame
      },
    })
    socket.subscribe(symbolsKey.split(',').map(tickerStream))
    socket.connect()

    // Let the header's "Simulate drop" button reach this socket through the store
    setSimulateDrop(() => socket.simulateDrop())

    // Once a second: publish the counters, then reset them
    const statsTimer = setInterval(() => {
      setFeedStats({ messagesPerSec: messages, updatesPerSec: updates })
      messages = 0
      updates = 0
    }, 1000)

    // CLEANUP: stop everything this effect started (timer, pending frame, socket)
    return () => {
      clearInterval(statsTimer)
      batcher.cancel()
      socket.close()
      setSimulateDrop(() => {})
    }
  }, [symbolsKey])
}
