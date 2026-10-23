// App.tsx: the ROOT COMPONENT. It builds the page layout and owns shared state.
//
// KEY IDEA, "LIFTING STATE UP":
//   Watchlist (sets the selection) and Header + SymbolSummary (show it) are
//   siblings. Siblings can't talk to each other directly, so the state lives
//   in their common PARENT (App):
//     • App passes `selectedSymbol` DOWN as a prop to whoever needs to read it
//     • App passes `setSelectedSymbol` DOWN as `onSelect` to whoever needs to change it
//
//                App  (owns selectedSymbol + live tickers)
//        ┌────────┼──────────────┐
//     Header   Watchlist     SymbolSummary
//     (reads)  (changes it)  (reads)
//
// Phase 2: prices now come LIVE from Binance through the useLiveTickers hook.

import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Panel } from './components/Panel'
import { SymbolSummary } from './components/SymbolSummary'
import { Watchlist } from './components/Watchlist'
import { WATCHLIST } from './config'
import { useLiveTickers } from './hooks/useLiveTickers'

// Computed ONCE, outside the component, so it's the same array on every render
const SYMBOLS = WATCHLIST.map((item) => item.symbol)

export default function App() {
  // STATE: which coin is selected. Starts as Bitcoin.
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT')

  // CUSTOM HOOK: opens the WebSocket, and gives back live prices + connection status.
  // All the socket complexity is hidden inside the hook.
  const { tickers, status, simulateDrop } = useLiveTickers(SYMBOLS)

  // DERIVED DATA: the selected coin's name info and its live ticker (may be undefined at first).
  // "!" = we know it exists, because the symbol always comes from WATCHLIST.
  const selectedItem = WATCHLIST.find((item) => item.symbol === selectedSymbol)!
  const selectedTicker = tickers[selectedSymbol]

  // EFFECT: show the live price in the browser TAB title, e.g. "67,250.50 BTCUSDT".
  // Re-runs only when the selected symbol or its price changes (the dependency array).
  const price = selectedTicker?.price
  useEffect(() => {
    document.title = price ? `${price.toLocaleString('en-US')} ${selectedSymbol}` : 'Trading Dashboard'
  }, [selectedSymbol, price])

  return (
    // flex-col: header on top, main area below.
    // Phones: min-h-screen, so the page grows and you scroll it normally.
    // Large screens (lg:h-screen): exactly one screen tall, and each panel scrolls on its own.
    <div className="flex min-h-screen flex-col lg:h-screen">
      <Header selectedSymbol={selectedSymbol} status={status} onSimulateDrop={simulateDrop} />

      {/* 3-column grid on large screens (lg:), stacked on small screens.
          min-h-0 lets the panels shrink and scroll inside instead of overflowing.
          grid-cols-1 = exactly one column that never grows wider than the screen. */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[280px_1fr_300px]">
        {/* LEFT: watchlist. We pass the coin list, the live prices, the selection and the setter */}
        <Panel title="Watchlist">
          <Watchlist
            items={WATCHLIST}
            tickers={tickers}
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
          />
        </Panel>

        {/* MIDDLE: details of the selected coin (the chart replaces this in Phase 4) */}
        <Panel title="Chart">
          <SymbolSummary item={selectedItem} ticker={selectedTicker} />
        </Panel>

        {/* RIGHT: order panel, built in Phase 5 */}
        <Panel title="Order Panel">
          <p className="p-3 text-sm text-muted">Coming in Phase 5</p>
        </Panel>
      </main>
    </div>
  )
}
