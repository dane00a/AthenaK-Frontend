import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";
import { NewProjectDialog } from "./NewProjectDialog";

export function ProjectList() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const q = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          New project
        </button>
      </div>

      {q.isLoading && <p className="mt-8 text-foreground/60">Loading…</p>}
      {q.error && (
        <p className="mt-8 text-red-400">Failed to load projects: {(q.error as Error).message}</p>
      )}
      {q.data && q.data.length === 0 && (
        <p className="mt-8 text-foreground/60">No projects yet. Create one to get started.</p>
      )}

      {q.data && q.data.length > 0 && (
        <ul className="mt-6 divide-y divide-muted overflow-hidden rounded-lg border border-muted">
          {q.data.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projects/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-foreground/50">
                    {p.slug} · {p.athenak_ref}
                  </div>
                </div>
                <span className="text-xs uppercase tracking-wide text-foreground/60">
                  {p.physics_module}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </section>
  );
}
