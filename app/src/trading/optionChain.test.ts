// optionChain.test.ts: UNIT TESTS for building the option chain rows (Phase 7).
// Added because the coverage report showed this file at 0%: no test ran it at all.
//
// upcomingExpiries() normally uses Date.now(). It takes the time as a PARAMETER instead, so the test
// can pass a FIXED date. Code that reads the clock (or randomness) directly is hard to test, so
// "inject" those values, and every run gets the same answer.

import { describe, expect, it } from 'vitest'
import { STRIKES_EACH_SIDE } from '../config'
import { buildStrikes, strikeStep, upcomingExpiries } from './optionChain'

describe('upcomingExpiries', () => {
  // Wednesday 2026-10-21, 12:00 UTC
  const expiries = upcomingExpiries(Date.UTC(2026, 9, 21, 12))

  it('starts at the next Friday, 08:00 UTC', () => {
    expect(expiries[0].id).toBe('2026-10-23')
    expect(new Date(expiries[0].time).getUTCHours()).toBe(8)
  })

  it('every expiry is a Friday, in order', () => {
    for (const e of expiries) expect(new Date(e.time).getUTCDay()).toBe(5) // 5 = Friday
    const times = expiries.map((e) => e.time)
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })

  it('skips to next week once this Friday 08:00 has passed', () => {
    const fridayMorning = Date.UTC(2026, 9, 23, 9) // 09:00, one hour after expiry
    expect(upcomingExpiries(fridayMorning)[0].id).toBe('2026-10-30')
  })
})

describe('strikeStep', () => {
  it.each([
    [80_000, 500],
    [3_000, 20],
    [0.16, 0.001],
  ])('spot %d → a "nice" step of %d (about 0.5%)', (spot, step) => {
    expect(strikeStep(spot)).toBeCloseTo(step, 10)
  })
})

describe('buildStrikes', () => {
  const expiry = upcomingExpiries(Date.UTC(2026, 9, 21))[1]
  const rows = buildStrikes(80_000, 0.5, expiry)
  const atm = rows[STRIKES_EACH_SIDE] // the middle row

  it('builds 201 evenly spaced strikes centred on the spot price', () => {
    expect(rows).toHaveLength(2 * STRIKES_EACH_SIDE + 1)
    expect(atm.strike).toBe(80_000)
    expect(rows[1].strike - rows[0].strike).toBe(500)
  })

  it('has a volatility SMILE: IV is lowest near the money and rises on both sides', () => {
    expect(rows[0].iv).toBeGreaterThan(atm.iv)
    expect(rows.at(-1)!.iv).toBeGreaterThan(atm.iv)
  })

  it('is deterministic: the same inputs always give the same OI', () => {
    expect(buildStrikes(80_000, 0.5, expiry)).toEqual(rows)
  })
})
