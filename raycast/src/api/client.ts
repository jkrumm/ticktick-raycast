import { getPreferenceValues } from "@raycast/api";
import {
  CreateTaskInput,
  Preferences,
  TickTickProjectData,
  TickTickProject,
  TickTickTask,
} from "./types";

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function authHeader(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${prefs().apiToken}`,
  };
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const base = prefs().baseUrl.replace(/\/$/, "");
  const res = await fetch(base + path, {
    ...options,
    headers: {
      ...authHeader(),
      ...(options?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0")
    return undefined as T;
  const json = await res.json();
  // Proxy wraps all responses in { data: T }
  if (
    json &&
    typeof json === "object" &&
    !Array.isArray(json) &&
    "data" in json
  ) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export const client = {
  getProjects: () => req<TickTickProject[]>("/api/ticktick/projects"),

  getProjectData: (projectId: string) =>
    req<TickTickProjectData>(`/api/ticktick/project/${projectId}/data`),

  createTask: (data: CreateTaskInput) =>
    req<TickTickTask>("/api/ticktick/task", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTask: (taskId: string, data: Partial<TickTickTask>) =>
    req<TickTickTask>(`/api/ticktick/task/${taskId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  completeTask: (projectId: string, taskId: string) =>
    req<void>(`/api/ticktick/project/${projectId}/task/${taskId}/complete`, {
      method: "POST",
    }),

  deleteTask: (projectId: string, taskId: string) =>
    req<void>(`/api/ticktick/project/${projectId}/task/${taskId}`, {
      method: "DELETE",
    }),
};
