# Contributing to Vienna

Thanks for considering a contribution. This guide covers how to set up, what
we expect in PRs, and how we triage.

## Before you start

- **Open an issue first for anything non-trivial.** A quick design sketch saves
  you (and us) rework. Bug fixes and typo/docs PRs don't need one.
- **Read the [Code of Conduct](./CODE_OF_CONDUCT.md).** By participating you
  agree to it.
- **Check the [roadmap](./ROADMAP.md)** (coming) — some areas are already owned
  or under active redesign.

## Development setup

Requirements: **macOS 13+**, **Node 22+**, **pnpm 10+**.

```bash
git clone https://github.com/tryvienna/desktop.git
cd vienna
pnpm install
pnpm dev
```

If `pnpm dev` fails with native-module errors, run `pnpm rebuild:native`.

### Running tests

```bash
pnpm test              # full test suite
pnpm test:unit         # fast unit tests only
pnpm test:integration  # integration tests
pnpm test:e2e          # Playwright E2E (slow)
```

Individual packages: `pnpm --filter @vienna/ipc test`, etc.

### Typecheck, lint, format

```bash
pnpm typecheck
pnpm lint
pnpm format            # writes; use `pnpm format:check` for CI-safe
```

Run them locally before pushing. Automated CI checks are on the roadmap but
not enabled yet — expect maintainer review to cover them for now.

## Making a change

1. **Branch from `main`.** Name it descriptively — `fix/session-race`,
   `feat/homebrew-cask`, etc.
2. **Keep PRs focused.** One logical change per PR. Refactors should be
   separate from behavior changes.
3. **Follow [Conventional Commits](https://www.conventionalcommits.org/).**
   We auto-generate the changelog from commit messages:
   - `feat: add Homebrew cask installer`
   - `fix: close MCP sockets on fatal error`
   - `docs: clarify VIENNA_WEB_URL usage`
   - `refactor:`, `test:`, `chore:`, `perf:`, etc.
4. **Add tests.** New behavior needs tests. Bug fixes ideally get a regression
   test that fails without the fix.
5. **Sign your commits (DCO).** We use the
   [Developer Certificate of Origin](https://developercertificate.org/). Add
   `Signed-off-by: Your Name <you@example.com>` to each commit — easiest via
   `git commit -s`. Maintainers check DCO at review time; automation may be
   added later.

### PR checklist

Before you hit "ready for review":

- [ ] `pnpm typecheck` passes locally
- [ ] `pnpm lint` passes locally
- [ ] `pnpm test` passes for affected packages
- [ ] New behavior has tests
- [ ] User-visible change has a `CHANGELOG` entry (done automatically by
      `pnpm changelog:generate` if your commit message is conventional)
- [ ] Commits are signed-off (DCO)
- [ ] PR description explains *why*, not just *what*

## Code conventions

See [CLAUDE.md](./CLAUDE.md) for the codebase conventions we follow. Highlights:

- ESM everywhere, TypeScript strict
- Environment variables accessed via `@vienna/env`, never `process.env` directly
- Logging via `@vienna/logger`, never `console.*` in production paths
- IPC between main and renderer goes through `@vienna/ipc` with Zod validation
- Shell execution goes through the shell IPC handler — don't spawn from the
  renderer

## Reporting bugs

File an issue with the [bug template](./.github/ISSUE_TEMPLATE/bug_report.yml).
Include:

- Vienna version (Help → About) and macOS version
- Steps to reproduce
- What you expected vs. what happened
- Logs from `~/Library/Logs/Vienna/` if they help

Security bugs go to `security@tryvienna.dev` — see [SECURITY.md](./SECURITY.md).

## Proposing a plugin

If you want your plugin listed in the official registry, open a PR against
[tryvienna/registry](https://github.com/tryvienna/registry) with your plugin's
manifest entry. See that repo's CONTRIBUTING for the acceptance checklist
(license, test, maintenance plan, etc.).

Plugins that aren't first-party still work fine locally; they just won't be
surfaced in the in-app registry UI.

## Release process

Maintainers only. See `scripts/ship.sh`. Today the release flow runs locally
(bump version, `pnpm changelog:finalize`, build + sign + notarize, upload to
GitHub Releases). Automated release pipelines are tracked in the roadmap.

## Questions

- [GitHub Discussions](https://github.com/tryvienna/desktop/discussions) for
  open-ended questions and ideas
- [Issues](https://github.com/tryvienna/desktop/issues) for bugs and concrete
  feature requests
- `security@tryvienna.dev` for security-sensitive reports
- `conduct@tryvienna.dev` for Code of Conduct concerns
