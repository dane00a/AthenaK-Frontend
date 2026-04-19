import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { CommandPalette } from "../CommandPalette";

export function AppShell() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const statusQ = useQuery({
    queryKey: ["auth-status"],
    queryFn: api.authStatus,
    staleTime: 30_000,
  });

  const logoutMut = useMutation({
    mutationFn: () => api.authLogout(),
    onSuccess: () => {
      qc.clear(); // every authed query is now invalid
      navigate("/login");
    },
  });

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
          {statusQ.data?.enabled && statusQ.data.authenticated && (
            <>
              <span className="rounded-full border border-muted px-2 py-0.5 text-[11px] text-foreground/70">
                signed in
              </span>
              <button
                onClick={() => logoutMut.mutate()}
                disabled={logoutMut.isPending}
                className="rounded border border-muted px-2 py-0.5 text-[11px] hover:bg-muted/40 disabled:opacity-50"
              >
                {logoutMut.isPending ? "…" : "Logout"}
              </button>
            </>
          )}
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
