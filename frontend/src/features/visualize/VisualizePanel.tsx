import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { api, type Run } from "../../lib/api";
import type { ProjectContext } from "../projects/ProjectShell";
import { HeatmapView } from "./HeatmapView";
import { SeriesChart, type SeriesSource } from "./SeriesChart";

export function VisualizePanel() {
  const { project } = useOutletContext<ProjectContext>();

  const buildsQ = useQuery({
    queryKey: ["builds", project.id],
    queryFn: () => api.listBuilds(project.id),
  });

  const buildIds = useMemo(() => buildsQ.data?.map((b) => b.id) ?? [], [buildsQ.data]);

  // Gather runs across all builds (so users can pick any prior run).
  const runsQueries = useQuery({
    queryKey: ["all-runs", buildIds.join(",")],
    queryFn: async () => {
      const lists = await Promise.all(buildIds.map((id) => api.listRuns(id)));
      return lists.flat() as Run[];
    },
    enabled: buildIds.length > 0,
  });

  const [runId, setRunId] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  useEffect(() => {
    if (runId === null && runsQueries.data?.length) {
      const latestSuccess = runsQueries.data.find((r) => r.status === "success");
      setRunId(latestSuccess?.id ?? runsQueries.data[0].id);
    }
  }, [runsQueries.data, runId]);

  const toggleCompare = (id: number) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 3),
    );
  };

  const outputsQ = useQuery({
    queryKey: ["outputs", runId],
    queryFn: () => (runId ? api.listOutputs(runId) : Promise.resolve([])),
    enabled: runId !== null,
  });

  const [activeOutput, setActiveOutput] = useState<string | null>(null);
  useEffect(() => {
    if (outputsQ.data && outputsQ.data.length && activeOutput === null) {
      const hst = outputsQ.data.find((o) => o.kind === "hst");
      setActiveOutput((hst ?? outputsQ.data[0]).name);
    }
  }, [outputsQ.data, activeOutput]);

  const isSeries = (kind: string) => kind === "hst" || kind === "tab";
  const isField = (kind: string) => kind === "athdf" || kind === "hdf5" || kind === "h5";
  const isPlottable = (kind: string) => isSeries(kind) || isField(kind);

  return (
    <div className="grid h-full grid-rows-[auto_1fr]">
      <header className="flex flex-wrap items-center gap-3 border-b border-muted px-4 py-2 text-sm">
        <label className="text-xs">
          Run{" "}
          <select
            className="ml-1 rounded border border-muted bg-muted/40 px-2 py-0.5 text-xs"
            value={runId ?? ""}
            onChange={(e) => {
              setRunId(Number(e.target.value));
              setActiveOutput(null);
              setCompareIds([]);
            }}
          >
            <option value="">—</option>
            {runsQueries.data?.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} ({r.status})
              </option>
            ))}
          </select>
        </label>
        {runsQueries.data && runsQueries.data.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/70">
            <span>Compare with:</span>
            {runsQueries.data
              .filter((r) => r.id !== runId && r.status === "success")
              .map((r) => (
                <label key={r.id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={compareIds.includes(r.id)}
                    onChange={() => toggleCompare(r.id)}
                  />
                  #{r.id}
                </label>
              ))}
            {compareIds.length > 0 && (
              <button
                onClick={() => setCompareIds([])}
                className="text-foreground/50 underline hover:text-foreground"
              >
                clear
              </button>
            )}
          </div>
        )}
      </header>

      <div className="grid min-h-0 grid-cols-[240px_1fr]">
        <aside className="overflow-y-auto border-r border-muted">
          <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            Outputs
          </h3>
          <ul>
            {outputsQ.data?.map((o) => (
              <li key={o.name}>
                <button
                  onClick={() => setActiveOutput(o.name)}
                  disabled={!isPlottable(o.kind)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs ${
                    o.name === activeOutput ? "bg-muted/40" : "hover:bg-muted/30"
                  } ${!isPlottable(o.kind) ? "opacity-60" : ""}`}
                >
                  <span className="truncate">{o.name}</span>
                  <span className="text-foreground/50">.{o.kind}</span>
                </button>
                {!isPlottable(o.kind) && runId !== null && (
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/runs/${runId}/outputs/${encodeURIComponent(o.name)}`}
                    className="block px-3 pb-2 text-[10px] text-accent hover:underline"
                  >
                    download
                  </a>
                )}
              </li>
            ))}
            {outputsQ.data?.length === 0 && (
              <li className="px-3 py-2 text-xs text-foreground/60">No outputs yet.</li>
            )}
          </ul>
        </aside>

        <section className="min-h-0 overflow-auto p-4">
          {runId &&
            activeOutput &&
            outputsQ.data?.find((o) => o.name === activeOutput)?.kind &&
            (() => {
              const kind = outputsQ.data!.find((o) => o.name === activeOutput)!.kind;
              if (isField(kind)) {
                return <HeatmapView runId={runId} name={activeOutput} />;
              }
              if (isSeries(kind)) {
                const sources: SeriesSource[] = [
                  { runId, name: activeOutput, kind },
                  ...compareIds.map((id) => ({ runId: id, name: activeOutput, kind })),
                ];
                return <SeriesChart sources={sources} />;
              }
              return null;
            })()}
        </section>
      </div>
    </div>
  );
}
