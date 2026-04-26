# Vienna

Electron desktop app monorepo using pnpm workspaces + Turbo.

## Environment Variables

**Direct access to `process.env` and `import.meta.env` is PROHIBITED in app source code.**

All environment variables must be accessed through the `@vienna/env` package. See `packages/env/CLAUDE.md` for usage details. ESLint enforces this — the build will fail on violations.

## Shell Environment

**Spawning child processes with raw `process.env` is PROHIBITED in main-process code.**

macOS GUI apps launched from Finder/Dock have a minimal `process.env` missing `SSH_AUTH_SOCK`, `GPG_TTY`, and the full `PATH`. All child process spawning must use `@vienna/shell-env`:

```typescript
import { getEnrichedEnv } from '@vienna/shell-env';

// For spawn/execFile options:
spawn('git', ['status'], { env: getEnrichedEnv() });

// With extra overrides:
spawn('node', ['server.js'], { env: getEnrichedEnv({ MY_VAR: 'value' }) });
```

ESLint enforces the `process.env` prohibition — the build will fail on violations. See `packages/shell-env/CLAUDE.md` for details.

## IPC

**Direct `window` property access is PROHIBITED in renderer code.**

All main↔renderer communication must use the `@vienna/ipc` package. See `packages/ipc/CLAUDE.md` for the full API. ESLint enforces this — the build will fail on `window.anything` in renderer code.

### Structure

IPC is organized as a modular domain system in `apps/desktop/src/ipc/`:

- `ipc/index.ts` — Contract barrel. Imports only Zod schemas. Safe for ALL processes.
- `ipc/register.ts` — Main-process registration. Imports handlers + `implement()`. Main process only.
- `ipc/<domain>/contract.ts` — Domain API contract with `defineApi()`.
- `ipc/<domain>/handlers.ts` — Domain handler implementations. Main process only.

**Critical:** `ipc/index.ts` must never import main-process code. The preload script imports from it, and pulling in main-process dependencies causes silent failures (blank app).

### Adding a New IPC Domain

1. Create `ipc/<domain>/contract.ts` and `ipc/<domain>/handlers.ts`
2. Add the contract to `ipc/index.ts` via `mergeAllApis()`
3. Add the handlers to `ipc/register.ts`
4. No changes needed in `main.ts`, `preload.ts`, or renderer code

See `packages/ipc/README.md` for detailed examples.

## Logging

**Direct `console.*` calls (`console.log`, `console.info`, `console.debug`, `console.warn`, `console.error`) are PROHIBITED in all source code.**

All logging must use `@vienna/logger`:

- **Main process:** `import { createMainLogger } from '@vienna/logger/main'`
- **Renderer process:** `import { createRendererLogger } from '@vienna/logger/renderer'`
- **Types only:** `import type { Logger } from '@vienna/logger'`

The logger provides structured NDJSON output to disk (via Pino), session-based log directories, child loggers with bindings, and automatic IPC forwarding from renderer to main. ESLint enforces this — the build will fail on `console.*` violations.

## Coding Conventions

- **No `.js` import extensions** — the monorepo uses `moduleResolution: "bundler"`
- **ESM only** — no `require()`, no CommonJS
- **Strict TypeScript** — `strict: true`, `noUncheckedIndexedAccess: true`
- **8pt grid spacing** — All UI spacing must follow the 8pt grid without exception. Use standard Tailwind classes (`p-2`, `gap-4`, `m-3`). Base unit is 4px (`--spacing: 4px`).

## Commit Conventions

**All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format.** These feed directly into automated changelog generation — user-facing changes become public release notes on tryvienna.dev/changelogs.

### Format

```
type(scope): description
```

### Types

| Type | SemVer | In changelog? | When to use |
|------|--------|---------------|-------------|
| `feat` | minor | **New** | New user-facing feature or capability |
| `fix` | patch | **Fixed** | Bug fix that affects user experience |
| `perf` | patch | **Improved** | Performance improvement users would notice |
| `refactor` | patch | **Improved** | Code restructuring that improves UX (otherwise use `chore`) |
| `chore` | — | no | Tooling, deps, config — invisible to users |
| `docs` | — | no | Documentation only |
| `ci` | — | no | CI/CD pipeline changes |
| `build` | — | no | Build system changes |
| `test` | — | no | Tests only |

### Scope (optional, in parentheses)

Use the package or domain name: `feat(chat-ui)`, `fix(agent-core)`, `chore(web)`.

### Writing for the changelog

`feat` and `fix` commit descriptions become public-facing changelog entries. Write them from the **user's perspective**, not the developer's:

- **Good:** `feat: delete workstreams from the command palette`
- **Bad:** `feat: add DeleteWorkstreamCommand to palette registry`
- **Good:** `fix: workstream status persists across app restarts`
- **Bad:** `fix: set status column before INSERT in workstream repo`

Keep descriptions concise (under ~80 chars). The changelog groups them under "New", "Improved", and "Fixed" headings.

### Breaking changes

Append `!` after the type or add a `BREAKING CHANGE:` footer for major version bumps:

```
feat!: replace workstream archive with soft-delete
```

### Release workflow

Run `pnpm ship` — it walks you through the entire release interactively:
version bump → changelog generation → review → commit & tag → build & publish.

Individual steps are also available if needed:

```
pnpm version:bump patch|minor|major  # bump version in apps/desktop/package.json
pnpm changelog:generate              # auto-generate CHANGELOG-DRAFT.md from commits
pnpm changelog:finalize              # merge into CHANGELOG.md + generate web JSON
pnpm release                         # build, tag, and upload to GitHub Releases
```

## Commands

- `pnpm dev` — start dev server
- `pnpm build` — build all packages
- `pnpm lint` — lint all packages
- `pnpm typecheck` — type-check all packages
- `pnpm test` — run all tests
- `pnpm ci:local` — run full CI pipeline locally (typecheck → lint → format → tests → e2e)
