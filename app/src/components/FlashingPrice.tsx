// FlashingPrice.tsx: a price that briefly flashes green (went up) or red (went down) when it changes.
// Used by the watchlist rows and the big price in the middle panel.
//
// TRICK, restarting a CSS animation with `key`:
//   A CSS animation plays once, when the element first appears. To replay it on
//   every new price, we give the <span> key={price}. A new key tells React "this is a
//   DIFFERENT element": it throws the old <span> away and mounts a fresh one, and the
//   animation starts again. Same price → same key → no flash.

import { formatPrice } from '../utils/format'
import type { Ticker } from '../types'

// Direction → Tailwind animation class (defined in index.css under @theme)
const FLASH = { up: 'animate-flash-up', down: 'animate-flash-down' }

type Props = {
  price: number | undefined   // undefined until the first tick
  move: Ticker['move']        // 'up' | 'down' | undefined
  className?: string          // extra classes from the parent (size, colour...)
}

export function FlashingPrice({ price, move, className = '' }: Props) {
  return (
    // rounded px-1: a small pill shape so the flash looks like a highlight, not a stripe.
    // tabular-nums: equal-width digits so the number doesn't jiggle as it changes.
    <span key={price} className={`rounded px-1 tabular-nums ${move ? FLASH[move] : ''} ${className}`}>
      {formatPrice(price)}
    </span>
  )
}
