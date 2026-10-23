// useLiveTickers.ts: a CUSTOM HOOK that connects React to the BinanceSocket.
//
// A custom hook is a function whose name starts with "use" and which uses other
// hooks inside. It packages reusable logic (here: "open a socket, keep prices in
// state, clean up when done") so any component can just write:
//
//   const { tickers, status } = useLiveTickers(['BTCUSDT', 'ETHUSDT'])
//
// ⚠ Known limitation (fixed on purpose in Phase 3): every single message calls
// setTickers, so React re-renders on EVERY tick. With many symbols that's 100+
// renders/sec. Phase 3 batches ticks with requestAnimationFrame and moves them into a Zustand store.

import { useEffect, useRef, useState } from 'react'
import { BINANCE_WS_URLS } from '../config'
import { BinanceSocket } from '../services/BinanceSocket'
import { isTickerMessage, tickerStream, toTicker } from '../services/binanceMessages'
import type { ConnectionStatus, TickerMap } from '../types'

export function useLiveTickers(symbols: string[]) {
  // Latest ticker per symbol. Starts empty: rows show "—" until the first update.
  const [tickers, setTickers] = useState<TickerMap>({})
  const [status, setStatus] = useState<ConnectionStatus>({
    state: 'connecting',
    attempt: 0,
    nextRetryMs: null,
  })

  // useRef holds a value that survives re-renders WITHOUT causing a re-render when changed.
  // Perfect for an object like a socket that the UI doesn't display directly.
  const socketRef = useRef<BinanceSocket | null>(null)

  // Turn the array into a string so the effect below re-runs only when the symbols
  // ACTUALLY change. A new array with the same contents would otherwise count as "changed".
  const symbolsKey = symbols.join(',')

  useEffect(() => {
    // ---- SETUP: runs after the component first appears on screen ----
    const socket = new BinanceSocket({
      urls: BINANCE_WS_URLS,
      onStatusChange: setStatus,
      onMessage: (msg) => {
        if (!isTickerMessage(msg)) return
        const ticker = toTicker(msg)
        if (!ticker) return
        // Functional update: (prev) => next. Always based on the LATEST state, even
        // when many updates happen quickly. "...prev" copies the old map, and then we replace
        // one entry. We create a NEW object (immutability) so React notices the change.
        setTickers((prev) => ({ ...prev, [ticker.symbol]: ticker }))
      },
    })
    socketRef.current = socket
    socket.subscribe(symbolsKey.split(',').map(tickerStream))
    socket.connect()

    // ---- CLEANUP: runs when the component disappears or the symbols change ----
    // Without this, every re-mount would leave an old socket open: a memory and
    // network LEAK. (In dev, StrictMode mounts → unmounts → mounts again on purpose
    // to catch exactly this kind of bug.)
    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [symbolsKey])

  // Expose a way to fake a network drop (for the demo button in the header)
  const simulateDrop = () => socketRef.current?.simulateDrop()

  return { tickers, status, simulateDrop }
}
