# Vienna

A local-first, provider-agnostic desktop IDE for orchestrating AI coding agents.

Vienna runs on your machine, uses your API keys (BYOK), and gives you granular
control over what agents can see and do. Workstreams keep project context
persistent across sessions. Routines schedule agents to run on cron. Plugins
extend Vienna with new integrations and entity types.

> **Status: early.** v0.0.16, macOS only. Windows and Linux are on the roadmap.
> Expect rough edges.

## Why Vienna

- **Provider-agnostic.** Switch between Claude, Gemini, and Codex without
  re-architecting your workflow.
- **Local-first.** API keys live in your OS keychain. No telemetry by default.
  Your code never passes through Vienna servers.
- **Workstreams.** Each task gets an isolated workspace — bound directories,
  git worktrees, linked issues, full message history. Context survives restarts.
- **Granular permissions.** Per-project, per-workstream control over which
  tools agents can use. Ranges from restrictive to autonomous.
- **Routines.** Schedule prompts on cron or interval. Agents can triage, review,
  or maintain autonomously and report back.
- **Plugins.** Extend Vienna with new integrations (GitHub, Linear, Asana, …)
  via the SDK and plugin registry.

See [WHAT_IS_VIENNA.md](./WHAT_IS_VIENNA.md) for the full product overview.

## Install

Download the latest signed DMG from
[GitHub Releases](https://github.com/tryvienna/desktop/releases), drag Vienna to
`/Applications`, and launch.

Homebrew cask is coming.

## Build from source

Requirements: **macOS 13+**, **Node 22+**, **pnpm 10+**.

```bash
git clone https://github.com/tryvienna/desktop.git
cd vienna
pnpm install
pnpm dev           # starts the Electron app with hot reload
```

Other useful scripts:

```bash
pnpm build         # build all packages
pnpm test          # run test suites
pnpm typecheck     # TypeScript across the monorepo
pnpm lint          # eslint
pnpm make          # produce an unsigned DMG (macOS)
```

The Electron app depends on a local SQLite DB (auto-created on first run).
Nothing else is required.

### Running without the hosted backend

Vienna normally talks to `tryvienna.dev` for optional auth and feedback. You
can run entirely offline: the desktop detects a missing `VIENNA_WEB_URL` and
disables those features gracefully. To point at your own backend, set
`VIENNA_WEB_URL=https://your.domain` before launch.

## Architecture

Brief overview — full details in [`docs/architecture.md`](./docs/architecture.md)
(coming) and on [docs.tryvienna.dev](https://docs.tryvienna.dev) (coming).

- **`apps/desktop`** — Electron app (main + renderer), React 19 + TypeScript.
- **`apps/relay`** — standalone GraphQL-over-HTTP server used by the desktop.
- **`apps/docs`** — VitePress docs site.
- **`packages/sdk`** — `@tryvienna/sdk`, the public SDK for plugin authors.
- **`packages/ui`** — `@tryvienna/ui`, shared React components.
- **`packages/vcli`** — the `vcli` command-line tool (plugin scaffolding, etc.).
- **`packages/ipc`** — Zod-validated IPC framework between main and renderer.
- **`packages/agent-*`** — agent orchestration (permissions, providers, DB).

Plugins live in separate repos and are discovered through the
[plugin registry](https://github.com/tryvienna/registry).

## Plugins

Write your own in TypeScript with a typed SDK and scaffolded CI:

```bash
pnpm dlx @tryvienna/vcli plugin create my-plugin
```

See [skills/plugin-dev/SKILL.md](./skills/plugin-dev/SKILL.md) for the current
author guide. A fuller tutorial is in the docs site.

First-party plugins: [github-cli](https://github.com/tryvienna/github-cli),
[linear](https://github.com/tryvienna/linear),
[asana](https://github.com/tryvienna/asana),
[google_workspace](https://github.com/tryvienna/google_workspace),
[weather](https://github.com/tryvienna/weather) — and more in the
[registry](https://github.com/tryvienna/registry).

## Contributing

We welcome issues, PRs, and plugin proposals.

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md).
2. Look for [`good first issue`](https://github.com/tryvienna/desktop/labels/good%20first%20issue)
   labels.
3. Open an issue before starting significant work — it saves back-and-forth.

All contributors agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Found a vulnerability? Please don't open a public issue. Email
`security@tryvienna.dev` — see [SECURITY.md](./SECURITY.md) for the disclosure
process.

Vienna runs user-approved shell commands and loads third-party plugins, so it
has real attack surface. We take this seriously.

## License

[Apache 2.0](./LICENSE). Copyright 2026 Vienna Contributors.

Third-party notices: [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) (coming).
