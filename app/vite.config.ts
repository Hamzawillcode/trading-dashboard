// vite.config.ts: settings for Vite (the dev server + build tool).
// "Plugins" teach Vite extra tricks.
//
// Phase 9: the same file also configures VITEST (the `test` section). Vitest reuses Vite's
// plugins and settings, so tests understand TSX, imports and paths exactly like the app does.

import react from '@vitejs/plugin-react'       // understands JSX/TSX + enables fast refresh (HMR) for React
import tailwindcss from '@tailwindcss/vite'    // scans our files for Tailwind classes and generates the CSS
import { defineConfig } from 'vitest/config'   // Vite's defineConfig, plus types for the `test` section

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // BASE = the folder the site is served from. Locally that's the root ("/").
  // On GitHub Pages (Phase 10) the site lives at https://<user>.github.io/trading-dashboard/,
  // so the CI deploy job sets BASE_PATH=/trading-dashboard/ and Vite prefixes every asset URL with it.
  // Without this, the deployed page would request /assets/index.js from the wrong folder and show a blank page.
  base: process.env.BASE_PATH ?? '/',
  test: {
    // jsdom = a fake browser (document, window, localStorage) written in JavaScript, running in Node.
    // Component tests need it to render React. It's much faster than starting a real browser.
    environment: 'jsdom',
    // Runs before every test file (adds matchers like toBeInTheDocument, cleans up between tests)
    setupFiles: ['./src/test/setup.ts'],
    // Unit + component tests live NEXT TO the code they test: portfolio.ts → portfolio.test.ts.
    // The Playwright tests in e2e/ are run by Playwright, not Vitest, so they're not included here.
    include: ['src/**/*.test.{ts,tsx}'],
    // COVERAGE (npm run test:coverage): which lines did the tests actually run?
    // Reported for the logic we unit-test. A high % doesn't prove the tests check the right things,
    // but a LOW % shows code that no test touches at all.
    coverage: {
      include: ['src/trading/**', 'src/services/LocalOrderBook.ts', 'src/services/BookSide.ts', 'src/store/tradingStore.ts', 'src/components/OrderForm.tsx'],
      reporter: ['text', 'html'], // a table in the terminal + a clickable report in coverage/index.html
    },
  },
})
