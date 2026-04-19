import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";

import { api } from "../../lib/api";

export type SeriesSource = {
  runId: number;
  name: string;
  kind: string; // "hst" | "tab"
};

type Props = {
  sources: SeriesSource[];
};

export function SeriesChart({ sources }: Props) {
  const results = useQueries({
    queries: sources.map((s) => ({
      queryKey: ["series", s.runId, s.name],
      queryFn: () => api.getSeries(s.runId, s.name),
    })),
  });

  // Union of columns across all sources — we present one x-axis picker.
  const allColumns = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (!r.data) continue;
      for (const c of r.data.columns) {
        if (!seen.has(c)) {
          seen.add(c);
          out.push(c);
        }
      }
    }
    return out;
  }, [results]);

  const [xCol, setXCol] = useState<string | null>(null);
  const [yCols, setYCols] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (xCol !== null) return;
    if (allColumns.length === 0) return;
    setXCol(allColumns[0]);
    setYCols(new Set(allColumns.slice(1, Math.min(4, allColumns.length))));
  }, [allColumns, xCol]);

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error;
  if (isLoading) return <p className="text-foreground/60">Loading series…</p>;
  if (error) return <p className="text-red-400">Failed: {(error as Error).message}</p>;
  if (results.every((r) => !r.data || r.data.rows.length === 0))
    return <p className="text-foreground/60">No data.</p>;

  const toggleY = (col: string) => {
    const next = new Set(yCols);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    setYCols(next);
  };

  const traces = [];
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const data = results[i].data;
    if (!data) continue;
    const xIdx = xCol ? data.columns.indexOf(xCol) : 0;
    if (xIdx < 0) continue;
    const x = data.rows.map((r) => r[xIdx]);
    for (const col of yCols) {
      const yIdx = data.columns.indexOf(col);
      if (yIdx < 0) continue;
      traces.push({
        x,
        y: data.rows.map((r) => r[yIdx]),
        mode: "lines" as const,
        type: "scatter" as const,
        name: sources.length > 1 ? `run #${src.runId} · ${col}` : col,
      });
    }
  }

  const titleText =
    sources.length === 1
      ? `${sources[0].name} (.${sources[0].kind})`
      : `Comparing ${sources.length} runs`;

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
            {allColumns.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <span className="text-foreground/60">y:</span>
        {allColumns.map((c) => (
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
          title: { text: titleText },
        }}
        useResizeHandler
        style={{ width: "100%" }}
        config={{ displaylogo: false, responsive: true }}
      />
    </div>
  );
}
