import type { components } from "./api-types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// Canonical response shapes flow from the generated OpenAPI types.
// Regenerate via `pnpm gen:api` against a running backend. A schema drift
// surfaces as a tsc error here rather than at runtime.
export type Project = components["schemas"]["ProjectOut"];
export type ProblemFile = components["schemas"]["ProblemFileOut"];
export type InputFile = components["schemas"]["InputFileOut"];
export type Build = components["schemas"]["BuildOut"];
export type Run = components["schemas"]["RunOut"];

export type Diagnostic = {
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  message: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  physics_module: string;
};

export const api = {
  authStatus: () =>
    request<{ enabled: boolean; authenticated: boolean }>("/api/auth/status"),
  authLogin: async (password: string): Promise<void> => {
    const r = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!r.ok) throw new Error(`login failed: ${r.status}`);
  },
  authLogout: async (): Promise<void> => {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  },
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (body: { name: string; physics_module: string; athenak_ref?: string }) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  listTemplates: () => request<ProjectTemplate[]>("/api/templates"),
  createProjectFromTemplate: (template_id: string, name?: string) =>
    request<Project>(`/api/templates/${template_id}/projects`, {
      method: "POST",
      body: JSON.stringify({ template_id, name }),
    }),
  getProject: (id: number) => request<Project>(`/api/projects/${id}`),
  deleteProject: (id: number) =>
    fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`${r.status}`);
    }),
  getProblem: (id: number) => request<ProblemFile>(`/api/projects/${id}/problem`),
  saveProblem: (id: number, content: string) =>
    request<ProblemFile>(`/api/projects/${id}/problem`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  generateFromWizard: (id: number, params: Record<string, unknown>) =>
    request<ProblemFile>(`/api/projects/${id}/problem/from-wizard`, {
      method: "POST",
      body: JSON.stringify(params),
    }),
  previewFromWizard: (id: number, params: Record<string, unknown>) =>
    request<{ content: string; base_content: string }>(
      `/api/projects/${id}/problem/from-wizard/preview`,
      { method: "POST", body: JSON.stringify(params) },
    ),
  listInputs: (id: number) => request<InputFile[]>(`/api/projects/${id}/inputs`),
  createInput: (id: number, body: { filename: string; content: string }) =>
    request<InputFile>(`/api/projects/${id}/inputs`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateInput: (input_id: number, body: { filename?: string; content?: string }) =>
    request<InputFile>(`/api/inputs/${input_id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  createBuild: (id: number, cmake_flags: Record<string, unknown>) =>
    request<Build>(`/api/projects/${id}/builds`, {
      method: "POST",
      body: JSON.stringify({ cmake_flags }),
    }),
  listBuilds: (id: number) => request<Build[]>(`/api/projects/${id}/builds`),
  getBuild: (id: number) => request<Build>(`/api/builds/${id}`),
  cancelBuild: (id: number) => request<Build>(`/api/builds/${id}/cancel`, { method: "POST" }),
  createRun: (build_id: number, input_file_id: number) =>
    request<Run>(`/api/builds/${build_id}/runs`, {
      method: "POST",
      body: JSON.stringify({ input_file_id }),
    }),
  listRuns: (build_id: number) => request<Run[]>(`/api/builds/${build_id}/runs`),
  getRun: (id: number) => request<Run>(`/api/runs/${id}`),
  cancelRun: (id: number) => request<Run>(`/api/runs/${id}/cancel`, { method: "POST" }),
  listOutputs: (id: number) =>
    request<{ name: string; size: number; kind: string }[]>(`/api/runs/${id}/outputs`),
  getSeries: (id: number, name: string) =>
    request<{ columns: string[]; rows: number[][] }>(
      `/api/runs/${id}/outputs/${encodeURIComponent(name)}/series`,
    ),
  listFieldVariables: (id: number, name: string) =>
    request<{ variables: string[] }>(
      `/api/runs/${id}/outputs/${encodeURIComponent(name)}/variables`,
    ),
  getField: (
    id: number,
    name: string,
    params: { var: string; axis?: "x" | "y" | "z"; index?: number },
  ) => {
    const q = new URLSearchParams({
      var: params.var,
      axis: params.axis ?? "z",
      index: String(params.index ?? 0),
    }).toString();
    return request<{
      variable: string;
      axis: string;
      index: number;
      shape: [number, number];
      x: number[];
      y: number[];
      z: number[][];
      vmin: number;
      vmax: number;
    }>(`/api/runs/${id}/outputs/${encodeURIComponent(name)}/field?${q}`);
  },
  getStorage: (id: number) =>
    request<{
      total_bytes: number;
      build_bytes: number;
      logs_bytes: number;
      run_bytes: { run_id: number; bytes: number }[];
    }>(`/api/projects/${id}/storage`),
  setRetention: (id: number, body: { kind: "never" | "keep_last_n"; n?: number }) =>
    request<{ kind: string; n?: number }>(`/api/projects/${id}/retention`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  purgeRun: (id: number) =>
    request<{ run_id: number; purged: boolean }>(`/api/runs/${id}/purge`, {
      method: "DELETE",
    }),
};
