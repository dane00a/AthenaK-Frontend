// M5 will wire this up: split pane with WizardForm on the left and a Monaco
// editor on the right. The wizard POSTs to /api/projects/:id/problem/from-wizard
// and the resulting C++ replaces the editor contents while preserving any
// // >>> user:<name> regions the user edited by hand.

export function ProblemEditor() {
  return (
    <div className="grid h-full grid-cols-[320px_1fr]">
      <aside className="border-r border-muted p-4 text-sm">
        <h2 className="mb-3 font-semibold">Wizard</h2>
        <p className="text-foreground/60">
          Pick a physics module and initial condition to scaffold a problem
          generator. Full form lands in M5.
        </p>
      </aside>
      <section className="flex items-center justify-center text-foreground/60">
        Monaco C++ editor (M5)
      </section>
    </div>
  );
}
