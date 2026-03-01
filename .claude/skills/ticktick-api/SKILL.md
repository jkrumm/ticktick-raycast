---
name: ticktick-api
description: HomeLab TickTick proxy API reference — endpoints, task model, auth, and code patterns for api.jkrumm.com
agent: general-purpose
---

# TickTick HomeLab Proxy API Reference

The HomeLab proxy at `api.jkrumm.com` absorbs TickTick OAuth2 complexity and exposes a simple Bearer-token API.

**Base URL:** `https://api.jkrumm.com`
**Auth:** `Authorization: Bearer <token>` on every request (token configured in Raycast preferences)
**Health check:** `GET /api/ping`

---

## Client Pattern

```typescript
import { getPreferenceValues } from "@raycast/api";

const { apiToken, baseUrl } = getPreferenceValues<{ apiToken: string; baseUrl: string }>();

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
      ...(options?.headers as Record<string, string>),
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  if (res.status === 204 || res.headers.get("content-length") === "0") return undefined as T;
  return res.json() as Promise<T>;
}
```

---

## Data Models

```typescript
interface TickTickProject {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  closed: boolean | null;
  groupId: string | null;
  viewMode: "list" | "kanban" | "timeline" | null;
  permission: "read" | "write" | "comment" | null;
  kind: "TASK" | "NOTE";
}

interface TickTickTask {
  id: string;
  projectId: string;
  title: string;
  content: string;          // markdown body
  desc: string;             // checklist description
  isAllDay: boolean;
  isFloating: boolean;
  startDate: string | null; // "yyyy-MM-dd'T'HH:mm:ssZ"
  dueDate: string | null;   // "yyyy-MM-dd'T'HH:mm:ssZ"
  completedTime: string | null;
  timeZone: string;         // e.g. "Europe/Berlin"
  reminders: string[];      // e.g. ["TRIGGER:P0DT9H0M0S"]
  repeatFlag: string | null;// e.g. "RRULE:FREQ=DAILY;INTERVAL=1"
  priority: 0 | 1 | 3 | 5; // 0=None 1=Low 3=Medium 5=High
  status: 0 | 2;            // 0=Active 2=Completed
  sortOrder: number;
  tags: string[];
  items: TickTickChecklistItem[];
  kind: "TEXT" | "CHECKLIST" | "NOTE";
}

interface TickTickChecklistItem {
  id: string;
  title: string;
  status: 0 | 2;
  sortOrder: number;
  startDate: string | null;
  isAllDay: boolean;
  timeZone: string;
  completedTime: string | null;
}

interface TickTickProjectData {
  project: TickTickProject;
  tasks: TickTickTask[];
  columns?: { id: string; name: string }[];
}
```

---

## Endpoints

| Method | Path | Purpose |
|-|-|-|
| GET | `/api/ticktick/projects` | Get all projects → `TickTickProject[]` |
| GET | `/api/ticktick/project/{projectId}/data` | Get project with tasks + columns → `TickTickProjectData` |
| POST | `/api/ticktick/task` | Create task → `TickTickTask` |
| POST | `/api/ticktick/task/{taskId}` | Update task (partial) → `TickTickTask` |
| POST | `/api/ticktick/project/{projectId}/task/{taskId}/complete` | Mark task complete |
| DELETE | `/api/ticktick/project/{projectId}/task/{taskId}` | Delete task |
| GET | `/api/ping` | Authenticated health check |

---

## Common Operations

```typescript
// List all projects
const projects = await api<TickTickProject[]>("/api/ticktick/projects");

// Get all tasks for a project (includes completed)
const data = await api<TickTickProjectData>(`/api/ticktick/project/${projectId}/data`);
const activeTasks = data.tasks.filter(t => t.status === 0);

// Create a task
const task = await api<TickTickTask>("/api/ticktick/task", {
  method: "POST",
  body: JSON.stringify({
    title: "Fix login bug",
    projectId: "abc123",
    priority: 3,
    dueDate: "2026-03-01T00:00:00+0000",
    isAllDay: true,
    timeZone: "Europe/Berlin",
  }),
});

// Update a task
await api(`/api/ticktick/task/${taskId}`, {
  method: "POST",
  body: JSON.stringify({ title: "Updated title", priority: 5 }),
});

// Mark complete
await api(`/api/ticktick/project/${projectId}/task/${taskId}/complete`, {
  method: "POST",
});

// Delete a task
await api(`/api/ticktick/project/${projectId}/task/${taskId}`, {
  method: "DELETE",
});
```

---

## Priority Scale

| Value | Label |
|-|-|
| 0 | No priority |
| 1 | Low |
| 3 | Medium |
| 5 | High |

Note: TickTick uses 0/1/3/5 — there is no 2 or 4.

---

## CreateTask Input Shape

```typescript
interface CreateTaskInput {
  title: string;
  projectId?: string;        // omit to use default inbox
  dueDate?: string | null;   // ISO 8601
  priority?: 0 | 1 | 3 | 5;
  content?: string;          // markdown notes
  isAllDay?: boolean;        // true when no specific time
  timeZone?: string;         // default "Europe/Berlin"
}
```
