// tradingStore.ts: the SIMULATED trading account (cash, positions, orders). A second Zustand store.
//
// Why simulated? Placing real orders on Binance needs a private API key, and a signed request
// from a backend server (you never put secret keys in browser code). So this store plays the
// role of the exchange: it validates, fills, and keeps the books, using REAL live prices.
//
// How orders fill here:
//   MARKET → immediately, at the latest price
//   LIMIT  → if the price is already good enough, immediately (like a real exchange).
//            Otherwise it waits in openOrders, and matchOrders() checks it on every
//            price batch: BUY fills when price ≤ limit, SELL when price ≥ limit.
//
// PERSIST middleware: the account is saved to localStorage, so it survives a page refresh.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SYMBOL_RULES, STARTING_CASH } from '../config'
import { applyFill, clean, reservedCash, reservedQuantity } from '../trading/portfolio'
import { validateOrder, type OrderDraft } from '../trading/validation'
import type { Order, Position, Ticker } from '../types'
import { formatPrice, formatQuantity } from '../utils/format'
import { useMarketStore } from './marketStore'

// What placeOrder tells the form: success (with a message), or why it was rejected
export type PlaceResult = { ok: boolean; message: string }

type AccountData = {
  cash: number                               // USDT balance (includes cash reserved by open buys)
  positions: Partial<Record<string, Position>>
  openOrders: Order[]                        // LIMIT orders waiting for their price
  history: Order[]                           // filled + canceled orders, newest first
}

type TradingState = AccountData & {
  placeOrder: (draft: OrderDraft) => PlaceResult
  cancelOrder: (id: string) => void
  matchOrders: (batch: Map<string, Ticker>) => void
  reset: () => void
}

const INITIAL: AccountData = { cash: STARTING_CASH, positions: {}, openOrders: [], history: [] }
const MAX_HISTORY = 50 // keep the history list (and localStorage) from growing forever

// ----- Selectors-as-functions: "available" = owned minus reserved by open orders -----
// Plain functions of the state, so both components (via hooks) and the store can use them.
export const availableCash = (s: AccountData) => s.cash - reservedCash(s.openOrders)
export const availableQuantity = (s: AccountData, symbol: string) =>
  clean((s.positions[symbol]?.quantity ?? 0) - reservedQuantity(s.openOrders, symbol))

// Execute one order at fillPrice: move cash, update the position, record it in history.
// Pure: takes the old account data, returns the changed parts (it doesn't call set itself).
function fill(s: AccountData, order: Order, fillPrice: number) {
  const cost = order.quantity * fillPrice
  const filled: Order = { ...order, status: 'FILLED', fillPrice, closedAt: Date.now() }
  return {
    cash: order.side === 'BUY' ? s.cash - cost : s.cash + cost,
    positions: {
      ...s.positions,
      [order.symbol]: applyFill(s.positions[order.symbol], order.symbol, order.side, order.quantity, fillPrice),
    },
    history: [filled, ...s.history].slice(0, MAX_HISTORY),
  }
}

// Human-readable summary, e.g. "Bought 0.01000 BTC at 67,250.50"
function describeFill(order: Order, price: number) {
  const base = order.symbol.replace('USDT', '')
  const verb = order.side === 'BUY' ? 'Bought' : 'Sold'
  return `${verb} ${formatQuantity(order.quantity, order.symbol)} ${base} at ${formatPrice(price)}`
}

export const useTradingStore = create<TradingState>()(
  // persist(...) wraps our store definition and saves the data to localStorage on every change
  persist(
    (set, get) => ({
      ...INITIAL,

      placeOrder: (draft) => {
        const state = get()
        // Read the market store WITHOUT subscribing (we're not a component, we just need the value now)
        const marketPrice = useMarketStore.getState().tickers[draft.symbol]?.price

        // Validate AGAIN here: the form might be out of date, and the "exchange" must never trust the UI
        const result = validateOrder(draft, {
          rules: SYMBOL_RULES[draft.symbol],
          marketPrice,
          availableCash: availableCash(state),
          availableQuantity: availableQuantity(state, draft.symbol),
        })
        if (!result.valid) {
          return { ok: false, message: Object.values(result.errors)[0] ?? 'Invalid order' }
        }

        const order: Order = {
          id: crypto.randomUUID(), // built-in browser function: a random unique id
          symbol: draft.symbol,
          side: draft.side,
          type: draft.type,
          quantity: result.quantity,
          price: result.price,
          status: 'OPEN',
          createdAt: Date.now(),
        }

        // "Marketable" = can fill right now: any MARKET order, or a LIMIT whose price is already reached
        const marketable =
          marketPrice !== undefined &&
          (order.type === 'MARKET' ||
            (order.side === 'BUY' ? marketPrice <= order.price : marketPrice >= order.price))

        if (marketable) {
          set(fill(state, order, marketPrice))
          return { ok: true, message: describeFill(order, marketPrice) }
        }

        // Otherwise it rests in the book until the price comes to it
        set({ openOrders: [order, ...state.openOrders] })
        const verb = order.side === 'BUY' ? 'buy' : 'sell'
        return { ok: true, message: `Limit ${verb} placed at ${formatPrice(order.price)}` }
      },

      cancelOrder: (id) =>
        set((s) => {
          const order = s.openOrders.find((o) => o.id === id)
          if (!order) return s // already filled or canceled: nothing changes
          const canceled: Order = { ...order, status: 'CANCELED', closedAt: Date.now() }
          return {
            openOrders: s.openOrders.filter((o) => o.id !== id), // removing it frees its reserved cash/coins
            history: [canceled, ...s.history].slice(0, MAX_HISTORY),
          }
        }),

      // Called once per animation frame with the tickers that changed (from useMarketFeed).
      // This is our tiny "matching engine" for resting LIMIT orders.
      matchOrders: (batch) =>
        set((s) => {
          let next: AccountData = s
          const stillOpen: Order[] = []
          for (const order of s.openOrders) {
            const price = batch.get(order.symbol)?.price
            const reached =
              price !== undefined && (order.side === 'BUY' ? price <= order.price : price >= order.price)
            if (reached) {
              // A resting limit order fills at ITS OWN price (the "maker" price), not the tick price
              next = { ...next, ...fill(next, order, order.price) }
            } else {
              stillOpen.push(order)
            }
          }
          // Returning the SAME state object = "nothing changed": Zustand skips notifying components
          if (stillOpen.length === s.openOrders.length) return s
          return { ...next, openOrders: stillOpen }
        }),

      reset: () => set(INITIAL),
    }),
    {
      name: 'trading-dashboard-account', // the localStorage key
      // Save only the DATA (functions can't be turned into JSON anyway)
      partialize: ({ cash, positions, openOrders, history }) => ({ cash, positions, openOrders, history }),
    },
  ),
)
