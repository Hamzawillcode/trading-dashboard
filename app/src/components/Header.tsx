// Header.tsx: the top bar of the app.
// It receives the currently selected symbol as a PROP and just displays it.
// Header never changes the selection itself. Data flows DOWN from App via props.

type HeaderProps = {
  selectedSymbol: string
}

export function Header({ selectedSymbol }: HeaderProps) {
  return (
    // justify-between: app name on the left, selected symbol on the right
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <h1 className="text-lg font-bold text-accent">Trading Dashboard</h1>
      <span className="text-sm text-muted">
        Selected: <span className="font-semibold text-text">{selectedSymbol}</span>
      </span>
    </header>
  )
}
