import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { api } from "../../lib/api";
import type { ProjectContext } from "./ProjectShell";

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function StoragePanel() {
  const { project } = useOutletContext<ProjectContext>();
  const qc = useQueryClient();
  const storageQ = useQuery({
    queryKey: ["storage", project.id],
    queryFn: () => api.getStorage(project.id),
  });

  const [kind, setKind] = useState<"never" | "keep_last_n">("never");
  const [n, setN] = useState(10);

  const retentionMut = useMutation({
    mutationFn: () => api.setRetention(project.id, kind === "never" ? { kind } : { kind, n }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage", project.id] }),
  });

  const purgeMut = useMutation({
    mutationFn: (runId: number) => api.purgeRun(runId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage", project.id] }),
  });

  const s = storageQ.data;

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Storage</h1>
        <p className="text-sm text-foreground/60">
          Byte-accurate disk usage for this project's workspace.
        </p>
      </header>

      {s && (
        <div className="rounded-lg border border-muted p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <Stat label="Total" value={fmt(s.total_bytes)} />
            <Stat label="Build" value={fmt(s.build_bytes)} />
            <Stat label="Logs" value={fmt(s.logs_bytes)} />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-muted p-4">
        <h2 className="mb-2 text-sm font-semibold">Retention policy</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select
            className="rounded border border-muted bg-muted/40 px-2 py-1"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="never">Never auto-prune</option>
            <option value="keep_last_n">Keep last N runs</option>
          </select>
          {kind === "keep_last_n" && (
            <input
              type="number"
              min={1}
              className="w-20 rounded border border-muted bg-muted/40 px-2 py-1"
              value={n}
              onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))}
            />
          )}
          <button
            onClick={() => retentionMut.mutate()}
            className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white"
          >
            {retentionMut.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {s && (
        <div className="rounded-lg border border-muted">
          <h2 className="border-b border-muted px-4 py-2 text-sm font-semibold">Runs</h2>
          <ul>
            {s.run_bytes.length === 0 && (
              <li className="px-4 py-3 text-sm text-foreground/60">No runs have outputs yet.</li>
            )}
            {s.run_bytes.map((r) => (
              <li
                key={r.run_id}
                className="flex items-center justify-between border-b border-muted px-4 py-2 text-sm last:border-none"
              >
                <span>
                  run #{r.run_id} · <span className="text-foreground/60">{fmt(r.bytes)}</span>
                </span>
                <button
                  onClick={() => purgeMut.mutate(r.run_id)}
                  disabled={purgeMut.isPending}
                  className="rounded-md border border-red-500/40 px-2 py-0.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Purge
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-foreground/60">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
