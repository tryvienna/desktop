# Roadmap

A living document. The short-term list is near-certain; the medium-term list
is directional; the long-term list is intent. We welcome feedback and
suggestions through [issues](https://github.com/tryvienna/desktop/issues)
and [discussions](https://github.com/tryvienna/desktop/discussions).

Last updated: 2026-04-24.

## Now (v0.1.x)

Open-source launch hardening.

- [x] Apache 2.0 license + OSS hygiene (README, CONTRIBUTING, SECURITY,
      CoC, issue/PR templates)
- [ ] Fix known P0 bugs from the internal assessment (race conditions in
      SessionManager and WorkstreamManager; orphaned LspServerInstance
      children; git-utils branch name hardening)
- [ ] Raise test coverage on security-critical surfaces: shell IPC handlers,
      `packages/agent-permissions`, `packages/git-utils`
- [ ] Plugin repo boilerplate (LICENSE, README, CI scaffold) applied across
      the 14 first-party plugin repos
- [ ] Plugin registry documented: how to submit, how it's discovered
- [ ] Public docs site at `docs.tryvienna.dev` covering install, concepts,
      plugin development, and SDK reference

## Next (v0.2 – v0.3)

Contributor experience and reach.

- [ ] GitHub Actions CI/CD: PR typecheck/lint/test, tag-driven release
      builds (macOS signed DMG), DCO check, license-compatibility check
- [ ] Pre-commit hooks (husky + lint-staged) — opt-in for contributors
- [ ] Homebrew cask install path
- [ ] Crash reporting opt-in (off by default; user explicitly opts in with
      a prompt; fully documented in `PRIVACY.md`)
- [ ] Auto-updater pointing at GitHub Releases as the default channel
- [ ] Accessibility pass (VoiceOver, keyboard nav, contrast) on main canvases
- [ ] Architecture deep-dives in `docs/` for the IPC framework, plugin
      loader, permission model, and agent providers

## Later (v0.4+)

Platform breadth.

- [ ] Windows and Linux builds. Windows first; Linux after stability.
- [ ] Plugin sandboxing review — stronger isolation between plugin and host
- [ ] Additional first-party agent providers beyond Claude / Codex / Gemini
- [ ] Official Docker image for the relay (for self-hosting)
- [ ] RFC process for significant changes (`rfcs/` directory + discussion
      template)
- [ ] Contributor License or DCO automation (depending on community scale)

## Explicitly out of scope

- Hosting managed Vienna as a service for users. Vienna stays local-first
  and BYOK. The hosted backend at `tryvienna.dev` handles only optional
  auth, feedback, and the public plugin directory.
- Proprietary features that would split the codebase between OSS and
  private builds. If an enterprise offering emerges later, it will be
  additive plugins rather than a fork of the core.

## How to influence this roadmap

- Open an issue for bugs or features; tag it and we'll triage.
- Open a discussion for ideas that aren't ready to become issues.
- Plugin authors: propose official first-party status via
  [registry](https://github.com/tryvienna/registry) PRs.

Priorities shift. Nothing here is a commitment unless it's shipped.
