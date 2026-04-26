# Command Palette — Implementation Status

Status of all registered commands and their wiring.

| Command ID | Category | Status | Notes |
|---|---|---|---|
| `app:command-palette` | navigation | Done | Toggles palette (Cmd+Shift+P) |
| `app:keyboard-shortcuts` | help | Done | Opens shortcuts modal |
| `app:new-workstream` | workstream | Done | Creates via WorkstreamContext |
| `app:toggle-sidebar` | navigation | Done | Custom DOM event |
| `app:toggle-drawer` | navigation | Done | DrawerActions |
| `app:entity-browser` | navigation | Done | Navigates to `/` |
| `workstream:browse` | workstream | Done | Workstream browse overlay (Cmd+G) |
| `workstream:settings` | workstream | Not wired | Needs drawer integration |
| `workstream:recall-message` | workstream | Not wired | Needs message recall logic |
| `app:nav-home` | navigation | Partial | Main-process only (navigate action) |
| `app:nav-settings` | navigation | Partial | Main-process only (navigate action) |
| `app:toggle-theme` | settings | Partial | Main-process only (cycles theme) |
| `app:toggle-devtools` | developer | Done | Main-process handler |
| `app:reload` | developer | Done | Main-process handler |
| `app:zoom-in` | settings | Done | Main-process handler |
| `app:zoom-out` | settings | Done | Main-process handler |
| `app:zoom-reset` | settings | Done | Main-process handler |
| `claude:stop` | claude | Not wired | Needs agent stop IPC |
| `claude:switch-model` | claude | Has flow | Flow UI exists, backend TODO |
| `claude:clear` | claude | Not wired | Needs conversation clear |
| `help:docs` | help | Done | Opens external URL |
| `help:changelog` | help | Done | Opens external URL |
| `help:about` | help | Done | Opens about dialog |

## Status Legend

- **Done** — Fully wired end-to-end (renderer handler + main-process handler where needed)
- **Partial** — Has a main-process handler that returns a result action, but no renderer-side handler to process it
- **Has flow** — Multi-step flow UI exists, but backend integration is TODO
- **Not wired** — Command is registered in the catalog but has no handler implementation yet
