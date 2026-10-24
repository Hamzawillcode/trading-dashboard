// OrderPanel.tsx: the right-hand panel. A note saying orders are simulated + the order form.
//
// key={symbol}: when the selected coin changes, React sees a NEW key and remounts OrderForm,
// so its state (quantity, price, messages) starts fresh for the new coin.
// (The same key trick we used to replay the price-flash animation in Phase 3.)

import { useMarketStore } from '../store/marketStore'
import { OrderForm } from './OrderForm'

export function OrderPanel() {
  const symbol = useMarketStore((s) => s.selectedSymbol)

  return (
    <div className="flex flex-col">
      <OrderForm key={symbol} symbol={symbol} />
      {/* Be honest in the UI too: real Binance orders need a private API key and a backend */}
      <p className="px-3 pb-3 text-xs text-muted">
        Paper trading: orders are simulated against live Binance prices. Starts with 10,000 USDT.
      </p>
    </div>
  )
}
