# ticktick-raycast

Raycast extension for TickTick task management via HomeLab proxy. No direct TickTick OAuth — all auth is absorbed by the proxy.

## Context

- **README.md** — project overview, setup, command list
- **.claude/skills/ticktick-api/SKILL.md** — HomeLab proxy API reference (endpoints, task model, auth)
- **.claude/skills/raycast-extension/SKILL.md** — Raycast component and hook reference

## Key Facts

- HomeLab proxy: `https://argo.jkrumm.com/api/ticktick/*`
- Auth: Bearer token in Raycast preferences (`apiToken`)
- Extension source: `raycast/src/`
- Tasks are loaded per-project via `GET /ticktick/project/{id}/data`
- Priority scale: 0=None, 1=Low, 3=Medium, 5=High (no 2 or 4)
- New dependencies: `chrono-node` (NL date parsing), `similarity` (fuzzy project matching)
- Date handling: send `dueDate` as `YYYY-MM-DD` — proxy normalizes to midnight in `timeZone`, sets `startDate = dueDate`, `isAllDay: true`
- Never compute TickTick ISO dates client-side (breaks when user is outside Berlin)

## After Code Changes

Always rebuild before testing:

```bash
cd /Users/johannes.krumm/SourceRoot/ticktick-raycast/raycast && npx ray build -e dist
```

The TickTick proxy now lives in [`jkrumm/argo`](https://github.com/jkrumm/argo)
on the VPS. Push to argo's master triggers a RollHook deploy automatically —
no manual `docker compose build` step here.
