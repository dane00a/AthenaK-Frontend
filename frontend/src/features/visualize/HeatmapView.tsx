import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Plot from "react-plotly.js";

import { api } from "../../lib/api";

type Props = {
  runId: number;
  name: string;
};

export function HeatmapView({ runId, name }: Props) {
  const varsQ = useQuery({
    queryKey: ["field-vars", runId, name],
    queryFn: () => api.listFieldVariables(runId, name),
  });

  const [variable, setVariable] = useState<string | null>(null);
  const [axis, setAxis] = useState<"x" | "y" | "z">("z");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!variable && varsQ.data?.variables.length) {
      setVariable(varsQ.data.variables[0]);
    }
  }, [varsQ.data, variable]);

  const fieldQ = useQuery({
    queryKey: ["field", runId, name, variable, axis, index],
    queryFn: () =>
      api.getField(runId, name, { var: variable!, axis, index }),
    enabled: variable !== null,
  });

  if (varsQ.isLoading) return <p className="text-foreground/60">Loading variables…</p>;
  if (varsQ.error)
    return <p className="text-red-400">Failed: {(varsQ.error as Error).message}</p>;

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
          useResizeHandler
          style={{ width: "100%" }}
          config={{ displaylogo: false, responsive: true }}
        />
      )}
    </div>
  );
}
