// Header.tsx: the top bar of the app.
// It receives data as PROPS and just displays it (data flows DOWN from App).
// The onSimulateDrop callback lets a button in here trigger an action that lives in App.

import type { ConnectionStatus } from '../types'
import { ConnectionBadge } from './ConnectionBadge'

type HeaderProps = {
  selectedSymbol: string
  status: ConnectionStatus
  onSimulateDrop: () => void
}

export function Header({ selectedSymbol, status, onSimulateDrop }: HeaderProps) {
  return (
    // flex-wrap: on narrow screens the items wrap onto a second line instead of overflowing
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h1 className="text-lg font-bold text-accent">Trading Dashboard</h1>
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-muted">
          Selected: <span className="font-semibold text-text">{selectedSymbol}</span>
        </span>
        <ConnectionBadge status={status} onSimulateDrop={onSimulateDrop} />
      </div>
    </header>
  )
}
