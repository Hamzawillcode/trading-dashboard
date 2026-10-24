// ThemeToggle.tsx: the sun/moon button in the header that switches dark ↔ light (Phase 8).
// It only flips `theme` in uiStore. The store sets <html data-theme>, and the CSS tokens do the rest.

import { useUiStore } from '../store/uiStore'

export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      // An icon-only button has no visible text, so aria-label gives screen readers a name for it
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      // size-8 = 32×32px tap target, grid place-items-center = icon dead centre
      className="grid size-8 place-items-center rounded-full border border-border text-muted hover:text-text"
    >
      {/* Inline SVG icons: they scale crisply and take the text colour (stroke="currentColor").
          Dark theme shows a SUN (= "go light"), light theme shows a MOON (= "go dark"). */}
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {theme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  )
}
