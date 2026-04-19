const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type Project = {
  id: number;
  name: string;
  slug: string;
  physics_module: string;
  athenak_ref: string;
};

export type ProblemFile = { id: number; filename: string; content: string };
export type InputFile = { id: number; filename: string; content: string };
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
  createProject: (body: { name: string; physics_module: string }) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  getProject: (id: number) => request<Project>(`/api/projects/${id}`),
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
  createBuild: (id: number, cmake_flags: Record<string, unknown>) =>
    request<Build>(`/api/projects/${id}/builds`, {
      method: "POST",
      body: JSON.stringify({ cmake_flags }),
    }),
  createRun: (build_id: number, input_file_id: number) =>
    request<Run>(`/api/builds/${build_id}/runs`, {
      method: "POST",
      body: JSON.stringify({ input_file_id }),
    }),
};
