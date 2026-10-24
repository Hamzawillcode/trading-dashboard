// FrameBatcher.ts: collects many fast updates and hands them over ONCE per screen frame.
//
// THE PROBLEM it solves:
//   The screen repaints at most ~60 times a second (one "frame" every 16.6 ms).
//   If 100 messages arrive in one second and each one updates React state, React
//   does 100 renders, but the user can only ever SEE 60 frames. The extra work is wasted,
//   and if it piles up the UI stutters ("jank").
//
// THE FIX: requestAnimationFrame (rAF)
//   rAF(callback) asks the browser: "run this right before you paint the next frame".
//   So instead of updating state on every message, we:
//     1. put each message in a waiting Map (the "buffer")
//     2. ask for ONE rAF if we haven't already
//     3. when the frame comes, hand the whole buffer over in a single update
//
//   message ─┐
//   message ─┼─> pending Map ──(next frame)──> flush(batch)  → ONE store update → ONE render
//   message ─┘
//
// COALESCING: the buffer is keyed (e.g. by symbol). If BTC updates 3 times inside one
// frame, only the LATEST BTC value is kept. Nobody could have seen the other two anyway.
//
// Plain TypeScript, no React: it could batch anything (tickers, trades, order-book rows).

export class FrameBatcher<T> {
  // Updates waiting for the next frame. Map: key → latest value (newer values overwrite older ones)
  private pending = new Map<string, T>()
  // The id rAF gave us, so we know a frame is already booked (and can cancel it). null = none booked
  private frameId: number | null = null
  // What to do with each batch (given to us by whoever creates the batcher)
  private onFlush: (batch: Map<string, T>) => void

  constructor(onFlush: (batch: Map<string, T>) => void) {
    this.onFlush = onFlush
  }

  // Add one update. Cheap: just a Map write, plus booking a frame if none is booked yet.
  push(key: string, value: T) {
    this.pending.set(key, value)
    if (this.frameId === null) {
      this.frameId = requestAnimationFrame(this.flush)
    }
  }

  // Stop: cancel the booked frame and throw away anything waiting (used in useEffect cleanup)
  cancel() {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    this.frameId = null
    this.pending.clear()
  }

  // Runs once per frame (at most). An ARROW FUNCTION so `this` still points at the batcher
  // when the browser calls it later (a normal method passed as a callback would lose `this`).
  private flush = () => {
    this.frameId = null
    const batch = this.pending
    this.pending = new Map() // start a fresh buffer BEFORE flushing, so new messages go there
    this.onFlush(batch)
  }
}
