# Vienna Architecture

A one-page tour of how Vienna is put together. Intended for new
contributors — read this before touching code. Deeper docs live at
[docs.tryvienna.dev](https://docs.tryvienna.dev) (coming) and in the
`apps/docs/` VitePress site in this repo.

## High-level shape

```
┌──────────────────────────── Vienna desktop (Electron) ────────────────────────────┐
│                                                                                    │
│  ┌──────────────── Renderer (React 19 + TypeScript) ────────────────┐              │
│  │                                                                   │              │
│  │  - workstream UI, chat, entity palette, plugin canvases           │              │
│  │  - Apollo Client → GraphQL (local relay)                          │              │
│  │  - typed IPC via @vienna/ipc (Zod-validated)                      │              │
│  └───────────────────────────────────────────────────────────────────┘              │
│                              ↕                                                      │
│  ┌────────────────── Main process (Node/Electron) ──────────────────┐              │
│  │                                                                   │              │
│  │  Session / Workstream / Permission / Routine / Plugin managers    │              │
│  │  Agent providers (Claude Code, Codex CLI, Gemini CLI)             │              │
│  │  IPC handlers: shell, file, git, lsp, mcp, keybindings …          │              │
│  │  LocalDB: better-sqlite3 (app state + agent events)               │              │
│  └───────────────────────────────────────────────────────────────────┘              │
│                              ↕                                                      │
│  ┌────────────────────── External boundaries ──────────────────────┐                │
│  │  Shell / git (user-approved)  ·  AI provider HTTP(S) (BYOK)     │                │
│  │  Plugin subprocesses (sandboxed)  ·  VIENNA_WEB_URL backend     │                │
│  └──────────────────────────────────────────────────────────────────┘              │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## Where things live

| Concern | Path | Notes |
|---|---|---|
| Electron main entrypoint | `apps/desktop/src/main.ts` | Bootstraps managers, IPC, DBs. |
| React renderer entrypoint | `apps/desktop/src/renderer/` | Main window UI. |
| Session orchestration | `apps/desktop/src/main/agent/SessionManager.ts` | One agent session per workstream. |
| Workstream lifecycle | `apps/desktop/src/main/workstream/WorkstreamManager.ts` | Binds a workstream to a git worktree + agent. |
| Permission engine | `packages/agent-permissions/` | Rule matching, scope cascade, trusted tools. |
| Agent providers | `packages/agent-providers/` | `claude-code`, `codex-cli`, `gemini-cli` adapters. |
| Plugin loader | `apps/desktop/src/main/plugins/` | Manifest parsing, permission grants, lifecycle. |
| Plugin registry | `apps/desktop/src/main/registry/` | Fetches + caches manifest entries from the registry repo. |
| LSP integration | `apps/desktop/src/main/lsp/` | Language-server management per project root. |
| MCP surface | `apps/desktop/src/main/mcp/` | Sock-based MCP server Vienna exposes to agents. |
| Typed IPC | `packages/ipc/` | Zod-validated main↔renderer contracts. |
| Logger | `packages/logger/` | Pino-based structured logging; use `logger.child({ domain: … })`. |
| Env access | `packages/env/` | Never read `process.env` directly; use `@vienna/env`. |
| Local DB | `packages/app-db/`, `packages/agent-db/` | better-sqlite3 wrappers. |
| GraphQL schema | `packages/graphql/` | Pothos-built schema + resolvers. |
| SDK (public) | `packages/sdk/` → `@tryvienna/sdk` | What plugin authors import. |
| UI (public) | `packages/ui/` → `@tryvienna/ui` | Shared React components. |
| CLI (public) | `packages/vcli/` | `vcli plugin scaffold` and friends. |

## Key invariants

1. **No `process.env`, no `console.*`.** Read env vars via `@vienna/env`,
   log via `@vienna/logger`. Both provide domain-scoped, redaction-aware
   wrappers. Existing violations are tracked in `CODEBASE_ASSESSMENT.md`.

2. **Renderer never spawns processes or touches the filesystem
   directly.** All shell, file, git, and LSP operations go through IPC
   handlers in the main process. The handler is where permission
   checks happen.

3. **IPC is Zod-validated at both ends.** Contracts live next to handlers
   (e.g. `apps/desktop/src/ipc/shell/contract.ts`). Types flow from the
   contract — don't redefine shapes.

4. **Permission checks happen at the agent boundary.** The permission
   engine (`packages/agent-permissions`) is the single authority. Don't
   add your own permission prompts in the UI; route through
   `SessionManager.requestPermission`.

5. **Plugins run in a subprocess with declared permissions.** Plugins
   can't read arbitrary workstream state; they get scoped capabilities
   via `@tryvienna/sdk`.

6. **`apps/web` is not in this repo.** The hosted backend at
   `tryvienna.dev` is a separate private repo providing optional auth
   and feedback. Vienna works without it — see the README's
   "Running without the hosted backend" section.

## Data flow: a chat turn with a tool call

```
 User types in UI
      │
      ▼
 useWorkstreamChat (renderer)
      │  IPC (Zod)
      ▼
 SessionManager.sendMessage        ── persists event to agent-db
      │
      ▼
 AgentProvider (e.g. claude-code)  ── streams events from the model
      │
      ▼
 permission_required event          ── SessionManager.onPermissionRequest
      │
      ▼ pending entry stored        ── UI renders approval bar
 User approves (or a rule allows)
      │  IPC (Zod)
      ▼
 SessionManager.respondPermission   ── forwards to provider, persists outcome
      │
      ▼
 Tool executes (shell, file, LSP, …) via the corresponding IPC handler
      │
      ▼
 tool_result event ─────────────────▶ UI update
```

## Testing

- Unit tests: co-located (`foo.unit.test.ts`) or in `__tests__/`.
  Vitest runs these; `pnpm test:unit`.
- Integration tests: `packages/**/__tests__/*.integration.test.ts`.
  `pnpm test:integration`.
- E2E: `apps/desktop/tests/e2e/*.spec.ts`, Playwright. `pnpm test:e2e`.
- Security-critical surfaces (shell, permissions, git-utils) aim for
  ≥70% line coverage. See [CODEBASE_ASSESSMENT.md](../CODEBASE_ASSESSMENT.md)
  for the full coverage tracker.

## Conventions

See [CLAUDE.md](../CLAUDE.md) for the complete coding conventions and
commit style. A shortlist:

- Conventional Commits; all commits signed off (DCO, `git commit -s`)
- TypeScript strict; ESM everywhere
- `async/await` preferred over `.then()` for new code
- No `any` in new code unless there's a comment explaining why
- Structured logs: `{ workstreamId, error }` etc. — never
  `console.log('thing: ' + x)`

## Further reading

- [WHAT_IS_VIENNA.md](../WHAT_IS_VIENNA.md) — product framing
- [CONTRIBUTING.md](../CONTRIBUTING.md) — how to submit changes
- [ROADMAP.md](../ROADMAP.md) — where this is going
- [CODEBASE_ASSESSMENT.md](../CODEBASE_ASSESSMENT.md) — known issues + priorities
- [skills/plugin-dev/SKILL.md](../skills/plugin-dev/SKILL.md) — plugin author guide
