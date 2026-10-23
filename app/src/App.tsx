// App.tsx: the ROOT COMPONENT. Everything you see on screen lives inside <App />.
// For now it is just a "shell": a header plus 3 empty panels.
// Each empty panel will be replaced by a real component in a later phase:
//   Watchlist → Phase 1, Chart → Phase 4, Order Panel → Phase 5

// ---------------------------------------------------------------------------
// Panel: a small reusable component (a dark card with a title).
// `{ title }: { title: string }` means "this component receives a prop called
// title, and it must be a string". That's TypeScript checking our props.
// ---------------------------------------------------------------------------
function Panel({ title }: { title: string }) {
  return (
    // <section> = a box on the page. className holds Tailwind classes:
    // rounded-lg (rounded corners), border border-border (thin grey border),
    // bg-panel (card colour), p-3 (padding inside)
    <section className="rounded-lg border border-border bg-panel p-3">
      {/* {title} inserts the prop's value into the markup */}
      <h2 className="text-sm font-semibold text-muted">{title}</h2>
    </section>
  )
}

// ---------------------------------------------------------------------------
// App: the page layout.
// "export default" lets main.tsx import it.
// ---------------------------------------------------------------------------
export default function App() {
  return (
    // Outer wrapper: a vertical column (flex-col) at least as tall as the screen (min-h-screen)
    <div className="flex min-h-screen flex-col">

      {/* ===== HEADER: top bar with the app name ===== */}
      {/* flex + justify-between pushes the title to the left and the label to the right */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-accent">Trading Dashboard</h1>
        <span className="text-xs text-muted">Phase 0: setup</span>
      </header>

      {/* ===== MAIN AREA: the 3 panels ===== */}
      {/* grid: lay children out in a grid. gap-3: space between panels.
          On small screens it's 1 column (panels stacked).
          lg:grid-cols-[260px_1fr_300px] means: on LARGE screens use 3 columns:
          260px wide | take all remaining space | 300px wide */}
      <main className="grid flex-1 gap-3 p-3 lg:grid-cols-[260px_1fr_300px]">
        <Panel title="Watchlist" />   {/* left column  */}
        <Panel title="Chart" />       {/* middle column */}
        <Panel title="Order Panel" /> {/* right column */}
      </main>
    </div>
  )
}
