import clsx from "clsx";
import { Link } from "react-router-dom";

import type { Diagnostic } from "../../lib/api";

type Props = {
  diagnostics: Diagnostic[];
  projectId: number;
};

/** Compact sidebar list of compiler diagnostics. Clicking a row navigates
 * to the Problem tab with `?line=N&col=M`; the ProblemEditor picks that up
 * and reveals the corresponding line. */
export function DiagnosticsPanel({ diagnostics, projectId }: Props) {
  if (diagnostics.length === 0) {
    return (
      <div className="border-t border-muted p-3 text-xs text-foreground/50">
        No diagnostics from the latest build.
      </div>
    );
  }
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  return (
    <div className="flex min-h-0 flex-col border-t border-muted">
      <header className="flex items-center justify-between px-3 py-2 text-xs font-semibold">
        <span>Diagnostics</span>
        <span className="font-normal text-foreground/60">
          {errors} err · {warnings} warn
        </span>
      </header>
      <ul className="flex-1 overflow-y-auto">
        {diagnostics.map((d, i) => (
          <li key={`${d.file}:${d.line}:${d.column}:${i}`}>
            <Link
              to={{
                pathname: `/projects/${projectId}/problem`,
                search: `?line=${d.line}&col=${d.column}`,
              }}
              className="block px-3 py-1.5 text-xs hover:bg-muted/40"
            >
              <div className="flex items-start gap-2">
                <SeverityChip severity={d.severity} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-foreground/60">
                    {basename(d.file)}:{d.line}:{d.column}
                  </div>
                  <div className="truncate">{d.message}</div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeverityChip({ severity }: { severity: Diagnostic["severity"] }) {
  return (
    <span
      className={clsx(
        "inline-block shrink-0 rounded px-1 py-[1px] text-[9px] uppercase tracking-wide",
        severity === "error"
          ? "bg-red-500/20 text-red-200"
          : severity === "warning"
            ? "bg-amber-500/20 text-amber-200"
            : "bg-slate-500/20 text-slate-200",
      )}
    >
      {severity[0].toUpperCase()}
    </span>
  );
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}
