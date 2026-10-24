// PortfolioPanel.tsx: the bottom panel. An account summary on top, then three tabs:
//   Positions (with LIVE P&L) · Open orders (cancel button) · History
//
// PERFORMANCE: the tables are built from small components that each subscribe to just
// what they show. A PositionRow subscribes to ITS coin's price only, so when BTC ticks,
// only the BTC row's P&L re-renders.

import { useState, type ReactNode } from 'react'
import { SYMBOL_RULES } from '../config'
import { useMarketStore } from '../store/marketStore'
import { availableQuantity, useTradingStore } from '../store/tradingStore'
import { holdingsValue, pnlPercent, totalRealized, totalUnrealized, unrealizedPnl } from '../trading/portfolio'
import { floorToStep } from '../trading/validation'
import type { Order, Position } from '../types'
import { formatPercent, formatPrice, formatQuantity, formatSignedUsd, formatUsd, pnlColor } from '../utils/format'

type Tab = 'positions' | 'orders' | 'history'

export function PortfolioPanel() {
  const [tab, setTab] = useState<Tab>('positions')

  // Data for the tab labels and lists. These only change when you trade, not on price ticks.
  const positions = useTradingStore((s) => s.positions)
  const openOrders = useTradingStore((s) => s.openOrders)
  const history = useTradingStore((s) => s.history)

  // Positions you still hold (a fully sold position stays in the store for its realized P&L, but isn't listed)
  const held = Object.values(positions).filter((p): p is Position => !!p && p.quantity > 0)

  const tabs: [Tab, string][] = [
    ['positions', `Positions (${held.length})`],
    ['orders', `Open orders (${openOrders.length})`],
    ['history', 'History'],
  ]

  return (
    <div className="flex h-full flex-col">
      <AccountSummary />

      {/* ===== Tab bar ===== */}
      <div className="flex gap-4 border-b border-border px-3 text-xs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            // The active tab gets a yellow underline (border-b-2) and white text
            className={`border-b-2 py-2 ${tab === id ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ===== Tab content. overflow-auto: scroll if the table is taller/wider than the panel ===== */}
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'positions' && (
          <Table
            headers={['Symbol', 'Qty', 'Avg price', 'Mark', 'P&L (USDT)', 'P&L %', '']}
            empty="No positions yet. Place a buy order in the Order Panel."
          >
            {held.map((p) => <PositionRow key={p.symbol} position={p} />)}
          </Table>
        )}
        {tab === 'orders' && (
          <Table headers={['Time', 'Symbol', 'Side', 'Price', 'Qty', '']} empty="No open limit orders.">
            {openOrders.map((o) => <OpenOrderRow key={o.id} order={o} />)}
          </Table>
        )}
        {tab === 'history' && (
          <Table headers={['Time', 'Symbol', 'Side', 'Type', 'Price', 'Qty', 'Status']} empty="No orders yet.">
            {history.map((o) => <HistoryRow key={o.id} order={o} />)}
          </Table>
        )}
      </div>
    </div>
  )
}

// ===================== Account summary =====================
// Equity = cash + market value of everything you hold. It changes with every price tick.
function AccountSummary() {
  const cash = useTradingStore((s) => s.cash)
  const positions = useTradingStore((s) => s.positions)
  const reset = useTradingStore((s) => s.reset)
  // These selectors COMPUTE a number from all tickers. A number compares by value,
  // so this re-renders only when the total actually changes.
  const holdings = useMarketStore((s) => holdingsValue(positions, s.tickers))
  const unrealized = useMarketStore((s) => totalUnrealized(positions, s.tickers))
  const realized = totalRealized(positions)

  const stats: [string, string, string][] = [
    ['Equity', formatUsd(cash + holdings), ''],
    ['Cash', formatUsd(cash), ''],
    ['Unrealized P&L', formatSignedUsd(unrealized), pnlColor(unrealized)],
    ['Realized P&L', formatSignedUsd(realized), pnlColor(realized)],
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border px-3 py-2 text-xs">
      {stats.map(([label, value, color]) => (
        <div key={label}>
          <span className="text-muted">{label} </span>
          <span className={`tabular-nums ${color}`}>{value}</span>
        </div>
      ))}
      {/* ml-auto pushes the button to the far right */}
      <button
        type="button"
        onClick={() => confirm('Reset the simulated account to 10,000 USDT?') && reset()}
        className="ml-auto text-muted hover:text-text"
      >
        Reset account
      </button>
    </div>
  )
}

// ===================== Rows =====================

// One held position. Subscribes to its own coin's price → live P&L for this row only.
function PositionRow({ position: p }: { position: Position }) {
  const mark = useMarketStore((s) => s.tickers[p.symbol]?.price)
  const placeOrder = useTradingStore((s) => s.placeOrder)
  // Coins not already promised to an open sell order (that's what "Close" can sell)
  const closable = useTradingStore((s) => availableQuantity(s, p.symbol))

  const pnl = mark ? unrealizedPnl(p, mark) : 0

  // "Close" = market-sell everything that's free to sell
  const close = () =>
    placeOrder({
      symbol: p.symbol,
      side: 'SELL',
      type: 'MARKET',
      price: '',
      quantity: floorToStep(closable, SYMBOL_RULES[p.symbol].stepSize),
    })

  return (
    <tr>
      <Td className="font-medium">{p.symbol}</Td>
      <Td>{formatQuantity(p.quantity, p.symbol)}</Td>
      <Td>{formatPrice(p.avgPrice)}</Td>
      <Td>{formatPrice(mark)}</Td>
      <Td className={pnlColor(pnl)}>{mark ? formatSignedUsd(pnl) : '—'}</Td>
      <Td className={pnlColor(pnl)}>{mark ? formatPercent(pnlPercent(p, mark)) : '—'}</Td>
      <Td>
        <button type="button" onClick={close} disabled={!mark || closable <= 0} className="text-accent hover:underline disabled:opacity-40">
          Close
        </button>
      </Td>
    </tr>
  )
}

function OpenOrderRow({ order: o }: { order: Order }) {
  const cancelOrder = useTradingStore((s) => s.cancelOrder)
  return (
    <tr>
      <Td>{new Date(o.createdAt).toLocaleTimeString()}</Td>
      <Td className="font-medium">{o.symbol}</Td>
      <Td className={o.side === 'BUY' ? 'text-up' : 'text-down'}>{o.side}</Td>
      <Td>{formatPrice(o.price)}</Td>
      <Td>{formatQuantity(o.quantity, o.symbol)}</Td>
      <Td>
        <button type="button" onClick={() => cancelOrder(o.id)} className="text-accent hover:underline">
          Cancel
        </button>
      </Td>
    </tr>
  )
}

function HistoryRow({ order: o }: { order: Order }) {
  return (
    <tr>
      <Td>{new Date(o.closedAt ?? o.createdAt).toLocaleTimeString()}</Td>
      <Td className="font-medium">{o.symbol}</Td>
      <Td className={o.side === 'BUY' ? 'text-up' : 'text-down'}>{o.side}</Td>
      <Td>{o.type}</Td>
      <Td>{formatPrice(o.fillPrice ?? o.price)}</Td>
      <Td>{formatQuantity(o.quantity, o.symbol)}</Td>
      <Td className={o.status === 'FILLED' ? 'text-text' : 'text-muted'}>{o.status}</Td>
    </tr>
  )
}

// ===================== Small table helpers =====================

// A <table> with a header row, or a friendly message when there are no rows.
// `children` is the array of rows the caller built with .map(), so we can check its length.
function Table(props: { headers: string[]; empty: string; children: ReactNode[] }) {
  if (props.children.length === 0) {
    return <p className="p-4 text-center text-xs text-muted">{props.empty}</p>
  }
  return (
    // w-full: stretch across the panel. whitespace-nowrap: never wrap numbers onto two lines
    <table className="w-full whitespace-nowrap text-xs">
      <thead className="text-left text-muted">
        <tr>
          {props.headers.map((h, i) => (
            // index as key is fine here: the header list never reorders
            <th key={i} className="px-3 py-1.5 font-normal">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      {/* divide-y: a thin line between rows */}
      <tbody className="divide-y divide-border">{props.children}</tbody>
    </table>
  )
}

// One table cell with the shared padding and equal-width digits
function Td({ className = '', children }: { className?: string; children: ReactNode }) {
  return <td className={`px-3 py-1.5 tabular-nums ${className}`}>{children}</td>
}
