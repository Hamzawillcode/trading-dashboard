// playwright.config.ts: settings for the END-TO-END tests in e2e/ (Phase 9).
//
// Playwright drives a REAL browser (Chromium) against the REAL app: it clicks, types and reads the
// page exactly like a user. Run with:  npm run test:e2e   (add --ui to watch it step by step)

import { defineConfig, devices } from '@playwright/test'

const PORT = 5199 // a separate port, so the tests never collide with your own `npm run dev` on 5173

export default defineConfig({
  testDir: './e2e',
  // Retries hide flakiness locally (bad), but in CI a single network hiccup shouldn't fail a build
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // When a test fails, keep a TRACE: a step-by-step recording with DOM snapshots, network and
    // console. Open it with `npx playwright show-trace <file>` to see exactly what went wrong.
    trace: 'retain-on-failure',
  },
  // Start the app before the tests (and stop it after). Reuses one that's already running locally.
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  // Run every test on a desktop screen AND on a phone screen (Phase 8's responsive layout)
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
