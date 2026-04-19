import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";

import { api, type Project } from "../../lib/api";
import { EditProjectDialog } from "./EditProjectDialog";

const TABS = [
  { to: "problem", label: "Problem" },
  { to: "input", label: "Input" },
  { to: "build", label: "Build" },
  { to: "runs", label: "Runs" },
  { to: "visualize", label: "Visualize" },
  { to: "storage", label: "Storage" },
] as const;

export type ProjectContext = { project: Project };

export function ProjectShell() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const q = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.getProject(id),
    enabled: Number.isFinite(id),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate("/");
    },
  });

  const onDelete = () => {
    if (!q.data) return;
    const ok = window.confirm(
      `Delete project "${q.data.name}"? This removes DB rows for problem files, inputs, builds, and runs. On-disk workspace files are kept.`,
    );
    if (ok) deleteMut.mutate();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-muted px-6 py-2">
        <div>
          {q.isLoading && <span className="text-sm text-foreground/60">Loading project…</span>}
          {q.error && (
            <span className="text-sm text-red-400">
              Failed to load: {(q.error as Error).message}
            </span>
          )}
          {q.data && (
            <>
              <div className="text-sm font-semibold">{q.data.name}</div>
              <div className="text-xs text-foreground/60">
                {q.data.slug} · {q.data.physics_module} · {q.data.athenak_ref}
              </div>
            </>
          )}
        </div>
        {q.data && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-muted px-2 py-1 text-xs text-foreground/80 hover:bg-muted/40"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              disabled={deleteMut.isPending}
              className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>
      <nav className="flex gap-1 border-b border-muted px-4">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              clsx(
                "px-3 py-2 text-sm font-medium border-b-2",
                isActive
                  ? "border-accent text-foreground"
                  : "border-transparent text-foreground/60 hover:text-foreground",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1 overflow-hidden">
        {q.data ? (
          <Outlet context={{ project: q.data } satisfies ProjectContext} />
        ) : (
          <div className="p-6 text-foreground/60">…</div>
        )}
      </div>
      {q.data && (
        <EditProjectDialog
          project={q.data}
          open={editing}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
