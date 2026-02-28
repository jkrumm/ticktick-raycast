import { getPreferenceValues } from "@raycast/api";
import { Preferences, VikunjaTask, VikunjaProject, VikunjaLabel } from "./types";

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function apiBase(): string {
  return prefs().baseUrl.replace(/\/$/, "") + "/api/v1";
}

export function authHeader(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${prefs().apiToken}`,
  };
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(apiBase() + path, {
    ...options,
    headers: { ...authHeader(), ...(options?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") return undefined as T;
  return res.json() as Promise<T>;
}

export const client = {
  getProjects: () => req<VikunjaProject[]>("/projects?is_archived=false&per_page=500"),

  getLabels: () => req<VikunjaLabel[]>("/labels?per_page=500"),

  updateTask: (id: number, data: Partial<VikunjaTask>) =>
    req<VikunjaTask>(`/tasks/${id}`, { method: "POST", body: JSON.stringify(data) }),

  createTask: (projectId: number, data: Partial<VikunjaTask>) =>
    req<VikunjaTask>(`/projects/${projectId}/tasks`, { method: "PUT", body: JSON.stringify(data) }),

  deleteTask: (id: number) => req<void>(`/tasks/${id}`, { method: "DELETE" }),

  setLabels: (taskId: number, labelIds: number[]) =>
    req<void>(`/tasks/${taskId}/labels/bulk`, {
      method: "POST",
      body: JSON.stringify({ labels: labelIds.map((id) => ({ id })) }),
    }),
};
