const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type Project = {
  id: number;
  name: string;
  slug: string;
  physics_module: string;
  athenak_ref: string;
  created_at: string;
  updated_at: string;
};

export type ProblemFile = { id: number; filename: string; content: string; updated_at: string };
export type InputFile = {
  id: number;
  project_id: number;
  filename: string;
  content: string;
  updated_at: string;
};
export type Diagnostic = {
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  message: string;
};

export type Build = {
  id: number;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  binary_path: string | null;
  error: string | null;
  diagnostics: Diagnostic[];
};
export type Run = {
  id: number;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  exit_code: number | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
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
