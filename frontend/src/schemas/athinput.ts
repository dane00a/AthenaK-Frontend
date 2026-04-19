// Canonical block/field catalog used by the Input Editor form.
// This is intentionally permissive — AthenaK accepts ad-hoc keys — but the
// canonical fields render as typed widgets. Unknown keys fall through to a
// generic text field.

export type AthInputField = {
  key: string;
  label: string;
  type: "number" | "integer" | "string" | "enum" | "boolean";
  required?: boolean;
  default?: string | number | boolean;
  options?: readonly string[];
  help?: string;
};

export type AthInputBlock = {
  name: string;
  title: string;
  fields: readonly AthInputField[];
  repeatable?: boolean;
};

export const ATHINPUT_BLOCKS: readonly AthInputBlock[] = [
  {
    name: "comment",
    title: "Comment",
    fields: [{ key: "problem", label: "Problem description", type: "string" }],
  },
  {
    name: "job",
    title: "Job",
    fields: [{ key: "basename", label: "Output base name", type: "string" }],
  },
  {
    name: "mesh",
    title: "Mesh",
    fields: [
      { key: "nghost", label: "Ghost zones", type: "integer", default: 2 },
      { key: "nx1", label: "nx1", type: "integer", required: true },
      { key: "x1min", label: "x1min", type: "number", required: true },
      { key: "x1max", label: "x1max", type: "number", required: true },
      { key: "ix1_bc", label: "Inner x1 BC", type: "enum", options: ["periodic", "outflow", "reflecting", "user"] },
      { key: "ox1_bc", label: "Outer x1 BC", type: "enum", options: ["periodic", "outflow", "reflecting", "user"] },
      { key: "nx2", label: "nx2", type: "integer", default: 1 },
      { key: "x2min", label: "x2min", type: "number" },
      { key: "x2max", label: "x2max", type: "number" },
      { key: "nx3", label: "nx3", type: "integer", default: 1 },
      { key: "x3min", label: "x3min", type: "number" },
      { key: "x3max", label: "x3max", type: "number" },
    ],
  },
  {
    name: "time",
    title: "Time",
    fields: [
      { key: "integrator", label: "Integrator", type: "enum", options: ["rk1", "rk2", "rk3"], default: "rk2" },
      { key: "cfl_number", label: "CFL", type: "number", default: 0.8 },
      { key: "tlim", label: "tlim", type: "number", required: true },
      { key: "nlim", label: "Step limit", type: "integer", default: -1 },
    ],
  },
  {
    name: "hydro",
    title: "Hydro",
    fields: [
      { key: "eos", label: "EOS", type: "enum", options: ["ideal", "isothermal"], default: "ideal" },
      { key: "gamma", label: "γ", type: "number", default: 1.4 },
      { key: "reconstruct", label: "Reconstruction", type: "enum", options: ["dc", "plm", "ppm"], default: "plm" },
      { key: "rsolver", label: "Riemann solver", type: "enum", options: ["llf", "hlle", "hllc", "roe"], default: "llf" },
    ],
  },
  {
    name: "problem",
    title: "Problem",
    fields: [],
  },
  {
    name: "output1",
    title: "Output",
    repeatable: true,
    fields: [
      { key: "file_type", label: "Type", type: "enum", options: ["hst", "tab", "bin", "rst"], default: "hst" },
      { key: "dt", label: "Δt", type: "number", default: 0.01 },
      { key: "variable", label: "Variable", type: "string" },
    ],
  },
];
