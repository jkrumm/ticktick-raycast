---
name: vikunja-api
description: Vikunja API reference — endpoints, task model, filter syntax, auth, and data patterns for vikunja.jkrumm.com
agent: general-purpose
---

# Vikunja API Reference

Self-hosted Vikunja at `vikunja.jkrumm.com`. API version: v1.

**Base URL:** `https://vikunja.jkrumm.com/api/v1`
**Auth:** `Authorization: Bearer <token>` on every request
**Swagger:** `https://vikunja.jkrumm.com/api/v1/docs`

---

## Client Pattern

```typescript
import { getPreferenceValues } from "@raycast/api";

const { apiToken, baseUrl } = getPreferenceValues<{ apiToken: string; baseUrl: string }>();

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
```

---

## Task Model

```typescript
interface VikunjaTask {
  id: number;
  identifier: string;          // "PRJ-42" — project prefix + index
  title: string;
  description: string;         // Markdown
  done: boolean;
  done_at: string | null;      // ISO 8601
  priority: number;            // 0=unset 1=low 2=medium 3=high 4=very_high 5=urgent
  labels: Label[];
  assignees: User[];
  due_date: string | null;     // ISO 8601
  start_date: string | null;
  end_date: string | null;
  reminders: TaskReminder[];
  repeat_after: number;        // seconds; 0 = no repeat
  repeat_mode: 0 | 1 | 2;    // 0=default 1=monthly 2=from_current_date
  attachments: TaskAttachment[];
  related_tasks: RelatedTaskMap;
  comment_count: number;       // requires expand=comment_count
  comments: TaskComment[];     // requires expand=comments
  percent_done: number;        // 0.0–1.0
  hex_color: string;           // "#rrggbb"
  is_favorite: boolean;
  is_unread: boolean;
  reactions: Record<string, User[]>;
  bucket_id: number;           // kanban column
  position: number;
  project_id: number;
  index: number;               // per-project sequential number
  created: string;
  updated: string;
  created_by: User;
}

interface Label {
  id: number;
  title: string;
  hex_color: string;
  created_by: User;
}

interface TaskReminder {
  reminder: string;            // ISO 8601 absolute datetime
  relative_to?: "due_date" | "start_date" | "end_date";
  relative_period?: number;    // negative = before, positive = after (seconds)
}

type RelatedTaskMap = Partial<Record<RelationKind, VikunjaTask[]>>;
type RelationKind =
  | "subtask" | "parent_task"
  | "related"
  | "blocked_by" | "blocking"
  | "duplicates" | "duplicated_by"
  | "follows" | "precedes"
  | "copied_from" | "copied_to";
```

---

## Endpoints

### Tasks

| Action | Method | Path |
|-|-|-|
| All tasks (cross-project) | GET | `/tasks` |
| Tasks in project | GET | `/projects/{id}/tasks` |
| Get single task | GET | `/tasks/{id}` |
| Create task | PUT | `/projects/{id}/tasks` |
| Update task | POST | `/tasks/{id}` |
| Delete task | DELETE | `/tasks/{id}` |
| Bulk update tasks | POST | `/tasks/bulk` |

### Labels

| Action | Method | Path |
|-|-|-|
| All labels | GET | `/labels` |
| Create label | PUT | `/labels` |
| Set labels on task (bulk) | POST | `/tasks/{id}/labels/bulk` |

### Assignees

| Action | Method | Path |
|-|-|-|
| Set assignees (bulk) | POST | `/tasks/{id}/assignees/bulk` |

### Comments

| Action | Method | Path |
|-|-|-|
| List comments | GET | `/tasks/{id}/comments` |
| Add comment | PUT | `/tasks/{id}/comments` |
| Delete comment | DELETE | `/tasks/{id}/comments/{commentId}` |

### Projects

| Action | Method | Path |
|-|-|-|
| All projects | GET | `/projects` |
| Single project | GET | `/projects/{id}` |
| Create project | PUT | `/projects` |

### Relations

| Action | Method | Path |
|-|-|-|
| Create relation | PUT | `/tasks/{id}/relations` |
| Delete relation | DELETE | `/tasks/{id}/relations/{kind}/{otherId}` |

### Saved Filters

| Action | Method | Path |
|-|-|-|
| All filters | GET | `/filters` |
| Single filter | GET | `/filters/{id}` |
| Create filter | PUT | `/filters` |
| Update filter | POST | `/filters/{id}` |

### Notifications & User

| Action | Method | Path |
|-|-|-|
| Unread notifications | GET | `/notifications` |
| Mark all read | POST | `/notifications` |
| Current user | GET | `/user` |

---

## Querying Tasks

All query params on `GET /tasks` and `GET /projects/{id}/tasks`:

```
?s=search+term               ← full-text search
&sort_by=due_date            ← due_date | priority | created | updated | title
&order_by=asc                ← asc | desc (append multiple for multi-sort)
&filter=<expression>         ← see filter syntax below
&page=1&per_page=50
&expand=labels,assignees,comment_count,comments,buckets
```

### Filter Expression Syntax

String-encoded, URL-encoded. Operators: `=`, `!=`, `<`, `>`, `<=`, `>=`, `like`, `in`, `not in`.
Combine with `&&` (AND) and `||` (OR).

```
done = false
priority >= 3
due_date < now+7d
due_date is null
is_favorite = true
label_id in [1, 2, 3]
done = false && priority >= 4
done = false && (due_date <= now || is_favorite = true)
```

Date helpers: `now`, `now+Nd`, `now-Nd`, `now+Nw`, `today`.

### Useful Preset Filters

```typescript
const FILTERS = {
  all:      "done = false",
  today:    "done = false && due_date <= now",
  overdue:  "done = false && due_date < now",
  urgent:   "done = false && priority >= 4",
  favorites:"done = false && is_favorite = true",
  upcoming: "done = false && due_date >= now && due_date <= now+7d",
};
```

---

## Common Operations (code snippets)

```typescript
// Fetch all open tasks, due soonest first
const tasks = await api<VikunjaTask[]>(
  "/tasks?filter=done%20%3D%20false&sort_by=due_date&order_by=asc&expand=labels,assignees"
);

// Create a task
const task = await api<VikunjaTask>(`/projects/${projectId}/tasks`, {
  method: "PUT",
  body: JSON.stringify({
    title: "Fix login bug",
    priority: 3,
    due_date: "2026-03-01T00:00:00Z",
  }),
});

// Mark done
await api(`/tasks/${id}`, {
  method: "POST",
  body: JSON.stringify({ done: true }),
});

// Toggle favorite
await api(`/tasks/${id}`, {
  method: "POST",
  body: JSON.stringify({ is_favorite: !task.is_favorite }),
});

// Set labels (replaces all)
await api(`/tasks/${id}/labels/bulk`, {
  method: "POST",
  body: JSON.stringify({ labels: [{ id: 1 }, { id: 4 }] }),
});

// Add comment
await api(`/tasks/${id}/comments`, {
  method: "PUT",
  body: JSON.stringify({ comment: "Needs more context." }),
});

// Create subtask relation
await api(`/tasks/${parentId}/relations`, {
  method: "PUT",
  body: JSON.stringify({ task_id: childId, relation_kind: "subtask" }),
});
```

---

## Vikunja Features Overview

- **Projects** — hierarchy (sub-projects), shared via users / teams / public links
- **Views** — List, Kanban (buckets), Table, Gantt per project
- **Labels** — global colorful tags, reusable across projects
- **Priorities** — 0 (unset) → 5 (urgent), sortable/filterable
- **Date fields** — due_date, start_date, end_date (full ranges)
- **Reminders** — absolute datetime or relative to due/start/end date
- **Recurring tasks** — repeat_after (seconds) + repeat_mode (default/monthly/from_now)
- **Assignees** — multiple per task
- **Relations** — subtask, parent, blocked_by, blocking, related, duplicates, follows, precedes
- **Comments** — markdown, threaded per task
- **Attachments** — files with optional cover image
- **Saved Filters** — server-side, persistent, reusable across clients
- **Reactions** — emoji reactions on tasks
- **Favorites** — "Important" virtual project (is_favorite = true)
- **Percent done** — 0–100% progress float
- **Kanban buckets** — per-view columns, task position within bucket
- **Notifications** — unread tracking, bulk mark-read
- **CalDAV** — calendar/reminder sync
- **Webhooks** — event-driven integrations
- **Quick Add Magic** — title-only creation with smart date/label parsing (UI-side)
