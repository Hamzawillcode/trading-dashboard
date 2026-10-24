// tradingStore.test.ts: INTEGRATION TESTS for the simulated exchange (tradingStore).
//
// Unit tests check one function. An INTEGRATION test checks that several pieces WORK TOGETHER:
// here validation + filling + the P&L maths + the limit-order matcher + the market store.
//
// We control the market completely: setPrice() writes a price straight into the market store.
// No WebSocket, no Binance. That makes the tests FAST and DETERMINISTIC (same result every run).

import { beforeEach, describe, expect, it } from 'vitest'
import { STARTING_CASH } from '../config'
import type { Ticker } from '../types'
import { useMarketStore } from './marketStore'
import { availableCash, useTradingStore } from './tradingStore'

function ticker(symbol: string, price: number): Ticker {
  return { symbol, base: symbol.replace('USDT', ''), quote: 'USDT', price, changePercent: 0, high: 0, low: 0, volume: 0 }
}

// Pretend the market moved: update the price, then run the matcher like useMarketFeed does every frame
function setPrice(symbol: string, price: number) {
  const batch = new Map([[symbol, ticker(symbol, price)]])
  useMarketStore.getState().applyTickers(batch)
  useTradingStore.getState().matchOrders(batch)
}

const trading = () => useTradingStore.getState() // shorthand: the store's current state + actions

// beforeEach: a FRESH account and market before every test, so tests never depend on each other's leftovers
beforeEach(() => {
  trading().reset()
  useMarketStore.setState({ tickers: {} })
  setPrice('BTCUSDT', 50_000)
})

describe('market orders', () => {
  it('buy fills immediately at the market price', () => {
    const res = trading().placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', price: '', quantity: '0.1' })

    expect(res.ok).toBe(true)
    expect(trading().cash).toBe(STARTING_CASH - 5_000) // 0.1 × 50,000
    expect(trading().positions.BTCUSDT).toMatchObject({ quantity: 0.1, avgPrice: 50_000 })
    expect(trading().history[0]).toMatchObject({ status: 'FILLED', fillPrice: 50_000 })
  })

  it('buy then sell higher locks in a realized profit', () => {
    trading().placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', price: '', quantity: '0.1' })
    setPrice('BTCUSDT', 55_000)
    trading().placeOrder({ symbol: 'BTCUSDT', side: 'SELL', type: 'MARKET', price: '', quantity: '0.1' })

    expect(trading().positions.BTCUSDT).toMatchObject({ quantity: 0, realizedPnl: 500 }) // 0.1 × 5,000
    expect(trading().cash).toBe(STARTING_CASH + 500)
  })

  it('the store re-validates and rejects bad orders (never trust the UI)', () => {
    const res = trading().placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', price: '', quantity: '1' })

    expect(res).toEqual({ ok: false, message: 'Not enough USDT' })
    expect(trading().cash).toBe(STARTING_CASH) // nothing happened
  })
})

describe('limit orders', () => {
  it('rests in the book, reserves cash, and fills at ITS price when the market reaches it', () => {
    trading().placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: '48000', quantity: '0.1' })

    // Waiting: not filled, but the 4,800 is reserved (not spendable twice)
    expect(trading().openOrders).toHaveLength(1)
    expect(availableCash(trading())).toBe(STARTING_CASH - 4_800)

    setPrice('BTCUSDT', 49_000) // not low enough yet
    expect(trading().openOrders).toHaveLength(1)

    setPrice('BTCUSDT', 47_900) // crosses the limit → fills at 48,000 (the maker price), not 47,900
    expect(trading().openOrders).toHaveLength(0)
    expect(trading().positions.BTCUSDT?.avgPrice).toBe(48_000)
    expect(trading().cash).toBe(STARTING_CASH - 4_800)
  })

  it('a limit that is already reachable fills right away (marketable limit)', () => {
    trading().placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: '51000', quantity: '0.1' })
    expect(trading().openOrders).toHaveLength(0)
    expect(trading().positions.BTCUSDT?.avgPrice).toBe(50_000) // you get the better, market price
  })

  it('cancel frees the reserved cash and records it in history', () => {
    trading().placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: '48000', quantity: '0.1' })
    trading().cancelOrder(trading().openOrders[0].id)

    expect(trading().openOrders).toHaveLength(0)
    expect(availableCash(trading())).toBe(STARTING_CASH)
    expect(trading().history[0].status).toBe('CANCELED')
  })

  it('a price tick that fills nothing leaves the state object untouched (no re-render)', () => {
    trading().placeOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: '48000', quantity: '0.1' })
    const before = useTradingStore.getState()
    setPrice('BTCUSDT', 49_500)
    expect(useTradingStore.getState()).toBe(before) // toBe = the SAME object, not just equal
  })
})
