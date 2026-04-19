import { Link, Outlet } from "react-router-dom";

import { CommandPalette } from "../CommandPalette";

export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-muted px-6 py-3">
        <Link to="/" className="font-semibold tracking-tight text-lg">
          AthenaK Frontend
        </Link>
        <nav className="flex items-center gap-3 text-sm text-foreground/70">
          <kbd className="hidden rounded border border-muted px-1.5 py-0.5 text-[10px] text-foreground/60 md:inline">
            ⌘K
          </kbd>
          <span>v0.1.0 · dev</span>
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  );
}
