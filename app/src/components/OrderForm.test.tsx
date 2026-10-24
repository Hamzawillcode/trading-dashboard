// OrderForm.test.tsx: COMPONENT TESTS with React Testing Library (RTL).
//
// RTL renders the real component into jsdom (a fake browser) and lets us use it LIKE A USER:
//   • FIND things the way a user does: by role and visible label ("the Quantity box", "the Buy BTC
//     button"), NOT by CSS classes or component internals. If we restyle or refactor, tests still pass.
//     If a screen-reader user couldn't find the button, the test can't either: a free accessibility check.
//   • ACT with userEvent: real typing (key by key) and clicks, firing the same events a browser would.
//   • ASSERT on what's VISIBLE: messages, input values, balances. Never on useState values.
//
// "The more your tests resemble the way your software is used, the more confidence they can give you."

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useMarketStore } from '../store/marketStore'
import { useTradingStore } from '../store/tradingStore'
import { OrderForm } from './OrderForm'

// Put the stores in a known state: BTC at exactly 50,000 and a fresh 10,000 USDT account
beforeEach(() => {
  useTradingStore.getState().reset()
  useMarketStore.setState({
    tickers: {
      BTCUSDT: { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', price: 50_000, changePercent: 0, high: 0, low: 0, volume: 0 },
    },
  })
})

// The inputs are wrapped in a <label> with the text "Quantity", so their accessible name contains it
const quantityBox = () => screen.getByRole('textbox', { name: /quantity/i })

function setup() {
  // userEvent.setup() creates a simulated user. Its actions are async (await them), like real input.
  const user = userEvent.setup()
  render(<OrderForm symbol="BTCUSDT" />)
  return { user }
}

describe('OrderForm', () => {
  it('places a market buy and shows the result', async () => {
    const { user } = setup()

    await user.type(quantityBox(), '0.01')
    await user.click(screen.getByRole('button', { name: 'Buy BTC' }))

    // What the user sees: a confirmation, the box cleared, and less cash available
    expect(screen.getByRole('status')).toHaveTextContent('Bought 0.01000 BTC at 50,000.00')
    expect(quantityBox()).toHaveValue('')
    expect(screen.getByText(/9,500\.00 USDT/)).toBeInTheDocument()
    // ...and the account really changed
    expect(useTradingStore.getState().positions.BTCUSDT?.quantity).toBe(0.01)
  })

  it('shows a validation error while typing, and refuses to submit', async () => {
    const { user } = setup()

    await user.type(quantityBox(), '0.000001')
    expect(screen.getByText('Minimum is 0.00001')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Buy BTC' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument() // queryBy: returns null instead of throwing
    expect(useTradingStore.getState().history).toHaveLength(0)
  })

  it('only complains about an empty field after a submit attempt', async () => {
    const { user } = setup()
    expect(screen.queryByText('Enter a quantity')).not.toBeInTheDocument() // don't nag on an untouched form

    await user.click(screen.getByRole('button', { name: 'Buy BTC' }))
    expect(screen.getByText('Enter a quantity')).toBeInTheDocument()
  })

  it('ignores letters typed into the quantity box', async () => {
    const { user } = setup()
    await user.type(quantityBox(), '1a.b5')
    expect(quantityBox()).toHaveValue('1.5')
  })

  it('fills the quantity from the % buttons, rounded down to the step size', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: '50%' }))
    expect(quantityBox()).toHaveValue('0.10000') // 50% of 10,000 USDT ÷ 50,000 = 0.1 BTC
  })

  it('cannot sell coins you do not hold', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Sell' }))
    await user.type(quantityBox(), '0.01')

    expect(screen.getByText('More than you hold')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sell BTC' })).toBeInTheDocument()
  })

  it('switching to Limit pre-fills the price with the current price', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Limit' }))
    expect(screen.getByRole('textbox', { name: /price/i })).toHaveValue('50000.00')
  })
})
