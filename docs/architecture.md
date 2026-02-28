# Architecture

Raycast extension that talks directly to the self-hosted Vikunja instance at `vikunja.jkrumm.com`. No custom backend — just Raycast ↔ Vikunja API.

## Structure

```
raycast/src/
├── api/
│   ├── vikunja.ts       ← typed fetch wrapper + all API calls
│   └── types.ts         ← VikunjaTask, Project, Label, etc.
├── components/          ← shared React components (TaskItem, PriorityBadge, etc.)
├── hooks/               ← custom hooks (useProjects, useLabels, useTasks)
├── my-tasks.tsx         ← command: list + manage tasks
├── create-task.tsx      ← command: form-based task creation
├── quick-add.tsx        ← command: no-view inline creation
└── menu-bar.tsx         ← command: menu-bar due/overdue count
```

## Data Flow

```
Raycast command
  └─ useFetch / direct fetch
       └─ vikunja.ts (auth header injected from preferences)
            └─ https://vikunja.jkrumm.com/api/v1
```

## Auth

API token stored in Raycast extension preferences (`apiToken`, type `password`). Never in code, never in `.env`. User enters it once in Raycast preferences UI.

## Caching Strategy

| Data | Strategy | Rationale |
|-|-|-|
| Projects | `useCachedState` | Rarely change |
| Labels | `useCachedState` | Rarely change |
| Tasks | `useFetch` + `keepPreviousData` | Stale-while-revalidate, fast feel |
| Mutations | Optimistic UI → `revalidate()` | Instant feedback |

## Priority Mapping

Vikunja uses integers 0–5. Map to Raycast Color + Icon:

| Value | Label | Color | Icon |
|-|-|-|-|
| 0 | No priority | SecondaryText | Circle |
| 1 | Low | Blue | ArrowDown |
| 2 | Medium | Yellow | Minus |
| 3 | High | Orange | ArrowUp |
| 4 | Very high | Red | ArrowUp |
| 5 | Urgent | Red | ExclamationMark |

## Commands

| Name | Mode | Entry point |
|-|-|-|
| My Tasks | view | `my-tasks.tsx` |
| Create Task | view | `create-task.tsx` |
| Quick Add | no-view | `quick-add.tsx` |
| Menu Bar | menu-bar | `menu-bar.tsx` |

## Key Patterns

**Optimistic status toggle** — update local state immediately, call API, revert on error:
```typescript
setTasks(prev => prev.map(t => t.id === id ? { ...t, done: true } : t));
try {
  await updateTask(id, { done: true });
} catch {
  setTasks(prev => prev.map(t => t.id === id ? { ...t, done: false } : t));
}
```

**Preferences injection** — call once at top of API module:
```typescript
const { apiToken, baseUrl } = getPreferenceValues<Preferences>();
```

**Filter presets** — dropdown maps to Vikunja filter expressions:
```typescript
const FILTERS: Record<string, string> = {
  all:      "done = false",
  today:    "done = false && due_date <= now",
  overdue:  "done = false && due_date < now",
  urgent:   "done = false && priority >= 4",
  favorite: "done = false && is_favorite = true",
};
```
