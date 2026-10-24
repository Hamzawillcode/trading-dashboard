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
//
// Phase 8: RESPONSIVE layout, built MOBILE-FIRST. The plain classes describe the phone layout,
// and lg: classes (1024px and wider) change it into the desktop grid:
//   • phones/tablets: header, ONE screen at a time, bottom tab bar (MobileNav)
//   • desktop:        header, all panels in a 3-column grid, no tab bar
// Each grid area is wrapped in a <Screen tab="..."> that hides itself on small screens when its tab
// isn't the active one.

import { DocumentTitle } from './components/DocumentTitle'
import { Header } from './components/Header'
import { MarketPanel } from './components/MarketPanel'
import { MobileNav } from './components/MobileNav'
import { OrderBook } from './components/OrderBook'
import { OrderPanel } from './components/OrderPanel'
import { Panel } from './components/Panel'
import { PortfolioPanel } from './components/PortfolioPanel'
import { Screen } from './components/Screen'
import { Watchlist } from './components/Watchlist'
import { WATCHLIST } from './config'
import { useMarketFeed } from './hooks/useMarketFeed'

// Computed ONCE, outside the component, so it's the same array on every render
const SYMBOLS = WATCHLIST.map((item) => item.symbol)

export default function App() {
  // Opens the WebSocket and streams batched ticks into the store. Returns nothing.
  useMarketFeed(SYMBOLS)

  return (
    // flex-col: header on top, main area in the middle, (on phones) the tab bar at the bottom.
    // h-dvh: exactly one screen tall on EVERY size. "dvh" = DYNAMIC viewport height: on phones it
    // shrinks/grows as the browser's address bar hides/shows (plain 100vh ignores that bar, so
    // the bottom tab bar would end up hidden behind it).
    <div className="flex h-dvh flex-col">
      {/* Invisible: keeps the browser tab title showing the live price */}
      <DocumentTitle />
      <Header />

      {/* Large screens (lg:): 3 columns × 2 rows. Small screens: one column with ONE visible screen.
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
          On phones only one Screen is visible, so the grid has a single row, and a grid row
          STRETCHES to fill the container: the visible screen is exactly as tall as the space
          between the header and the tab bar. overflow-y-auto scrolls it if it needs more. */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[280px_1fr_300px] lg:grid-rows-[1fr_260px]">
        {/* LEFT: watchlist (only the coin names are passed; rows read prices from the store) */}
        <Screen tab="markets" className="lg:row-span-2">
          <Panel title="Watchlist" className="flex-1">
            <Watchlist items={WATCHLIST} />
          </Panel>
        </Screen>

        {/* MIDDLE: live price + stats, then Chart (Phase 4) or Option chain (Phase 7) tabs */}
        <Screen tab="chart">
          <Panel title="Market" className="flex-1">
            <MarketPanel />
          </Panel>
        </Screen>

        {/* RIGHT: order book on top (Phase 6), order ticket below (Phase 5).
            The book's flex-1: it fills the height the form doesn't use. */}
        <Screen tab="trade" className="gap-3 lg:row-span-2">
          <Panel title="Order Book" className="min-h-96 flex-1 lg:min-h-0">
            <OrderBook />
          </Panel>
          <Panel title="Order Panel" className="shrink-0">
            <OrderPanel />
          </Panel>
        </Screen>

        {/* BOTTOM MIDDLE: account summary, positions with live P&L, orders (Phase 5).
            lg:col-start-2 lg:row-start-2 = column 2, row 2 (under the chart) */}
        <Screen tab="portfolio" className="lg:col-start-2 lg:row-start-2">
          <Panel title="Portfolio" className="min-h-64 flex-1 lg:min-h-0">
            <PortfolioPanel />
          </Panel>
        </Screen>
      </main>

      {/* Phones/tablets only: the bottom tab bar that picks the visible Screen */}
      <MobileNav />
    </div>
  )
}
