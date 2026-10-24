// FeedStats.tsx: shows "12 msg/s → 9 renders/s" in the header.
// It makes the batching VISIBLE: WebSocket messages in, store updates (render passes) out.
// The second number can never go above ~60 (one per frame), however many messages arrive.

import { useMarketStore } from '../store/marketStore'

export function FeedStats() {
  // Selector returns the feedStats object. It's replaced only once a second, so this
  // component re-renders once a second (not on every tick).
  const { messagesPerSec, updatesPerSec } = useMarketStore((s) => s.feedStats)

  return (
    // tabular-nums: digits all the same width, so the text doesn't jiggle as numbers change
    <span className="text-xs tabular-nums text-muted" title="WebSocket messages per second → store updates (React render passes) per second">
      {messagesPerSec} msg/s → {updatesPerSec} renders/s
    </span>
  )
}
