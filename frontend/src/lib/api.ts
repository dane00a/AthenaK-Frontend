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
export type Build = {
  id: number;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  binary_path: string | null;
  error: string | null;
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

export const api = {
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (body: { name: string; physics_module: string; athenak_ref?: string }) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
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
  createRun: (build_id: number, input_file_id: number) =>
    request<Run>(`/api/builds/${build_id}/runs`, {
      method: "POST",
      body: JSON.stringify({ input_file_id }),
    }),
  listRuns: (build_id: number) => request<Run[]>(`/api/builds/${build_id}/runs`),
  getRun: (id: number) => request<Run>(`/api/runs/${id}`),
  listOutputs: (id: number) =>
    request<{ name: string; size: number; kind: string }[]>(`/api/runs/${id}/outputs`),
  getSeries: (id: number, name: string) =>
    request<{ columns: string[]; rows: number[][] }>(
      `/api/runs/${id}/outputs/${encodeURIComponent(name)}/series`,
    ),
};
