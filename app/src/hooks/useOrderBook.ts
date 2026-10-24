// useOrderBook.ts: keeps a LIVE order book for one symbol, following Binance's documented
// algorithm "How to manage a local order book correctly":
//
//   1. Open the WebSocket diff stream (<symbol>@depth@100ms) and BUFFER the diffs
//   2. Once the first diff has arrived, GET the REST snapshot (/api/v3/depth)
//   3. If the snapshot is OLDER than the first buffered diff (lastUpdateId < its U), fetch again
//   4. Load the snapshot, then apply the buffered diffs (stale ones are skipped automatically)
//   5. From then on, apply each new diff as it arrives
//   6. If a diff shows a GAP in the update ids, the book can't be trusted: go back to step 2
//
// The FULL book (often 1000+ levels per side) stays in a plain object outside React.
// React only receives the TOP 8 levels, at most once per animation frame (the Phase 3 batcher).
//
// State is LOCAL to this hook (useState), not in a Zustand store: only the order book panel needs it.
// The component using it is remounted with key={symbol}, so a new symbol always starts from EMPTY.

import { useEffect, useRef, useState } from 'react'
import { BINANCE_WS_URLS, BOOK_LEVELS_SHOWN } from '../config'
import { BinanceSocket } from '../services/BinanceSocket'
import { FrameBatcher } from '../services/FrameBatcher'
import { LocalOrderBook } from '../services/LocalOrderBook'
import { depthStream, isDepthMessage, toDepthDiff } from '../services/binanceMessages'
import { fetchDepth } from '../services/binanceRest'
import type { DepthDiff, OrderBookView } from '../types'

const EMPTY: OrderBookView = { bids: [], asks: [], lastUpdateId: 0, status: 'syncing', resyncs: 0 }

export function useOrderBook(symbol: string) {
  const [view, setView] = useState<OrderBookView>(EMPTY)
  // Lets the demo button reach the "drop the next message" switch inside the effect
  const simulateGapRef = useRef(() => {})

  useEffect(() => {
    const book = new LocalOrderBook()
    let synced = false             // true once snapshot + buffer have been applied
    let syncing = false            // true while a snapshot request is in flight
    let buffer: DepthDiff[] = []   // diffs that arrived while we weren't synced yet
    let resyncs = 0
    let dropNext = false           // demo: pretend the next message got lost
    let controller: AbortController | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    // Publish the top levels to React, at most once per frame (many diffs → one render)
    const publisher = new FrameBatcher<null>(() =>
      setView({
        bids: book.bids.top(BOOK_LEVELS_SHOWN),
        asks: book.asks.top(BOOK_LEVELS_SHOWN),
        lastUpdateId: book.lastUpdateId,
        status: 'live',
        resyncs,
      }),
    )

    // ----- Steps 2–4: snapshot, then replay the buffer -----
    async function sync() {
      syncing = true
      synced = false
      controller?.abort() // cancel any older snapshot request still running
      controller = new AbortController()
      try {
        const snapshot = await fetchDepth(symbol, controller.signal)

        // Step 3: the snapshot must not be older than the first diff we're holding,
        // otherwise there would be a hole between the two. Try again shortly.
        if (snapshot.lastUpdateId < buffer[0].firstUpdateId) {
          retryTimer = setTimeout(sync, 500)
          return
        }

        // Step 4: load it and apply the buffered diffs on top (stale ones return 'stale' and are skipped)
        book.loadSnapshot(snapshot)
        for (const diff of buffer) {
          if (book.applyDiff(diff) === 'gap') return resync()
        }
        buffer = []
        synced = true
        syncing = false
        publisher.push('book', null)
      } catch {
        if (controller.signal.aborted) return // cancelled on purpose (symbol changed)
        setView((v) => ({ ...v, status: 'error' }))
        retryTimer = setTimeout(sync, 3000) // network trouble: try again in 3s
      }
    }

    // Step 6: a gap was detected. Throw away the book's trust and rebuild from a new snapshot.
    function resync(fromDiff?: DepthDiff) {
      resyncs += 1
      buffer = fromDiff ? [fromDiff] : []
      setView((v) => ({ ...v, status: 'syncing', resyncs }))
      if (fromDiff) sync() // otherwise sync() starts when the next diff arrives
      else syncing = false
    }

    // ----- Step 1: the diff stream -----
    const socket = new BinanceSocket({
      urls: BINANCE_WS_URLS,
      onStatusChange: () => {}, // a reconnect needs no special code: the next diff shows a gap → resync
      onMessage: (msg) => {
        if (!isDepthMessage(msg) || msg.s !== symbol) return
        if (dropNext) {
          dropNext = false // DEMO: this message is "lost on the network"
          return
        }
        const diff = toDepthDiff(msg)

        if (!synced) {
          buffer.push(diff)
          if (!syncing) sync() // the first buffered diff starts the snapshot request
          return
        }

        // Step 5: live updates
        const result = book.applyDiff(diff)
        if (result === 'gap') resync(diff)
        else if (result === 'applied') publisher.push('book', null)
      },
    })
    socket.subscribe([depthStream(symbol)])
    socket.connect()

    simulateGapRef.current = () => {
      dropNext = true
    }

    // CLEANUP: symbol changed or panel removed → stop everything
    return () => {
      controller?.abort()
      clearTimeout(retryTimer)
      publisher.cancel()
      socket.close()
      simulateGapRef.current = () => {}
    }
  }, [symbol])

  return { view, simulateGap: () => simulateGapRef.current() }
}
