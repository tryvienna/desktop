# Concepts

The mental model for Vienna. If you've used chat-based coding tools
before, some of these will be familiar — others (workstreams, scopes,
routines, permissions) are where Vienna differs.

## Projects

A project is a directory. When you add a project, Vienna:

- Remembers the path
- Creates a default workstream bound to it
- Indexes files for search (read-only)

Projects don't have configuration of their own today — they're
containers for workstreams.

## Workstreams

A workstream is an **isolated agent workspace** — the unit of work in
Vienna. Each workstream has:

- A project + an optional git worktree (so agents can experiment on a
  branch without touching your main checkout)
- Its own conversation history with an agent
- Its own permission rules (scope: workstream)
- Links to external entities (GitHub issue, Linear task, etc.)
- A status (active, completed, completed-unviewed, failed)

Workstreams survive restarts. You can pause a workstream, come back
next week, and resume the conversation with full context.

## Scopes

A scope is a **group of workstreams** for planning or organization —
"Backend rewrite", "Q2 onboarding", "Personal experiments". Scopes
are optional; you can also just use tags.

## Agents and providers

An **agent** is the AI that reads, thinks, and acts on your behalf. A
**provider** is the vendor: Claude, Codex, Gemini, or any future
integration. Vienna exposes the same workstream UI and permission
model regardless of provider, so you can switch without re-training
your muscle memory.

Providers implement a small interface (`packages/agent-providers/`).
Each provider runs as a subprocess managed by
[`SessionManager`](./architecture).

## Permissions

The permission engine decides whether an agent can run a tool (read a
file, run a shell command, call an MCP server). Rules match on:

- **Tool name** (exact or `*`)
- **Directory** (glob or prefix, optional)
- **Provider** (optional — "only when Claude is running")
- **Scope** (session vs. persistent)

Specificity breaks ties: directory rules beat non-directory rules,
specific tools beat `*`, and at equal specificity, deny beats allow.

See the architecture doc for implementation details, or browse
**Settings → Permissions** in the app for the live list.

## Routines

Routines are **scheduled agent runs**. They fire on cron or interval,
spawn a workstream, run a prompt, and optionally escalate:

- "Every morning at 9am, review yesterday's PRs"
- "Every 15 minutes, check CI status of this branch"
- "Every Friday, summarize the week's commits into a standup message"

Routines create workstreams, so their output is auditable: you can
see everything the scheduled agent did and roll back if needed.

## Entities

Entities are **external references** a workstream can attach to — a
GitHub issue, a Linear task, a calendar event. Plugins register new
entity types via `@tryvienna/sdk`. When an entity is linked, the
agent sees it in context and can act on it (e.g. post a comment back
to the GitHub issue).

## Plugins

Plugins extend Vienna with new integrations, entity types, UI
canvases, and tool-providing MCP servers. They live in separate repos
and are discovered through the
[registry](https://github.com/tryvienna/registry). See the
[plugin development guide](./guide/plugin-development) to build one.

## Local data

Everything Vienna needs lives on your machine:

- SQLite databases for app state and agent event logs
  (`~/Library/Application Support/Vienna/`)
- API keys in macOS Keychain
- Logs at `~/Library/Logs/Vienna/`

Nothing above leaves your machine by default. See
[PRIVACY.md](https://github.com/tryvienna/desktop/blob/main/PRIVACY.md)
for the full data-flow map.
