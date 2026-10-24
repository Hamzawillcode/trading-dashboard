// validation.ts: decides whether an order is allowed, and explains why not.
//
// Pure function again: (what the user typed + account facts) → errors per field.
// It's used in TWO places:
//   1. the order form, to show errors live under each input
//   2. the store, right before executing, because you never trust the UI alone
//      (on a real exchange, the SERVER validates again too)

import type { OrderType, Side, SymbolRules } from '../types'

// Exactly what the form holds. Inputs are STRINGS (the user may be halfway through typing "0.").
export type OrderDraft = {
  symbol: string
  side: Side
  type: OrderType
  price: string    // limit price (ignored for MARKET)
  quantity: string
}

// Facts about the account and market that the rules depend on
export type ValidationContext = {
  rules: SymbolRules
  marketPrice: number | undefined // latest price (undefined before the first tick)
  availableCash: number           // USDT not reserved by open buy orders
  availableQuantity: number       // coins not reserved by open sell orders
}

// One message per field (or none). "?" = no error for that field.
export type OrderErrors = { price?: string; quantity?: string; total?: string }

export type ValidationResult = {
  valid: boolean
  errors: OrderErrors
  quantity: number // parsed numbers, so callers don't have to parse again
  price: number    // LIMIT: the limit price. MARKET: the current market price
  notional: number // order value = price × quantity
}

// How many decimals a step has: 0.01 → 2, 0.00001 → 5, 1 → 0.
// (Steps are powers of 10, so −log10(step) is the decimal count. Math.round absorbs float noise.)
export const decimalsOf = (step: number) => Math.max(0, Math.round(-Math.log10(step)))

// Is `value` a whole number of `step`s? e.g. (67250.50, 0.01) → yes, (67250.505, 0.01) → no.
// We can't use value % step === 0: with floats, 0.3 % 0.1 = 0.09999999999999998.
// So divide, and check the result is "close enough" to a whole number.
export function isMultipleOf(value: number, step: number): boolean {
  const n = value / step
  return Math.abs(n - Math.round(n)) < 1e-6
}

// Round DOWN to a valid step and return it as input text, e.g. (0.123456, 0.0001) → "0.1234".
// Down, never up: rounding up could ask for more than you can afford.
export function floorToStep(value: number, step: number): string {
  const floored = Math.floor(value / step + 1e-9) * step // + tiny epsilon: 0.3/0.1 = 2.9999999999999996
  return floored.toFixed(decimalsOf(step))
}

export function validateOrder(draft: OrderDraft, ctx: ValidationContext): ValidationResult {
  const { rules } = ctx
  const errors: OrderErrors = {}

  // ----- QUANTITY -----
  const quantity = Number(draft.quantity)
  if (draft.quantity.trim() === '' || !(quantity > 0)) {
    errors.quantity = 'Enter a quantity'
  } else if (quantity < rules.minQty) {
    errors.quantity = `Minimum is ${rules.minQty}`
  } else if (!isMultipleOf(quantity, rules.stepSize)) {
    errors.quantity = `Must be a multiple of ${rules.stepSize}`
  } else if (draft.side === 'SELL' && quantity > ctx.availableQuantity + 1e-12) {
    // (spot trading: you can only sell coins you own. 1e-12 = float tolerance)
    errors.quantity = 'More than you hold'
  }

  // ----- PRICE -----
  let price: number
  if (draft.type === 'LIMIT') {
    price = Number(draft.price)
    if (draft.price.trim() === '' || !(price > 0)) {
      errors.price = 'Enter a price'
    } else if (!isMultipleOf(price, rules.tickSize)) {
      errors.price = `Price step is ${rules.tickSize}`
    }
  } else {
    // MARKET: we don't choose a price, so use the latest one as the estimate
    price = ctx.marketPrice ?? NaN
    if (ctx.marketPrice === undefined) errors.price = 'Waiting for a live price…'
  }

  // ----- TOTAL (only meaningful once price and quantity are both OK) -----
  const notional = price * quantity
  if (!errors.price && !errors.quantity) {
    if (notional < rules.minNotional) {
      errors.total = `Order value must be at least ${rules.minNotional} USDT`
    } else if (draft.side === 'BUY' && notional > ctx.availableCash + 1e-9) {
      errors.total = 'Not enough USDT'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, quantity, price, notional }
}
