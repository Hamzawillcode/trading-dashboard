// useNow.ts: the current time, as STATE that refreshes every `intervalMs`.
//
// Why not just call Date.now() while rendering? Rendering should be PURE: the same props and
// state must give the same output. Date.now() is different on every call, so two renders of
// identical data could disagree. Instead, the time lives in state, and a timer updates it,
// which re-renders the component like any other state change.

import { useEffect, useState } from 'react'

export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now()) // lazy initial value: read the clock once, on mount

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer) // cleanup: stop the timer when the component goes away
  }, [intervalMs])

  return now
}
