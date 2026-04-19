import { Link, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-muted px-6 py-3">
        <Link to="/" className="font-semibold tracking-tight text-lg">
          AthenaK Frontend
        </Link>
        <nav className="text-sm text-foreground/70">v0.1.0 · dev</nav>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
