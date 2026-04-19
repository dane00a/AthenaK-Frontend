import type * as MonacoNS from "monaco-editor";

import type { Diagnostic } from "../api";

const OWNER = "athenak";

/** Install build diagnostics onto the active Monaco C++ model. */
export function applyDiagnostics(
  monaco: typeof MonacoNS,
  model: MonacoNS.editor.ITextModel,
  diagnostics: Diagnostic[],
  filenameFilter?: string,
): void {
  const matches = filenameFilter
    ? diagnostics.filter((d) => d.file.endsWith(filenameFilter))
    : diagnostics;
  const markers: MonacoNS.editor.IMarkerData[] = matches.map((d) => ({
    severity: severityOf(monaco, d.severity),
    message: d.message,
    startLineNumber: d.line,
    startColumn: d.column,
    endLineNumber: d.line,
    endColumn: d.column + 1,
    source: "build",
  }));
  monaco.editor.setModelMarkers(model, OWNER, markers);
}

export function clearDiagnostics(
  monaco: typeof MonacoNS,
  model: MonacoNS.editor.ITextModel,
): void {
  monaco.editor.setModelMarkers(model, OWNER, []);
}

function severityOf(
  monaco: typeof MonacoNS,
  raw: Diagnostic["severity"],
): MonacoNS.MarkerSeverity {
  switch (raw) {
    case "error":
      return monaco.MarkerSeverity.Error;
    case "warning":
      return monaco.MarkerSeverity.Warning;
    default:
      return monaco.MarkerSeverity.Info;
  }
}
