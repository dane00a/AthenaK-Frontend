// M6: launch form (select input file) -> POST -> open /ws/runs/:id.
// Run history with exit codes + durations.

export function RunsPanel() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-foreground/70">
      Runs panel (M6). Live stdout via /ws/runs/:id.
    </div>
  );
}
