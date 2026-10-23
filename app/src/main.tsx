// main.tsx: the ENTRY POINT. This is the first of our code that runs.
// Its only job: find <div id="root"> in index.html and render our <App /> inside it.

import { StrictMode } from 'react'          // dev-only helper that warns about common mistakes
import { createRoot } from 'react-dom/client' // connects React to the real browser page (the DOM)
import './index.css'                          // global styles: Tailwind + our colour tokens
import App from './App.tsx'                   // our root component (the whole dashboard)

// document.getElementById('root') finds the empty div in index.html.
// The "!" tells TypeScript "trust me, this element exists (it is never null)".
createRoot(document.getElementById('root')!).render(
  // StrictMode renders components twice in development to catch bugs.
  // It has no effect in the production build.
  <StrictMode>
    <App />
  </StrictMode>,
)
