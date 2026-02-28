# vikunja-raycast

Raycast extension for Vikunja task management. Direct API integration — no custom backend.

## Context

- **README.md** — project overview, setup, command list
- **docs/architecture.md** — data flow, caching strategy, priority mapping, command structure
- **.claude/skills/vikunja-api/SKILL.md** — Vikunja API reference (endpoints, task model, filter syntax)
- **.claude/skills/raycast-extension/SKILL.md** — Raycast component and hook reference

## Key Facts

- Vikunja API: `https://vikunja.jkrumm.com/api/v1`
- Auth: Bearer token in Raycast preferences (`apiToken`)
- Extension source: `raycast/src/`
- No backend — Raycast talks directly to Vikunja
