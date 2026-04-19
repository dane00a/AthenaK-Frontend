import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Plot from "react-plotly.js";

import { api } from "../../lib/api";

type Props = {
  runId: number;
  name: string;
  kind: string; // "hst" | "tab"
};

export function SeriesChart({ runId, name, kind }: Props) {
  const q = useQuery({
    queryKey: ["series", runId, name],
    queryFn: () => api.getSeries(runId, name),
  });

  const [xCol, setXCol] = useState<string | null>(null);
  const [yCols, setYCols] = useState<Set<string>>(new Set());

  const columns = q.data?.columns ?? [];
  // When data arrives for the first time, pick sensible defaults.
  useMemo(() => {
    if (!q.data || xCol !== null) return;
    const cols = q.data.columns;
    if (cols.length === 0) return;
    setXCol(cols[0]);
    setYCols(new Set(cols.slice(1, Math.min(4, cols.length))));
  }, [q.data, xCol]);

  if (q.isLoading) return <p className="text-foreground/60">Loading series…</p>;
  if (q.error) return <p className="text-red-400">Failed: {(q.error as Error).message}</p>;
  if (!q.data || q.data.rows.length === 0)
    return <p className="text-foreground/60">No data in {name}.</p>;

  const data = q.data;
  const xIdx = xCol ? data.columns.indexOf(xCol) : 0;
  const x = data.rows.map((r) => r[xIdx]);

  const traces = [...yCols].map((col) => {
    const idx = data.columns.indexOf(col);
    return {
      x,
      y: data.rows.map((r) => r[idx]),
      mode: "lines" as const,
      type: "scatter" as const,
      name: col,
    };
  });

  const toggleY = (col: string) => {
    const next = new Set(yCols);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    setYCols(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label>
          x-axis{" "}
          <select
            className="rounded border border-muted bg-muted/40 px-2 py-0.5"
            value={xCol ?? ""}
            onChange={(e) => setXCol(e.target.value)}
          >
            {columns.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <span className="text-foreground/60">y:</span>
        {columns.map((c) => (
          <label key={c} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={yCols.has(c)}
              disabled={c === xCol}
              onChange={() => toggleY(c)}
            />
            {c}
          </label>
        ))}
      </div>

      <Plot
        data={traces}
        layout={{
          autosize: true,
          height: 520,
          margin: { l: 50, r: 20, t: 30, b: 40 },
          paper_bgcolor: "transparent",
          plot_bgcolor: "rgba(255,255,255,0.02)",
          font: { color: "#e2e8f0" },
          xaxis: { title: { text: xCol ?? "" }, gridcolor: "rgba(255,255,255,0.08)" },
          yaxis: { gridcolor: "rgba(255,255,255,0.08)" },
          legend: { orientation: "h" },
          title: { text: `${name} (.${kind})` },
        }}
        useResizeHandler
        style={{ width: "100%" }}
        config={{ displaylogo: false, responsive: true }}
      />
    </div>
  );
}
