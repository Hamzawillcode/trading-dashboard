// validation.test.ts: UNIT TESTS for order validation (Binance's filters + balance checks).
//
// Validation is a classic place for bugs at the EDGES: exactly the minimum, one step off,
// floats like 0.3 / 0.1. So most tests here are BOUNDARY tests: just inside and just outside each rule.
// it.each runs the same test with a table of inputs (like JUnit's @ParameterizedTest).

import { describe, expect, it } from 'vitest'
import { SYMBOL_RULES } from '../config'
import { decimalsOf, floorToStep, isMultipleOf, validateOrder, type OrderDraft, type ValidationContext } from './validation'

// Defaults that make an order VALID. Each test changes just the one thing it's about.
const draft = (overrides: Partial<OrderDraft> = {}): OrderDraft => ({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  price: '',
  quantity: '0.01',
  ...overrides,
})
const ctx = (overrides: Partial<ValidationContext> = {}): ValidationContext => ({
  rules: SYMBOL_RULES.BTCUSDT, // tick 0.01, step 0.00001, min qty 0.00001, min value 5 USDT
  marketPrice: 50_000,
  availableCash: 10_000,
  availableQuantity: 0,
  ...overrides,
})

describe('helpers', () => {
  it.each([
    [0.01, 2],
    [0.00001, 5],
    [1, 0],
  ])('decimalsOf(%d) = %d', (step, decimals) => {
    expect(decimalsOf(step)).toBe(decimals)
  })

  it('isMultipleOf survives floating-point error', () => {
    expect(0.3 % 0.1).not.toBe(0) // why we can't just use %
    expect(isMultipleOf(0.3, 0.1)).toBe(true)
    expect(isMultipleOf(67250.5, 0.01)).toBe(true)
    expect(isMultipleOf(67250.505, 0.01)).toBe(false)
  })

  it('floorToStep rounds DOWN to the step and formats it', () => {
    expect(floorToStep(0.123456, 0.0001)).toBe('0.1234')
    expect(floorToStep(0.3, 0.1)).toBe('0.3') // not 0.2, despite 0.3/0.1 = 2.9999999999999996
    expect(floorToStep(7.9, 1)).toBe('7')
  })
})

describe('validateOrder: a good order', () => {
  it('passes, and returns the parsed numbers', () => {
    const r = validateOrder(draft(), ctx())
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual({})
    expect(r.quantity).toBe(0.01)
    expect(r.price).toBe(50_000) // MARKET → the current price
    expect(r.notional).toBe(500)
  })
})

describe('validateOrder: quantity', () => {
  it.each([
    ['', 'Enter a quantity'],
    ['0', 'Enter a quantity'],
    ['0.000001', 'Minimum is 0.00001'],
    ['0.000015', 'Must be a multiple of 0.00001'],
  ])('quantity "%s" → "%s"', (quantity, message) => {
    const r = validateOrder(draft({ quantity }), ctx())
    expect(r.valid).toBe(false)
    expect(r.errors.quantity).toBe(message)
  })

  it('accepts exactly the minimum quantity (boundary)', () => {
    const r = validateOrder(draft({ quantity: '0.0001' }), ctx()) // 0.0001 × 50,000 = 5 USDT, the min value
    expect(r.valid).toBe(true)
  })

  it('cannot sell more than you hold', () => {
    const r = validateOrder(draft({ side: 'SELL', quantity: '0.02' }), ctx({ availableQuantity: 0.01 }))
    expect(r.errors.quantity).toBe('More than you hold')
  })

  it('can sell exactly what you hold', () => {
    const r = validateOrder(draft({ side: 'SELL', quantity: '0.01' }), ctx({ availableQuantity: 0.01 }))
    expect(r.valid).toBe(true)
  })
})

describe('validateOrder: price', () => {
  it('LIMIT orders need a price', () => {
    const r = validateOrder(draft({ type: 'LIMIT', price: '' }), ctx())
    expect(r.errors.price).toBe('Enter a price')
  })

  it('LIMIT price must be on the tick size', () => {
    expect(validateOrder(draft({ type: 'LIMIT', price: '49999.99' }), ctx()).valid).toBe(true)
    expect(validateOrder(draft({ type: 'LIMIT', price: '49999.995' }), ctx()).errors.price).toBe('Price step is 0.01')
  })

  it('MARKET orders wait for the first live price', () => {
    const r = validateOrder(draft(), ctx({ marketPrice: undefined }))
    expect(r.errors.price).toBe('Waiting for a live price…')
  })
})

describe('validateOrder: order value (total)', () => {
  it('rejects orders below the minimum value', () => {
    // 0.00009 BTC × 50,000 = 4.5 USDT < 5
    const r = validateOrder(draft({ quantity: '0.00009' }), ctx())
    expect(r.errors.total).toBe('Order value must be at least 5 USDT')
  })

  it('rejects a BUY that costs more than the available cash', () => {
    const r = validateOrder(draft({ quantity: '1' }), ctx({ availableCash: 10_000 })) // costs 50,000
    expect(r.errors.total).toBe('Not enough USDT')
  })

  it('does not check the total while price or quantity is still wrong', () => {
    // one clear message at a time, instead of piling up errors from bad input
    const r = validateOrder(draft({ quantity: '' }), ctx())
    expect(r.errors.total).toBeUndefined()
  })
})
