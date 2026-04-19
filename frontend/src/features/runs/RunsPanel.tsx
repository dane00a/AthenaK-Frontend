import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { LogPane } from "../../components/LogPane";
import { StatusPill } from "../../components/StatusPill";
import { api, type Build, type Run } from "../../lib/api";
import type { ProjectContext } from "../projects/ProjectShell";

export function RunsPanel() {
  const { project } = useOutletContext<ProjectContext>();
  const qc = useQueryClient();
  const [activeRun, setActiveRun] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  const buildsQ = useQuery({
    queryKey: ["builds", project.id],
    queryFn: () => api.listBuilds(project.id),
  });
  const latestSuccess = useMemo<Build | undefined>(
    () => buildsQ.data?.find((b) => b.status === "success"),
    [buildsQ.data],
  );
  const [buildId, setBuildId] = useState<number | null>(null);
  useEffect(() => {
    if (buildId === null && latestSuccess) setBuildId(latestSuccess.id);
  }, [latestSuccess, buildId]);

  const inputsQ = useQuery({
    queryKey: ["inputs", project.id],
    queryFn: () => api.listInputs(project.id),
  });
  const [inputId, setInputId] = useState<number | null>(null);
  useEffect(() => {
    if (inputId === null && inputsQ.data?.length) setInputId(inputsQ.data[0].id);
  }, [inputsQ.data, inputId]);

  const runsQ = useQuery({
    queryKey: ["runs", buildId],
    queryFn: () => (buildId ? api.listRuns(buildId) : Promise.resolve<Run[]>([])),
    enabled: buildId !== null,
    refetchInterval: activeRun ? 2_000 : false,
  });

  const launchMut = useMutation({
    mutationFn: () => {
      if (!buildId || !inputId) throw new Error("pick a build and input first");
      return api.createRun(buildId, inputId);
    },
    onSuccess: (r: Run) => {
      qc.invalidateQueries({ queryKey: ["runs", buildId] });
      setActiveRun(r.id);
      setLiveStatus("queued");
    },
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => api.cancelRun(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs", buildId] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.deleteRun(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["runs", buildId] });
      if (id === activeRun) setActiveRun(null);
    },
  });

  const active = runsQ.data?.find((r) => r.id === activeRun);
  const activeStatus = liveStatus ?? active?.status;
  const activeCancellable = activeStatus === "queued" || activeStatus === "running";
  const activeDeletable =
    activeStatus === "success" ||
    activeStatus === "failed" ||
    activeStatus === "cancelled";

  return (
    <div className="grid h-full grid-rows-[auto_1fr]">
      <header className="flex flex-wrap items-center gap-3 border-b border-muted px-4 py-2 text-sm">
        <label className="text-xs">
          Build{" "}
          <select
            className="ml-1 rounded border border-muted bg-muted/40 px-2 py-0.5 text-xs"
            value={buildId ?? ""}
            onChange={(e) => setBuildId(Number(e.target.value))}
          >
            <option value="">—</option>
            {buildsQ.data
              ?.filter((b) => b.status === "success")
              .map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.id}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs">
          Input{" "}
          <select
            className="ml-1 rounded border border-muted bg-muted/40 px-2 py-0.5 text-xs"
            value={inputId ?? ""}
            onChange={(e) => setInputId(Number(e.target.value))}
          >
            <option value="">—</option>
            {inputsQ.data?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.filename}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => launchMut.mutate()}
          disabled={!buildId || !inputId || launchMut.isPending}
          className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {launchMut.isPending ? "Launching…" : "Launch"}
        </button>
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
          {active && activeDeletable && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Delete run #${active.id}? This removes the DB row, its outputs directory, and its log.`,
                  )
                )
                  deleteMut.mutate(active.id);
              }}
              disabled={deleteMut.isPending}
              className="rounded-md border border-red-500/40 px-2 py-0.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </button>
          )}
          {active?.exit_code !== null && active?.exit_code !== undefined && (
            <code className="text-xs text-foreground/60">exit {active.exit_code}</code>
          )}
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[260px_1fr]">
        <aside className="overflow-y-auto border-r border-muted">
          <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            History
          </h3>
          <ul>
            {runsQ.data?.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setActiveRun(r.id);
                    setLiveStatus(null);
                  }}
                  className={`block w-full px-3 py-2 text-left text-xs ${
                    r.id === activeRun ? "bg-muted/40" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      run #{r.id}{" "}
                      {r.exit_code !== null && (
                        <span className="text-foreground/50">· exit {r.exit_code}</span>
                      )}
                    </span>
                    <StatusPill status={r.status} />
                  </div>
                </button>
              </li>
            ))}
            {buildId && runsQ.data?.length === 0 && (
              <li className="px-3 py-2 text-xs text-foreground/60">No runs for this build yet.</li>
            )}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col">
          {active && (
            <div className="flex items-center justify-end gap-3 border-b border-muted px-4 py-1 text-xs">
              <Link to={`../visualize`} className="text-accent hover:underline">
                View outputs →
              </Link>
            </div>
          )}
          <div className="min-h-0 flex-1">
            {active ? (
              <LogPane
                kind="runs"
                id={active.id}
                onStatus={(s) => {
                  setLiveStatus(s);
                  qc.invalidateQueries({ queryKey: ["runs", buildId] });
                }}
              />
            ) : (
              <div className="p-6 text-foreground/60">
                Pick a successful build and an input file above, then Launch.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
