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

  // Probe-through-time state
  const [probeMode, setProbeMode] = useState(false);
  const [probe, setProbe] = useState<Point | null>(null);

  useEffect(() => {
    if (!variable && varsQ.data?.variables.length) {
      setVariable(varsQ.data.variables[0]);
    }
  }, [varsQ.data, variable]);

  // Switching variable / axis / index invalidates any in-progress picks.
  useEffect(() => {
    setPts([]);
    setProbe(null);
  }, [variable, axis, index]);

  const fieldQ = useQuery({
    queryKey: ["field", runId, name, variable, axis, index],
    queryFn: () => api.getField(runId, name, { var: variable!, axis, index }),
    enabled: variable !== null,
  });

  const timeseriesQ = useQuery({
    queryKey: ["timeseries", runId, variable, probe?.x, probe?.y],
    queryFn: () =>
      api.getPointTimeseries(runId, {
        var: variable!,
        x: Math.round(probe!.x),
        y: Math.round(probe!.y),
      }),
    enabled: variable !== null && probe !== null,
    retry: false,
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
      const p = event.points?.[0];
      const x = typeof p?.x === "number" ? p.x : Number(p?.x);
      const y = typeof p?.y === "number" ? p.y : Number(p?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const pt: Point = { x, y };
      if (profileMode) {
        setPts((prev) => (prev.length >= 2 ? [pt] : [...prev, pt]));
      } else if (probeMode) {
        setProbe(pt);
      }
    },
    [profileMode, probeMode],
  );

  if (varsQ.isLoading) return <p className="text-foreground/60">Loading variables…</p>;
  if (varsQ.error)
    return <p className="text-red-400">Failed: {(varsQ.error as Error).message}</p>;

  // Overlay traces: profile endpoints (amber) and probe point (cyan).
  type OverlayTrace = {
    x: number[];
    y: number[];
    mode: "lines+markers" | "markers";
    type: "scatter";
    line?: { color: string; width?: number };
    marker: {
      color: string;
      size: number;
      symbol: string;
      line?: { width: number };
    };
    hoverinfo: "skip";
    showlegend: false;
  };
  const overlayTraces: OverlayTrace[] = [];
  if (pts.length) {
    overlayTraces.push({
      x: pts.map((p) => p.x),
      y: pts.map((p) => p.y),
      mode: "lines+markers" as const,
      type: "scatter" as const,
      line: { color: "#f59e0b", width: 2 },
      marker: { color: "#f59e0b", size: 8, symbol: "x" },
      hoverinfo: "skip" as const,
      showlegend: false,
    });
  }
  if (probe) {
    overlayTraces.push({
      x: [probe.x],
      y: [probe.y],
      mode: "markers" as const,
      type: "scatter" as const,
      marker: { color: "#22d3ee", size: 10, symbol: "circle-open", line: { width: 2 } },
      hoverinfo: "skip" as const,
      showlegend: false,
    });
  }

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
              if (e.target.checked) setProbeMode(false);
              setPts([]);
            }}
          />
          Line profile
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={probeMode}
            onChange={(e) => {
              setProbeMode(e.target.checked);
              if (e.target.checked) setProfileMode(false);
              setProbe(null);
            }}
          />
          Probe through time
        </label>
        {profileMode && (
          <span className="text-foreground/60">
            {pts.length === 0 && "click the first endpoint"}
            {pts.length === 1 && "click the second endpoint"}
            {pts.length === 2 && "click to pick a new line"}
          </span>
        )}
        {probeMode && (
          <span className="text-foreground/60">
            {probe === null ? "click a pixel to probe" : "click elsewhere to re-pick"}
          </span>
        )}
        {(pts.length > 0 || probe) && (
          <button
            onClick={() => {
              setPts([]);
              setProbe(null);
            }}
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

      {probeMode && probe && (
        <div className="rounded-lg border border-muted p-3">
          <h3 className="mb-2 text-xs font-semibold text-foreground/70">
            Point time-series · ({probe.x.toFixed(1)}, {probe.y.toFixed(1)}) · across all
            <code className="mx-1">*.athdf</code> dumps
          </h3>
          {timeseriesQ.isLoading && <p className="text-foreground/60">Sampling…</p>}
          {timeseriesQ.error && (
            <p className="text-red-400">Failed: {(timeseriesQ.error as Error).message}</p>
          )}
          {timeseriesQ.data && (
            <>
              <p className="mb-2 text-xs text-foreground/60">
                {timeseriesQ.data.files.length} dump
                {timeseriesQ.data.files.length === 1 ? "" : "s"}
              </p>
              <Plot
                data={[
                  {
                    x: timeseriesQ.data.t,
                    y: timeseriesQ.data.values,
                    mode: "lines+markers" as const,
                    type: "scatter" as const,
                    line: { color: "#22d3ee" },
                    name: timeseriesQ.data.variable,
                  },
                ]}
                layout={{
                  autosize: true,
                  height: 280,
                  margin: { l: 50, r: 20, t: 20, b: 40 },
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "rgba(255,255,255,0.02)",
                  font: { color: "#e2e8f0" },
                  xaxis: {
                    title: { text: "t / dump index" },
                    gridcolor: "rgba(255,255,255,0.08)",
                  },
                  yaxis: {
                    title: { text: timeseriesQ.data.variable },
                    gridcolor: "rgba(255,255,255,0.08)",
                  },
                }}
                useResizeHandler
                style={{ width: "100%" }}
                config={{ displaylogo: false, responsive: true }}
              />
            </>
          )}
        </div>
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
