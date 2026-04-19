import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import Plot from "react-plotly.js";

import { api } from "../../lib/api";

type Props = {
  runId: number;
  name: string;
};

type Point = { x: number; y: number };

export function HeatmapView({ runId, name }: Props) {
  const varsQ = useQuery({
    queryKey: ["field-vars", runId, name],
    queryFn: () => api.listFieldVariables(runId, name),
  });

  const [variable, setVariable] = useState<string | null>(null);
  const [axis, setAxis] = useState<"x" | "y" | "z">("z");
  const [index, setIndex] = useState(0);

  // Cross-section tool state
  const [profileMode, setProfileMode] = useState(false);
  const [pts, setPts] = useState<Point[]>([]); // len 0 -> nothing, 1 -> first click, 2 -> profile ready

  useEffect(() => {
    if (!variable && varsQ.data?.variables.length) {
      setVariable(varsQ.data.variables[0]);
    }
  }, [varsQ.data, variable]);

  // Switching variable / axis / index invalidates any in-progress profile pick.
  useEffect(() => {
    setPts([]);
  }, [variable, axis, index]);

  const fieldQ = useQuery({
    queryKey: ["field", runId, name, variable, axis, index],
    queryFn: () => api.getField(runId, name, { var: variable!, axis, index }),
    enabled: variable !== null,
  });

  const profileQ = useQuery({
    queryKey: [
      "profile",
      runId,
      name,
      variable,
      axis,
      index,
      pts[0]?.x,
      pts[0]?.y,
      pts[1]?.x,
      pts[1]?.y,
    ],
    queryFn: () =>
      api.getProfile(runId, name, {
        var: variable!,
        axis,
        index,
        x0: pts[0].x,
        y0: pts[0].y,
        x1: pts[1].x,
        y1: pts[1].y,
      }),
    enabled: variable !== null && pts.length === 2,
  });

  const onHeatmapClick = useCallback(
    (event: Readonly<{ points: ReadonlyArray<{ x?: unknown; y?: unknown }> }>) => {
      if (!profileMode) return;
      const p = event.points?.[0];
      const x = typeof p?.x === "number" ? p.x : Number(p?.x);
      const y = typeof p?.y === "number" ? p.y : Number(p?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const pt: Point = { x, y };
      setPts((prev) => {
        if (prev.length >= 2) return [pt];
        return [...prev, pt];
      });
    },
    [profileMode],
  );

  if (varsQ.isLoading) return <p className="text-foreground/60">Loading variables…</p>;
  if (varsQ.error)
    return <p className="text-red-400">Failed: {(varsQ.error as Error).message}</p>;

  // Overlay trace: endpoints + connecting line if we have both.
  const overlayTraces = pts.length
    ? [
        {
          x: pts.map((p) => p.x),
          y: pts.map((p) => p.y),
          mode: "lines+markers" as const,
          type: "scatter" as const,
          line: { color: "#f59e0b", width: 2 },
          marker: { color: "#f59e0b", size: 8, symbol: "x" },
          hoverinfo: "skip" as const,
          showlegend: false,
        },
      ]
    : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label>
          Variable{" "}
          <select
            className="rounded border border-muted bg-muted/40 px-2 py-0.5"
            value={variable ?? ""}
            onChange={(e) => setVariable(e.target.value)}
          >
            {varsQ.data?.variables.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Axis{" "}
          <select
            className="rounded border border-muted bg-muted/40 px-2 py-0.5"
            value={axis}
            onChange={(e) => setAxis(e.target.value as "x" | "y" | "z")}
          >
            <option value="z">z</option>
            <option value="y">y</option>
            <option value="x">x</option>
          </select>
        </label>
        <label>
          Index{" "}
          <input
            type="number"
            className="w-20 rounded border border-muted bg-muted/40 px-2 py-0.5"
            value={index}
            min={0}
            onChange={(e) => setIndex(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="ml-4 flex items-center gap-1">
          <input
            type="checkbox"
            checked={profileMode}
            onChange={(e) => {
              setProfileMode(e.target.checked);
              setPts([]);
            }}
          />
          Profile tool
        </label>
        {profileMode && (
          <span className="text-foreground/60">
            {pts.length === 0 && "click the first endpoint"}
            {pts.length === 1 && "click the second endpoint"}
            {pts.length === 2 && "drag to pick a new line (click resets)"}
          </span>
        )}
        {pts.length > 0 && (
          <button
            onClick={() => setPts([])}
            className="rounded border border-muted px-2 py-0.5 text-foreground/70 hover:bg-muted/40"
          >
            Clear
          </button>
        )}
      </div>

      {fieldQ.isLoading && <p className="text-foreground/60">Loading field…</p>}
      {fieldQ.error && (
        <p className="text-red-400">Failed: {(fieldQ.error as Error).message}</p>
      )}
      {fieldQ.data && (
        <Plot
          data={[
            {
              type: "heatmap" as const,
              z: fieldQ.data.z,
              x: fieldQ.data.x,
              y: fieldQ.data.y,
              colorscale: "Viridis",
              zmin: fieldQ.data.vmin,
              zmax: fieldQ.data.vmax,
            },
            ...overlayTraces,
          ]}
          layout={{
            autosize: true,
            height: 560,
            margin: { l: 50, r: 20, t: 30, b: 40 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "rgba(255,255,255,0.02)",
            font: { color: "#e2e8f0" },
            title: {
              text: `${fieldQ.data.variable} @ ${fieldQ.data.axis}=${fieldQ.data.index} (${fieldQ.data.shape[0]}×${fieldQ.data.shape[1]})`,
            },
          }}
          onClick={onHeatmapClick}
          useResizeHandler
          style={{ width: "100%" }}
          config={{ displaylogo: false, responsive: true }}
        />
      )}

      {profileMode && pts.length === 2 && (
        <div className="rounded-lg border border-muted p-3">
          <h3 className="mb-2 text-xs font-semibold text-foreground/70">
            Line profile · ({pts[0].x.toFixed(1)}, {pts[0].y.toFixed(1)}) → (
            {pts[1].x.toFixed(1)}, {pts[1].y.toFixed(1)})
          </h3>
          {profileQ.isLoading && (
            <p className="text-foreground/60">Sampling…</p>
          )}
          {profileQ.error && (
            <p className="text-red-400">Failed: {(profileQ.error as Error).message}</p>
          )}
          {profileQ.data && (
            <Plot
              data={[
                {
                  x: profileQ.data.s,
                  y: profileQ.data.values,
                  mode: "lines" as const,
                  type: "scatter" as const,
                  line: { color: "#f59e0b" },
                  name: profileQ.data.variable,
                },
              ]}
              layout={{
                autosize: true,
                height: 280,
                margin: { l: 50, r: 20, t: 20, b: 40 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "rgba(255,255,255,0.02)",
                font: { color: "#e2e8f0" },
                xaxis: { title: { text: "s (0 → 1)" }, gridcolor: "rgba(255,255,255,0.08)" },
                yaxis: {
                  title: { text: profileQ.data.variable },
                  gridcolor: "rgba(255,255,255,0.08)",
                },
              }}
              useResizeHandler
              style={{ width: "100%" }}
              config={{ displaylogo: false, responsive: true }}
            />
          )}
        </div>
      )}
    </div>
  );
}
