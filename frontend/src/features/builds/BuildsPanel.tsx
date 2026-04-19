// M6: "Build" button -> POST -> open /ws/builds/:id WebSocket ->
// xterm.js pane with ANSI colours and status pill.

export function BuildsPanel() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-foreground/70">
      Build panel (M6). Live cmake/make log via /ws/builds/:id.
    </div>
  );
}
