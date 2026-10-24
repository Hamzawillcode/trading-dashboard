// ConnectionBadge.tsx: a small coloured dot + label showing the WebSocket state.
// Users of a trading app must KNOW when prices are stale, so this is a real feature, not decoration.
// Phase 3: reads the status and the demo action from the store instead of props.

import { useMarketStore } from '../store/marketStore'
import type { ConnectionState } from '../types'

// Lookup table: state → colour + text. Cleaner than a chain of if/else.
// Record<ConnectionState, ...> makes TypeScript complain if we forget any state.
const STYLES: Record<ConnectionState, { dot: string; label: string }> = {
  connecting: { dot: 'bg-accent animate-pulse', label: 'Connecting' },
  connected: { dot: 'bg-up', label: 'Live' },
  reconnecting: { dot: 'bg-accent animate-pulse', label: 'Reconnecting' },
  disconnected: { dot: 'bg-down', label: 'Offline' },
}

export function ConnectionBadge() {
  const status = useMarketStore((s) => s.status)
  const onSimulateDrop = useMarketStore((s) => s.simulateDrop)
  const { dot, label } = STYLES[status.state]

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* The status pill */}
      <span className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1">
        {/* the coloured dot: size-2 = 8×8px, rounded-full = circle */}
        <span className={`size-2 rounded-full ${dot}`} />
        {label}
        {/* While waiting to retry, show the attempt number and the backoff delay */}
        {status.state === 'reconnecting' && status.nextRetryMs !== null && (
          <span className="text-muted">
            · attempt {status.attempt} · retry in {(status.nextRetryMs / 1000).toFixed(1)}s
          </span>
        )}
      </span>

      {/* DEMO button: kills the socket so you can WATCH the reconnect + resubscribe work.
          max-sm:hidden: a developer tool, so it's hidden on phones (under 640px) to save space */}
      <button
        type="button"
        onClick={onSimulateDrop}
        className="rounded border border-border px-2 py-1 text-muted hover:text-text max-sm:hidden"
        title="Close the WebSocket as if the network dropped"
      >
        Simulate drop
      </button>
    </div>
  )
}
