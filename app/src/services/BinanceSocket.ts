// BinanceSocket.ts: a RESILIENT WebSocket client (plain TypeScript, no React).
//
// A bare `new WebSocket(url)` is fragile: if Wi-Fi blips or the server restarts,
// it just dies and the prices freeze. This class wraps it and adds the 3 features
// from the resume:
//
//   1. HEARTBEAT: notices a connection that is "silently dead" (no data, no error)
//   2. EXPONENTIAL BACKOFF RECONNECT: retries after ~1s, 2s, 4s, 8s... (+ random jitter)
//   3. RESUBSCRIPTION: remembers which streams we wanted and re-subscribes after reconnecting
//
// Lifecycle:
//
//   connect() ──> CONNECTING ──open──> CONNECTED ──(close / heartbeat timeout)──> RECONNECTING
//                     ^                                                              │
//                     └───────────── wait backoff delay, then connect() again ───────┘
//   close() (by us, on purpose) ──> DISCONNECTED  (no more retries)

import type { ConnectionStatus } from '../types'

// ----- Tuning knobs (milliseconds) -----
const BASE_DELAY = 1_000          // first retry waits ~1s
const MAX_DELAY = 30_000          // never wait longer than 30s between retries
const HEARTBEAT_CHECK = 5_000     // how often we check whether the connection is alive
const PING_AFTER_IDLE = 10_000    // silent for 10s → send a "ping" request
const DEAD_AFTER_IDLE = 20_000    // silent for 20s → assume dead and reconnect

// The endpoint that most recently connected, SHARED by every BinanceSocket (a module-level variable).
// On networks where the first URL is blocked, the first socket fails over to the second one.
// The chart's and order book's sockets then start straight on the URL that works, instead of
// each failing (and waiting ~1s) on the blocked one first.
let lastGoodUrl: string | null = null

type Options = {
  urls: string[]                                  // endpoints to try (rotates on each reconnect)
  onMessage: (data: unknown) => void              // called with every parsed data message
  onStatusChange: (status: ConnectionStatus) => void // called whenever the connection state changes
}

export class BinanceSocket {
  private ws: WebSocket | null = null
  private opts: Options

  // The streams we WANT, e.g. {"btcusdt@ticker", "ethusdt@ticker"}.
  // A Set = a collection with no duplicates. This is our memory for RESUBSCRIPTION.
  private subscriptions = new Set<string>()

  private attempt = 0                // consecutive failed attempts (drives the backoff)
  private urlIndex = 0               // which URL in opts.urls we're using
  private requestId = 0              // Binance wants a unique id on every request we send
  private lastMessageAt = 0          // timestamp of the last message received (for the heartbeat)
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private closedByUser = false       // true after close(): don't auto-reconnect

  constructor(opts: Options) {
    this.opts = opts
    // Start on the URL that last worked, if it's one of ours
    const preferred = lastGoodUrl ? opts.urls.indexOf(lastGoodUrl) : -1
    if (preferred > 0) this.urlIndex = preferred
  }

  // ===================== PUBLIC API =====================

  // Open the connection
  connect() {
    this.closedByUser = false
    this.emitStatus(this.attempt === 0 ? 'connecting' : 'reconnecting')

    const url = this.opts.urls[this.urlIndex % this.opts.urls.length]
    const ws = new WebSocket(url)
    this.ws = ws

    // The 4 WebSocket events: open, message, close, error
    ws.onopen = () => {
      lastGoodUrl = url // remember it for sockets created later
      this.handleOpen()
    }
    ws.onmessage = (event) => this.handleMessage(event)
    ws.onclose = () => this.handleDisconnect()
    // "error" is always followed by "close", so we handle everything in close.
    ws.onerror = () => {}
  }

  // Start receiving these streams. Remember them so we can resubscribe after a reconnect.
  subscribe(streams: string[]) {
    streams.forEach((s) => this.subscriptions.add(s))
    this.send('SUBSCRIBE', streams) // only sends if connected; otherwise handleOpen() does it
  }

  unsubscribe(streams: string[]) {
    streams.forEach((s) => this.subscriptions.delete(s))
    this.send('UNSUBSCRIBE', streams)
  }

  // Close ON PURPOSE (e.g. the component using us is removed). No reconnect after this.
  close() {
    this.closedByUser = true
    this.clearTimers()
    this.detachAndClose()
    this.emitStatus('disconnected')
  }

  // DEMO ONLY: kill the connection as if the network dropped, to watch the reconnect logic work.
  simulateDrop() {
    this.ws?.close()
  }

  // ===================== EVENT HANDLERS =====================

  private handleOpen() {
    this.attempt = 0                // healthy again → reset the backoff
    this.lastMessageAt = Date.now()
    this.emitStatus('connected')

    // RESUBSCRIPTION: a brand-new connection knows nothing about our old
    // subscriptions, so re-send everything we remembered.
    if (this.subscriptions.size > 0) this.send('SUBSCRIBE', [...this.subscriptions])

    this.startHeartbeat()
  }

  private handleMessage(event: MessageEvent) {
    this.lastMessageAt = Date.now() // ANY message proves the connection is alive

    // Messages arrive as text. Parse them into objects (and ignore anything that isn't valid JSON)
    let msg: unknown
    try {
      msg = JSON.parse(event.data as string)
    } catch {
      return
    }
    // Replies to our own requests look like {"result": ..., "id": 7}. They're not market data.
    if (msg && typeof msg === 'object' && 'id' in msg && 'result' in msg) return

    this.opts.onMessage(msg)
  }

  // Called when the socket closes for ANY reason (network drop, server restart, heartbeat timeout)
  private handleDisconnect() {
    this.clearTimers()
    this.detachAndClose()
    if (this.closedByUser) return // we closed it on purpose: stay closed
    this.scheduleReconnect()
  }

  // ===================== RECONNECT: exponential backoff + jitter =====================

  private scheduleReconnect() {
    // Exponential: 1s, 2s, 4s, 8s, 16s, 30s, 30s... (capped at MAX_DELAY)
    const exp = Math.min(MAX_DELAY, BASE_DELAY * 2 ** this.attempt)
    // JITTER: pick a random delay between 50% and 100% of exp.
    // If a server restarts, thousands of clients disconnect at the SAME moment.
    // Without jitter they'd all retry at the same instant too (a "thundering herd").
    const delay = Math.round(exp / 2 + Math.random() * (exp / 2))

    this.attempt += 1
    this.urlIndex += 1 // try the next endpoint this time (helps if one URL is blocked)
    this.emitStatus('reconnecting', delay)

    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  // ===================== HEARTBEAT =====================
  // Why: a connection can die WITHOUT a close event (e.g. laptop sleep, router
  // drops the line). The browser may think it's open for minutes while no data arrives.
  //
  // Binance's server sends protocol-level ping frames and the browser answers them
  // automatically, but JavaScript can't see or send those frames. So we run our
  // own APPLICATION-level heartbeat:
  //   • every 5s, check how long since the last message
  //   • silent > 10s → send a cheap request (LIST_SUBSCRIPTIONS) as a "ping". The reply is our "pong"
  //   • silent > 20s → the connection is dead: drop it and reconnect
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const idle = Date.now() - this.lastMessageAt
      if (idle > DEAD_AFTER_IDLE) {
        this.handleDisconnect()
      } else if (idle > PING_AFTER_IDLE) {
        this.send('LIST_SUBSCRIPTIONS')
      }
    }, HEARTBEAT_CHECK)
  }

  // ===================== HELPERS =====================

  // Send a request in Binance's format: {"method": "SUBSCRIBE", "params": [...], "id": 1}
  private send(method: string, params?: string[]) {
    if (this.ws?.readyState !== WebSocket.OPEN) return // not connected: nothing to do
    this.ws.send(JSON.stringify({ method, params, id: ++this.requestId }))
  }

  // Remove our handlers first (so this old socket can't trigger anything), then close it
  private detachAndClose() {
    const ws = this.ws
    if (!ws) return
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
    if (ws.readyState === WebSocket.CONNECTING) {
      // Closing a socket that's still CONNECTING makes the browser log a scary warning
      // ("closed before the connection is established"). This happens a lot in development,
      // where StrictMode mounts → unmounts → remounts every component. So close it the moment it opens.
      ws.onopen = () => ws.close()
    } else {
      ws.close()
    }
    this.ws = null
  }

  private clearTimers() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.heartbeatTimer = this.reconnectTimer = null
  }

  private emitStatus(state: ConnectionStatus['state'], nextRetryMs: number | null = null) {
    this.opts.onStatusChange({ state, attempt: this.attempt, nextRetryMs })
  }
}
