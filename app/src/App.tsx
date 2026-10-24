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
//                                (inside MarketPanel, with OptionChain)
//      (each one subscribes to ONLY the slice it needs)
//
// Phase 5 adds a second store, tradingStore (cash, positions, orders), used by
// OrderPanel and PortfolioPanel.
//
// App itself subscribes to NOTHING, so it renders once and never again. It just
// starts the market feed and lays out the page.

import { DocumentTitle } from './components/DocumentTitle'
import { Header } from './components/Header'
import { MarketPanel } from './components/MarketPanel'
import { OrderBook } from './components/OrderBook'
import { OrderPanel } from './components/OrderPanel'
import { Panel } from './components/Panel'
import { PortfolioPanel } from './components/PortfolioPanel'
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

      {/* Large screens (lg:): 3 columns × 2 rows. Small screens: everything stacked in 1 column.
            ┌───────────┬───────────────┬─────────┐
            │           │ Market        │  Order  │
            │ Watchlist │               │  Book   │   row 1: takes the rest (1fr)
            │           ├───────────────┼─────────┤
            │           │ Portfolio     │  Order  │   row 2: 260px
            │           │               │  Panel  │
            └───────────┴───────────────┴─────────┘
          (The right column is ONE grid cell spanning both rows, split by its own flex column,
           so the order book takes whatever height the order form leaves.)
          lg:row-span-2 = the side panels stretch over both rows.
          min-h-0 lets the panels shrink and scroll inside instead of overflowing.
          grid-cols-1 = exactly one column that never grows wider than the screen. */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[280px_1fr_300px] lg:grid-rows-[1fr_260px]">
        {/* LEFT: watchlist (only the coin names are passed; rows read prices from the store) */}
        <Panel title="Watchlist" className="lg:row-span-2">
          <Watchlist items={WATCHLIST} />
        </Panel>

        {/* MIDDLE: live price + stats, then Chart (Phase 4) or Option chain (Phase 7) tabs */}
        <Panel title="Market">
          <MarketPanel />
        </Panel>

        {/* RIGHT: order book on top (Phase 6), order ticket below (Phase 5).
            flex-col + the book's flex-1: the book fills the height the form doesn't use. */}
        <div className="flex min-h-0 flex-col gap-3 lg:row-span-2">
          <Panel title="Order Book" className="min-h-96 flex-1 lg:min-h-0">
            <OrderBook />
          </Panel>
          <Panel title="Order Panel" className="shrink-0">
            <OrderPanel />
          </Panel>
        </div>

        {/* BOTTOM MIDDLE: account summary, positions with live P&L, orders (Phase 5).
            lg:col-start-2 lg:row-start-2 = column 2, row 2 (under the chart) */}
        <Panel title="Portfolio" className="min-h-64 lg:col-start-2 lg:row-start-2 lg:min-h-0">
          <PortfolioPanel />
        </Panel>
      </main>
    </div>
  )
}
