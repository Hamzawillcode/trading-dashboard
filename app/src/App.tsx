// App.tsx: the ROOT COMPONENT. It builds the page layout and owns shared state.
//
// KEY IDEA, "LIFTING STATE UP":
//   Watchlist (sets the selection) and Header + SymbolSummary (show it) are
//   siblings. Siblings can't talk to each other directly, so the state lives
//   in their common PARENT (App):
//     • App passes `selectedSymbol` DOWN as a prop to whoever needs to read it
//     • App passes `setSelectedSymbol` DOWN as `onSelect` to whoever needs to change it
//
//                App  (owns selectedSymbol)
//        ┌────────┼──────────────┐
//     Header   Watchlist     SymbolSummary
//     (reads)  (changes it)  (reads)

import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Panel } from './components/Panel'
import { SymbolSummary } from './components/SymbolSummary'
import { Watchlist } from './components/Watchlist'
import { MOCK_TICKERS } from './data/mockTickers'

export default function App() {
  // STATE: which coin is selected. Starts as Bitcoin.
  // Whenever setSelectedSymbol is called, App re-renders, and so do its children,
  // which receive the new value as props.
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT')

  // DERIVED DATA: find the full ticker object for the selected symbol.
  // "!" = we know it exists, because the symbol always comes from this same list.
  const selectedTicker = MOCK_TICKERS.find((t) => t.symbol === selectedSymbol)!

  // EFFECT: sync something OUTSIDE React (the browser tab title) with our state.
  // It runs after render, and again only when a value in [ ] changes (the "dependency array").
  useEffect(() => {
    document.title = `${selectedSymbol} · Trading Dashboard`
  }, [selectedSymbol])

  return (
    // flex-col: header on top, main area below.
    // Phones: min-h-screen, so the page grows and you scroll it normally.
    // Large screens (lg:h-screen): exactly one screen tall, and each panel scrolls on its own.
    <div className="flex min-h-screen flex-col lg:h-screen">
      <Header selectedSymbol={selectedSymbol} />

      {/* 3-column grid on large screens (lg:), stacked on small screens.
          min-h-0 lets the panels shrink and scroll inside instead of overflowing.
          grid-cols-1 = exactly one column that never grows wider than the screen. */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[280px_1fr_300px]">
        {/* LEFT: watchlist. We pass the data, the current selection, and the setter */}
        <Panel title="Watchlist">
          <Watchlist
            tickers={MOCK_TICKERS}
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
          />
        </Panel>

        {/* MIDDLE: details of the selected coin (the chart replaces this in Phase 4) */}
        <Panel title="Chart">
          <SymbolSummary ticker={selectedTicker} />
        </Panel>

        {/* RIGHT: order panel, built in Phase 5 */}
        <Panel title="Order Panel">
          <p className="p-3 text-sm text-muted">Coming in Phase 5</p>
        </Panel>
      </main>
    </div>
  )
}
