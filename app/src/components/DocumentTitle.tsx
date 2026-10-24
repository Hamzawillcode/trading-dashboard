// DocumentTitle.tsx: keeps the browser TAB title showing the live price, e.g. "67,250.50 BTCUSDT".
//
// It draws nothing (returns null). Why is it a separate component instead of an effect in App?
// Because it SUBSCRIBES to the price. Whatever component subscribes re-renders on every tick,
// together with all of its children. Down here, that's just this tiny component. In App,
// it would re-render the whole page every second.
// Rule of thumb: subscribe to fast-changing state as LOW in the tree as you can.

import { useEffect } from 'react'
import { useMarketStore } from '../store/marketStore'

export function DocumentTitle() {
  const symbol = useMarketStore((s) => s.selectedSymbol)
  // Selector returns a NUMBER (or undefined), so this re-renders only when that price changes
  const price = useMarketStore((s) => s.tickers[s.selectedSymbol]?.price)

  useEffect(() => {
    document.title = price ? `${price.toLocaleString('en-US')} ${symbol}` : 'Trading Dashboard'
  }, [symbol, price])

  return null
}
