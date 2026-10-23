// The app shell: a header and a grid of empty panels.
// Each panel will be replaced by a real component in later phases.
function Panel({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-border bg-panel p-3">
      <h2 className="text-sm font-semibold text-muted">{title}</h2>
    </section>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-accent">Trading Dashboard</h1>
        <span className="text-xs text-muted">Phase 0: setup</span>
      </header>

      <main className="grid flex-1 gap-3 p-3 lg:grid-cols-[260px_1fr_300px]">
        <Panel title="Watchlist" />
        <Panel title="Chart" />
        <Panel title="Order Panel" />
      </main>
    </div>
  )
}
