// order-flow.spec.ts: END-TO-END tests of the main user journey: see a price → place an order →
// see the position and its P&L update.
//
// Unit and component tests check pieces in isolation. These check that EVERYTHING works together
// in a real browser: the WebSocket client, the rAF batching, the stores, the layout, the order form
// and the portfolio. They're slow (seconds, not milliseconds), so we keep only a few, for the
// journeys that matter most. (The top of the testing pyramid.)
//
// Each test gets a FRESH browser context (new cookies, empty localStorage), so tests never share state.

import { expect, test, type Page } from '@playwright/test'
import { fakeBinance } from './fakeBinance.ts'

// On a phone only one screen is visible at a time, so tap the bottom tab first.
// isMobile comes from the project settings in playwright.config.ts (desktop vs Pixel 7).
async function openTab(page: Page, isMobile: boolean, tab: 'Markets' | 'Chart' | 'Trade' | 'Portfolio') {
  if (isMobile) await page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: tab }).click()
}

// The account summary value next to a label, e.g. "Unrealized P&L" → "+50.00"
const summary = (page: Page, label: string) => page.getByText(label, { exact: true }).locator('xpath=following-sibling::span')

test('buy BTC at market, then watch the P&L follow the price', async ({ page, isMobile }) => {
  const binance = await fakeBinance(page)
  await page.goto('/')

  // Wait until the app has connected and subscribed, then publish a price
  await expect.poll(binance.isConnected).toBe(true)
  binance.setPrice('BTCUSDT', 50_000)
  // exact: true, because Playwright's locators are STRICT: a plain 'Live' would also match the
  // "...simulated against live Binance prices" note, and an ambiguous locator fails the test.
  await expect(page.getByText('Live', { exact: true })).toBeVisible()

  // ----- Place the order -----
  await openTab(page, isMobile, 'Trade')
  await page.getByRole('textbox', { name: /quantity/i }).fill('0.01')
  await page.getByRole('button', { name: 'Buy BTC' }).click()
  await expect(page.getByRole('status')).toHaveText('Bought 0.01000 BTC at 50,000.00')

  // ----- Check the portfolio -----
  await openTab(page, isMobile, 'Portfolio')
  await expect(page.getByRole('button', { name: 'Positions (1)' })).toBeVisible()
  await expect(summary(page, 'Cash')).toHaveText('9,500.00')
  await expect(summary(page, 'Unrealized P&L')).toHaveText('0.00') // no sign on zero

  // ----- The market moves: the P&L must follow, live -----
  binance.setPrice('BTCUSDT', 55_000)
  await expect(summary(page, 'Unrealized P&L')).toHaveText('+50.00') // 0.01 × 5,000
  await expect(summary(page, 'Equity')).toHaveText('10,050.00')
})

test('a limit buy waits, then fills when the price drops to it', async ({ page, isMobile }) => {
  const binance = await fakeBinance(page)
  await page.goto('/')
  await expect.poll(binance.isConnected).toBe(true)
  binance.setPrice('BTCUSDT', 50_000)

  await openTab(page, isMobile, 'Trade')
  await page.getByRole('button', { name: 'Limit' }).click()
  await page.getByRole('textbox', { name: /price/i }).fill('48000')
  await page.getByRole('textbox', { name: /quantity/i }).fill('0.01')
  await page.getByRole('button', { name: 'Buy BTC' }).click()
  await expect(page.getByRole('status')).toHaveText('Limit buy placed at 48,000.00')

  await openTab(page, isMobile, 'Portfolio')
  await expect(page.getByRole('button', { name: 'Open orders (1)' })).toBeVisible()

  binance.setPrice('BTCUSDT', 47_950) // crosses the limit
  await expect(page.getByRole('button', { name: 'Open orders (0)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Positions (1)' })).toBeVisible()
})

test('the account survives a page reload (persisted to localStorage)', async ({ page, isMobile }) => {
  const binance = await fakeBinance(page)
  await page.goto('/')
  await expect.poll(binance.isConnected).toBe(true)
  binance.setPrice('BTCUSDT', 50_000)

  await openTab(page, isMobile, 'Trade')
  await page.getByRole('textbox', { name: /quantity/i }).fill('0.02')
  await page.getByRole('button', { name: 'Buy BTC' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.reload()
  await openTab(page, isMobile, 'Portfolio')
  await expect(summary(page, 'Cash')).toHaveText('9,000.00')
})
