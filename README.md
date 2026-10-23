# Real-Time Trading Dashboard & Option Chain

A trading web app built with **React + TypeScript + Vite + Tailwind CSS**. It streams live market data from the Binance public APIs.

> 🚧 In progress: built phase by phase. See [PLAN.md](PLAN.md) for the roadmap and [notes/](notes/) for study notes.

## Features (planned)
- Live watchlist over WebSockets (heartbeat, exponential-backoff reconnect, resubscription)
- Ticks batched with `requestAnimationFrame` to hold 60 FPS
- Candlestick charts (TradingView Lightweight Charts)
- Order screen (Market/Limit with validation, simulated execution) and positions with live P&L
- Incremental order book with sequence-gap resync
- 200+ strike option chain with Black–Scholes Greeks, virtualized with react-window
- Tests: Vitest + React Testing Library + Playwright, on GitHub Actions CI

## Run locally
```bash
cd app
npm install
npm run dev   # http://localhost:5173
```
