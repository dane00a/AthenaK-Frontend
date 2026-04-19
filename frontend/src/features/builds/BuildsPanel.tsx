import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { LogPane } from "../../components/LogPane";
import { StatusPill } from "../../components/StatusPill";
import { api, type Build } from "../../lib/api";
import type { ProjectContext } from "../projects/ProjectShell";

export function BuildsPanel() {
  const { project } = useOutletContext<ProjectContext>();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  const buildsQ = useQuery({
    queryKey: ["builds", project.id],
    queryFn: () => api.listBuilds(project.id),
    refetchInterval: activeId ? 2_000 : false,
  });

  useEffect(() => {
    if (buildsQ.data && activeId === null && buildsQ.data.length) {
      setActiveId(buildsQ.data[0].id);
    }
  }, [buildsQ.data, activeId]);

  const [mpiOn, setMpiOn] = useState(false);
  const [cudaOn, setCudaOn] = useState(false);
  const [debugOn, setDebugOn] = useState(false);

  const createMut = useMutation({
    mutationFn: () => {
      const flags: Record<string, boolean | string> = {};
      if (mpiOn) flags.Athena_ENABLE_MPI = true;
      if (cudaOn) flags.Kokkos_ENABLE_CUDA = true;
      if (debugOn) flags.CMAKE_BUILD_TYPE = "Debug";
      return api.createBuild(project.id, flags);
    },
    onSuccess: (b: Build) => {
      qc.invalidateQueries({ queryKey: ["builds", project.id] });
      setActiveId(b.id);
      setLiveStatus("queued");
    },
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => api.cancelBuild(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["builds", project.id] }),
  });

  const active = buildsQ.data?.find((b) => b.id === activeId);
  const activeStatus = liveStatus ?? active?.status;
  const activeCancellable = activeStatus === "queued" || activeStatus === "running";

  return (
    <div className="grid h-full grid-rows-[auto_1fr]">
      <header className="flex flex-wrap items-center gap-3 border-b border-muted px-4 py-2 text-sm">
        <button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {createMut.isPending ? "Queuing…" : "Build"}
        </button>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={mpiOn} onChange={(e) => setMpiOn(e.target.checked)} />
          MPI
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={cudaOn} onChange={(e) => setCudaOn(e.target.checked)} />
          CUDA
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={debugOn}
            onChange={(e) => setDebugOn(e.target.checked)}
          />
          Debug
        </label>
        <div className="ml-auto flex items-center gap-2">
          {active && <StatusPill status={liveStatus ?? active.status} />}
          {active && activeCancellable && (
            <button
              onClick={() => cancelMut.mutate(active.id)}
              disabled={cancelMut.isPending}
              className="rounded-md border border-red-500/40 px-2 py-0.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              {cancelMut.isPending ? "Cancelling…" : "Cancel"}
            </button>
          )}
          {active?.binary_path && (
            <code className="text-xs text-foreground/60">{active.binary_path}</code>
          )}
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[240px_1fr]">
        <aside className="overflow-y-auto border-r border-muted">
          <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            History
          </h3>
          <ul>
            {buildsQ.data?.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => {
                    setActiveId(b.id);
                    setLiveStatus(null);
                  }}
                  className={`block w-full px-3 py-2 text-left text-xs ${
                    b.id === activeId ? "bg-muted/40" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>#{b.id}</span>
                    <StatusPill status={b.status} />
                  </div>
                </button>
              </li>
            ))}
            {buildsQ.data?.length === 0 && (
              <li className="px-3 py-2 text-xs text-foreground/60">No builds yet.</li>
            )}
          </ul>
        </aside>

        <section className="min-h-0">
          {active ? (
            <LogPane
              kind="builds"
              id={active.id}
              onStatus={(s) => {
                setLiveStatus(s);
                qc.invalidateQueries({ queryKey: ["builds", project.id] });
              }}
            />
          ) : (
            <div className="p-6 text-foreground/60">Click "Build" to start a build.</div>
          )}
        </section>
      </div>
    </div>
  );
}
