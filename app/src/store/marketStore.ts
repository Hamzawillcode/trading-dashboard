// marketStore.ts: the GLOBAL STATE of the app, built with Zustand.
//
// BEFORE (Phases 1–2): App owned all the state and passed it down as props
// ("prop drilling"). Every price tick re-rendered App, and therefore EVERYTHING under it.
//
// NOW: the state lives OUTSIDE React, in this store. Any component can read
// exactly the slice it needs with a SELECTOR:
//
//   const price = useMarketStore((s) => s.tickers.BTCUSDT?.price)
//
// and it re-renders ONLY when that slice changes. The ETH row doesn't re-render
// when BTC ticks. App doesn't re-render at all.
//
// Zustand vs Redux Toolkit (the same ideas, different amounts of ceremony):
//   Redux: store + slices + actions + reducers + <Provider> + dispatch(action)
//   Zustand: one create() call. State and the functions that change it sit together,
//            no Provider needed, and you call actions like normal functions.

import { create } from 'zustand'
import type { ConnectionStatus, Ticker, TickerMap } from '../types'

// How busy the feed is, measured every second (shown in the header to prove batching works)
export type FeedStats = {
  messagesPerSec: number // WebSocket messages received
  updatesPerSec: number  // store updates (= React render passes) actually done
}

// The SHAPE of the store: the data, plus the ACTIONS that change it
type MarketState = {
  // ----- data -----
  tickers: TickerMap
  status: ConnectionStatus
  selectedSymbol: string
  feedStats: FeedStats
  simulateDrop: () => void // set by useMarketFeed, so the header button can reach the socket

  // ----- actions -----
  selectSymbol: (symbol: string) => void
  applyTickers: (batch: Map<string, Ticker>) => void
  setStatus: (status: ConnectionStatus) => void
  setFeedStats: (stats: FeedStats) => void
  setSimulateDrop: (fn: () => void) => void
}

// Which way did the price move? Used for the green/red flash.
// Pure function: compares the old and new ticker and returns the direction.
// Same price (e.g. only the volume changed) → keep the old direction, so the flash doesn't restart.
function priceMove(prev: Ticker | undefined, next: Ticker): Ticker['move'] {
  if (!prev) return undefined // first tick ever: nothing to compare with
  if (next.price > prev.price) return 'up'
  if (next.price < prev.price) return 'down'
  return prev.move
}

// create() builds the store and gives back a HOOK (useMarketStore) for components.
// `set` merges a partial object into the state, like setState in a class component.
export const useMarketStore = create<MarketState>()((set) => ({
  tickers: {},
  status: { state: 'connecting', attempt: 0, nextRetryMs: null },
  selectedSymbol: 'BTCUSDT',
  feedStats: { messagesPerSec: 0, updatesPerSec: 0 },
  simulateDrop: () => {},

  selectSymbol: (symbol) => set({ selectedSymbol: symbol }),

  // Called ONCE per animation frame with every ticker that changed during that frame.
  // ONE set() call for the whole batch = ONE notification to components, instead of one per message.
  applyTickers: (batch) =>
    set((state) => {
      // New outer object (immutability), so Zustand and React see that something changed...
      const tickers = { ...state.tickers }
      for (const [symbol, next] of batch) {
        tickers[symbol] = { ...next, move: priceMove(state.tickers[symbol], next) }
      }
      // ...but tickers that did NOT change keep their old object. So a selector like
      // s.tickers.ETHUSDT returns the SAME reference, and the ETH row skips its re-render.
      return { tickers }
    }),

  setStatus: (status) => set({ status }),
  setFeedStats: (feedStats) => set({ feedStats }),
  setSimulateDrop: (fn) => set({ simulateDrop: fn }),
}))
