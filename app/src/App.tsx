// App.tsx: the ROOT COMPONENT. It builds the page layout.
//
// Phase 1–2: App OWNED the state (selection + live prices) and passed it down as props
// ("lifting state up"). Downside: every price tick re-rendered App AND everything inside it.
//
// Phase 3: the state moved into a GLOBAL STORE (store/marketStore.ts, Zustand).
//
//                    marketStore  (selection, tickers, connection status)
//          ┌───────────┬──────┴──────┬──────────────┬─────────────┐
//       Header    WatchlistRow   SymbolSummary   ChartPanel   DocumentTitle
//      (each one subscribes to ONLY the slice it needs)
//
// App itself subscribes to NOTHING, so it renders once and never again. It just
// starts the market feed and lays out the page.

import { ChartPanel } from './components/ChartPanel'
import { DocumentTitle } from './components/DocumentTitle'
import { Header } from './components/Header'
import { Panel } from './components/Panel'
import { SymbolSummary } from './components/SymbolSummary'
import { Watchlist } from './components/Watchlist'
import { WATCHLIST } from './config'
import { useMarketFeed } from './hooks/useMarketFeed'

// Computed ONCE, outside the component, so it's the same array on every render
const SYMBOLS = WATCHLIST.map((item) => item.symbol)

export default function App() {
  // Opens the WebSocket and streams batched ticks into the store. Returns nothing.
  useMarketFeed(SYMBOLS)

  return (
    // flex-col: header on top, main area below.
    // Phones: min-h-screen, so the page grows and you scroll it normally.
    // Large screens (lg:h-screen): exactly one screen tall, and each panel scrolls on its own.
    <div className="flex min-h-screen flex-col lg:h-screen">
      {/* Invisible: keeps the browser tab title showing the live price */}
      <DocumentTitle />
      <Header />

      {/* 3-column grid on large screens (lg:), stacked on small screens.
          min-h-0 lets the panels shrink and scroll inside instead of overflowing.
          grid-cols-1 = exactly one column that never grows wider than the screen. */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[280px_1fr_300px]">
        {/* LEFT: watchlist (only the coin names are passed; rows read prices from the store) */}
        <Panel title="Watchlist">
          <Watchlist items={WATCHLIST} />
        </Panel>

        {/* MIDDLE: live price + stats on top, candlestick chart filling the rest (Phase 4).
            Two SIBLINGS, so price ticks (SymbolSummary) never re-render the chart. */}
        <Panel title="Chart">
          <div className="flex h-full flex-col gap-4 p-4">
            <SymbolSummary />
            <ChartPanel />
          </div>
        </Panel>

        {/* RIGHT: order panel, built in Phase 5 */}
        <Panel title="Order Panel">
          <p className="p-3 text-sm text-muted">Coming in Phase 5</p>
        </Panel>
      </main>
    </div>
  )
}
