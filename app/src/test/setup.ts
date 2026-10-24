// setup.ts: runs before EVERY test file (see `setupFiles` in vite.config.ts).

// Adds DOM matchers to expect(): toBeInTheDocument(), toHaveValue(), toBeDisabled()...
// They read like what a user would check: "is this text on the page?"
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  // Unmount whatever the test rendered, so tests can't affect each other
  cleanup()
  // The trading store saves to localStorage (persist middleware). Wipe it between tests too.
  localStorage.clear()
})
