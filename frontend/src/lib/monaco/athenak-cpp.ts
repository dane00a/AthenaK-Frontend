// AthenaK-flavoured C++ support for Monaco. Adds completions, hover docs,
// and folding for the // >>> user:<name> regions that the codegen uses to
// mark round-trip-safe edit zones.

import type * as MonacoNS from "monaco-editor";

type Monaco = typeof MonacoNS;

const CURSOR = "${0}";

type Snippet = {
  label: string;
  detail: string;
  doc: string;
  insert: string;
};

export const ATHENAK_SNIPPETS: Snippet[] = [
  {
    label: "par_for",
    detail: "Kokkos parallel loop over MeshBlockPack cells",
    doc: "Iterate (m, k, j, i) over every active cell in every meshblock on the pack.",
    insert: [
      'par_for("${1:name}", DevExeSpace(), 0, nmb - 1, ks, ke, js, je, is, ie,',
      "KOKKOS_LAMBDA(int m, int k, int j, int i) {",
      "  " + CURSOR,
      "});",
    ].join("\n"),
  },
  {
    label: "par_for_outer",
    detail: "Kokkos team-parallel outer loop",
    doc: "Use when you need team parallelism (e.g. shared scratch across a row).",
    insert: [
      "par_for_outer(",
      '  "${1:name}", DevExeSpace(), scr_size, scr_level, 0, nmb - 1,',
      "  KOKKOS_LAMBDA(TeamMember_t member, int m) {",
      "    " + CURSOR,
      "  });",
    ].join("\n"),
  },
  {
    label: "pin->GetReal",
    detail: "Required real parameter from the <problem> block",
    doc: 'Raises if missing. Use pin->GetOrAddReal for defaults.',
    insert: 'pin->GetReal("${1:block}", "${2:key}")' + CURSOR,
  },
  {
    label: "pin->GetOrAddReal",
    detail: "Optional real with a default",
    doc: "Looks up block/key; inserts the provided default if absent.",
    insert: 'pin->GetOrAddReal("${1:problem}", "${2:key}", ${3:1.0})' + CURSOR,
  },
  {
    label: "pin->GetInteger",
    detail: "Required integer parameter",
    doc: "",
    insert: 'pin->GetInteger("${1:block}", "${2:key}")' + CURSOR,
  },
  {
    label: "pin->GetString",
    detail: "Required string parameter",
    doc: "",
    insert: 'pin->GetString("${1:block}", "${2:key}")' + CURSOR,
  },
  {
    label: "CellCenterX",
    detail: "Compute cell-center coordinate along an axis",
    doc: "CellCenterX(i - is, indcs.nx1, size.d_view(m).x1min, size.d_view(m).x1max)",
    insert:
      "CellCenterX(${1:i - is}, indcs.${2:nx1}, size.d_view(m).${3:x1min}, size.d_view(m).${4:x1max})",
  },
  {
    label: "LeftEdgeX",
    detail: "Compute left cell-face coordinate along an axis",
    doc: "",
    insert:
      "LeftEdgeX(${1:i - is}, indcs.${2:nx1}, size.d_view(m).${3:x1min}, size.d_view(m).${4:x1max})",
  },
  {
    label: "PrimToCons (hydro)",
    detail: "Convert primitive to conserved for hydro",
    doc: "Call after initialising w0 so u0 is consistent.",
    insert: "pmbp->phydro->peos->PrimToCons(w0, u0, is, ie, js, je, ks, ke);" + CURSOR,
  },
  {
    label: "PrimToCons (mhd)",
    detail: "Convert primitive to conserved for MHD",
    doc: "Needs the face-centred magnetic field buffer pmbp->pmhd->b0.",
    insert:
      "pmbp->pmhd->peos->PrimToCons(w0, pmbp->pmhd->b0, u0, is, ie, js, je, ks, ke);" + CURSOR,
  },
  {
    label: "user region",
    detail: "Insert a round-trip-safe user region",
    doc:
      "Anything you place between the >>> and <<< markers survives Regenerate " +
      "from the wizard.",
    insert: "// >>> user:${1:name}\n  " + CURSOR + "\n// <<< user:${1:name}",
  },
];

export const ATHENAK_HOVER: Record<string, string> = {
  IDN: "Density index into the primitive/conserved array.",
  IVX: "x-velocity (primitive) / x-momentum (conserved) index.",
  IVY: "y-velocity / y-momentum index.",
  IVZ: "z-velocity / z-momentum index.",
  IEN: "Total-energy index.",
  IBX: "x-component of magnetic field index.",
  IBY: "y-component of magnetic field index.",
  IBZ: "z-component of magnetic field index.",
  par_for: "Kokkos parallel-for wrapper used throughout AthenaK.",
  KOKKOS_LAMBDA: "Kokkos lambda macro; expands with correct execution-space annotations.",
  KOKKOS_INLINE_FUNCTION:
    "Marks a function as inlinable and callable from Kokkos kernels (device + host).",
  DevExeSpace: "The default device execution space for Kokkos kernels.",
  CellCenterX: "Compute a cell-center physical coordinate from an index and meshblock size.",
  LeftEdgeX: "Compute the left-face physical coordinate from an index and meshblock size.",
  PrimToCons: "EOS method converting primitives (w0) to conserved variables (u0).",
  ParameterInput: "Parsed .athinput document; use pin->GetReal / GetOrAddReal / GetInteger.",
  MeshBlockPack: "Contiguous chunk of meshblocks owned by a rank. Accessed via pmbp.",
};

/**
 * Register AthenaK-specific C++ support against a given Monaco instance.
 * Safe to call multiple times — dispose the returned handle when unmounting.
 */
export function registerAthenakCpp(monaco: Monaco): { dispose: () => void } {
  const completion = monaco.languages.registerCompletionItemProvider("cpp", {
    triggerCharacters: [">", "(", "_"],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      );
      return {
        suggestions: ATHENAK_SNIPPETS.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: s.insert,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: s.detail,
          documentation: { value: s.doc },
          range,
        })),
      };
    },
  });

  const hover = monaco.languages.registerHoverProvider("cpp", {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const doc = ATHENAK_HOVER[word.word];
      if (!doc) return null;
      return {
        range: new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn,
        ),
        contents: [{ value: `**${word.word}**` }, { value: doc }],
      };
    },
  });

  const folding = monaco.languages.registerFoldingRangeProvider("cpp", {
    provideFoldingRanges(model) {
      const ranges: MonacoNS.languages.FoldingRange[] = [];
      const openRe = /^\s*\/\/\s*>>>\s*user:([\w.-]+)/;
      const closeRe = /^\s*\/\/\s*<<<\s*user:([\w.-]+)/;
      const stack = new Map<string, number>();
      const lines = model.getLinesContent();
      lines.forEach((line, idx) => {
        const open = line.match(openRe);
        if (open) stack.set(open[1], idx + 1);
        const close = line.match(closeRe);
        if (close && stack.has(close[1])) {
          ranges.push({
            start: stack.get(close[1])!,
            end: idx + 1,
            kind: monaco.languages.FoldingRangeKind.Region,
          });
          stack.delete(close[1]);
        }
      });
      return ranges;
    },
  });

  return {
    dispose() {
      completion.dispose();
      hover.dispose();
      folding.dispose();
    },
  };
}
