// CandleChart.tsx: a candlestick chart (TradingView Lightweight Charts) that loads
// HISTORY over REST and then updates LIVE over a WebSocket.
//
// WHY useRef HERE: the chart library is NOT React. It draws on a <canvas> itself and
// needs a real DOM element to live in. React gives us that element through a ref:
//   <div ref={containerRef} />  → after mounting, containerRef.current is the actual <div>
// We also keep the chart and series objects in refs: they must survive re-renders,
// and changing them shouldn't cause one.
//
// WHY THE LIVE UPDATES SKIP REACT: series.update(candle) redraws the canvas directly.
// No setState, no re-render, no virtual DOM diff, so it's the cheapest possible update path.
// React only handles the "loading / error" overlay.
//
// Two effects, two lifetimes:
//   Effect 1, [] (once):                create the chart  → cleanup: destroy it
//   Effect 2, [symbol, interval]:       load history + open live stream → cleanup: cancel both

import { useEffect, useRef, useState } from 'react'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { BINANCE_WS_URLS } from '../config'
import { BinanceSocket } from '../services/BinanceSocket'
import { fetchCandles } from '../services/binanceRest'
import { isKlineMessage, klineStream, klineToCandle } from '../services/binanceMessages'
import type { Candle, ChartInterval } from '../types'
import { priceDecimals } from '../utils/format'

// The chart draws on a canvas, so it can't use our Tailwind classes. These hex values
// are copied from the design tokens in index.css (--color-up, --color-down, ...).
const COLORS = { up: '#0ecb81', down: '#f6465d', text: '#848e9c', grid: '#2b313966' }

// The library wants `time` typed as its own UTCTimestamp type (a number with a "brand").
// This converts our plain Candle into the shape the library expects.
const toBar = (c: Candle) => ({ ...c, time: c.time as UTCTimestamp })

type Props = {
  symbol: string
  interval: ChartInterval
}

export function CandleChart({ symbol, interval }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  // The only React state: what the overlay should say
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading')

  // ===== EFFECT 1: create the chart ONCE, destroy it on unmount =====
  useEffect(() => {
    const chart = createChart(containerRef.current!, {
      autoSize: true, // follow the container's size (uses a ResizeObserver inside)
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: COLORS.text },
      grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
      timeScale: { timeVisible: true, secondsVisible: false }, // show hours:minutes on the time axis
    })
    // A chart can hold many series (candles, volume, lines...). We add one: candlesticks.
    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      borderVisible: false,
    })
    chartRef.current = chart

    // CLEANUP: free the canvas, listeners and ResizeObserver (StrictMode runs this in dev, too)
    return () => {
      chart.remove()
      chartRef.current = seriesRef.current = null
    }
  }, [])

  // ===== EFFECT 2: whenever symbol or interval changes, load history + stream live candles =====
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return

    setLoad('loading')
    series.setData([]) // clear the previous symbol's candles right away

    // AbortController = a "cancel button" for fetch(). If the user switches symbol
    // before the request finishes, cleanup aborts it, so the OLD answer can't draw over the NEW chart.
    const controller = new AbortController()

    // RACE CONDITION: the WebSocket may deliver a live candle BEFORE the history arrives.
    // setData() would then wipe it out. So until history is in, we park live candles here.
    let historyLoaded = false
    const early: Candle[] = []

    // ---- LIVE: a socket just for this symbol+interval's candle stream ----
    const socket = new BinanceSocket({
      urls: BINANCE_WS_URLS,
      onStatusChange: () => {}, // the header badge already shows the main connection's health
      onMessage: (msg) => {
        // Ignore anything that isn't a candle for exactly what we're showing
        if (!isKlineMessage(msg) || msg.s !== symbol || msg.k.i !== interval) return
        const candle = klineToCandle(msg)
        // update(): same time as the last bar → REPLACE it (the forming candle moved);
        //           newer time → APPEND a new bar (a new minute started).
        if (historyLoaded) series.update(toBar(candle))
        else early.push(candle)
      },
    })
    socket.subscribe([klineStream(symbol, interval)])
    socket.connect()

    // ---- HISTORY: async/await version of "fetch, then draw, or show an error" ----
    // (An arrow function in a const, so TypeScript remembers `series` isn't null in here.)
    const loadHistory = async () => {
      try {
        const candles = await fetchCandles(symbol, interval, controller.signal)
        series.setData(candles.map(toBar))

        // Replay live candles that arrived early, skipping any older than the history's last bar
        const lastTime = candles.at(-1)?.time ?? 0
        early.filter((c) => c.time >= lastTime).forEach((c) => series.update(toBar(c)))
        historyLoaded = true

        // Price axis decimals: 2 for BTC (67,250.50), 4 for cheap coins like DOGE (0.1234)
        const decimals = priceDecimals(candles.at(-1)?.close ?? 1)
        series.applyOptions({ priceFormat: { type: 'price', precision: decimals, minMove: 10 ** -decimals } })

        setLoad('ready')
      } catch {
        // Cancelled on purpose (symbol changed / unmounted)? Then it's not an error.
        if (!controller.signal.aborted) setLoad('error')
      }
    }
    loadHistory()

    // CLEANUP: runs before the next symbol/interval loads, and on unmount
    return () => {
      controller.abort()
      socket.close()
    }
  }, [symbol, interval])

  return (
    // relative: lets the overlay below position itself on top of the chart
    <div className="relative h-full w-full">
      {/* The library fills this div with its <canvas>. absolute inset-0 = stretch to all 4 edges */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Overlay while loading or on failure. pointer-events-none = clicks pass through to the chart */}
      {load !== 'ready' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">
          {load === 'loading' ? 'Loading candles…' : 'Could not load chart history. Check your connection.'}
        </div>
      )}
    </div>
  )
}
