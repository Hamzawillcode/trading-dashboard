// uiStore.ts: state that's about the INTERFACE, not about markets or money (Phase 8).
//   • theme:     dark or light colours
//   • mobileTab: which screen is showing on a phone (Markets / Chart / Trade / Portfolio)
//
// A separate small store keeps concerns apart: the market store changes many times a second,
// this one only when the user clicks something.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'
export type MobileTab = 'markets' | 'chart' | 'trade' | 'portfolio'

// Also read by the tiny script in index.html (before React loads), so keep the two in sync
export const UI_STORAGE_KEY = 'trading-dashboard-ui'

type UiState = {
  theme: Theme
  mobileTab: MobileTab
  toggleTheme: () => void
  showTab: (tab: MobileTab) => void
}

// THEMING WITH DESIGN TOKENS: switching theme just sets <html data-theme="light">.
// index.css redefines every --color-* token under that attribute, and every Tailwind class
// (bg-panel, text-muted...) reads those variables, so the WHOLE app recolours at once
// without re-rendering a single component.
// We set it here, inside the action (not in a useEffect), so the new colours are already on the
// page when components re-render. The chart reads them in its own effect, and child effects
// run BEFORE parent effects, so a parent's effect would be too late.
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // trading apps are usually dark: easier on the eyes for hours of screen time
      mobileTab: 'chart',

      toggleTheme: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(theme)
        set({ theme })
      },
      showTab: (mobileTab) => set({ mobileTab }),
    }),
    {
      name: UI_STORAGE_KEY,
      // partialize: save ONLY the theme. The tab should start fresh on each visit.
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
)
