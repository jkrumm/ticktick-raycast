# vikunja-raycast

Raycast extension for [Vikunja](https://vikunja.io) — list, create, and manage tasks directly from Raycast.

Talks directly to the self-hosted Vikunja instance at `vikunja.jkrumm.com`. No custom backend.

## Commands

| Command | Mode | Description |
|-|-|-|
| My Tasks | view | All open tasks with filtering, grouping, and full actions |
| Create Task | view | Form-based task creation with project, labels, priority, due date |
| Quick Add | no-view | Inline text → task, HUD confirmation |
| Menu Bar | menu-bar | Overdue + today count in the menu bar |

## Setup

```bash
cd raycast
npm install
npm run dev
```

Set the **API Token** preference in Raycast (Preferences → Extensions → Vikunja). Generate a token at `vikunja.jkrumm.com/user/settings/token`.

## Development

```bash
npm run dev      # open extension in Raycast with hot reload
npm run build    # production build
npm run lint     # ESLint
```
