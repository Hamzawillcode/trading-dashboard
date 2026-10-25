# Real-Time Trading Dashboard & Option Chain

[![CI](https://github.com/Hamzawillcode/trading-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Hamzawillcode/trading-dashboard/actions/workflows/ci.yml)

A trading web app built with **React + TypeScript + Vite + Tailwind CSS**. It streams live market data from the Binance public APIs.

**Live demo:** https://hamzawillcode.github.io/trading-dashboard/ (works on phones too)

> Built phase by phase as a learning project. See [PLAN.md](PLAN.md) for the roadmap and [notes/](notes/) for study notes, including the [interview revision sheet](notes/INTERVIEW.md).

## Features
- Live watchlist over WebSockets (heartbeat, exponential-backoff reconnect, resubscription)
- Ticks batched with `requestAnimationFrame` to hold 60 FPS
- Candlestick charts (TradingView Lightweight Charts): REST history + live WebSocket candles
- Order screen (Market/Limit, validated against Binance's real filters, simulated execution) and positions with live P&L
- Incremental order book (snapshot + diffs) with sequence-gap resync
- 201-strike option chain with Black–Scholes prices and Greeks, virtualized with react-window
- Responsive layout with mobile tabs, dark/light theme via design tokens
- Tests: Vitest + React Testing Library + Playwright, run on GitHub Actions CI, which deploys to GitHub Pages

> Orders are simulated (real orders need authenticated API keys). Option IV and open interest are modelled; prices and Greeks are computed live from the spot price.

## Run locally
```bash
cd app
npm install
npm run dev            # http://localhost:5173
npm test               # unit + component tests (Vitest)
npm run test:e2e       # end-to-end tests (Playwright; first run: npx playwright install chromium)
```
