import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../../lib/api";

export function ProjectList() {
  const q = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white">
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

      <ul className="mt-6 divide-y divide-muted overflow-hidden rounded-lg border border-muted">
        {q.data?.map((p) => (
          <li key={p.id}>
            <Link
              to={`/projects/${p.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-xs uppercase tracking-wide text-foreground/60">
                {p.physics_module}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
