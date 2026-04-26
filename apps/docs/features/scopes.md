---
command-palette-label: Scopes
command-palette-description: Groups of workstreams with shared configuration
---

# Scopes

A **scope** groups related workstreams together under a shared configuration. Scopes appear as sections in the sidebar. Workstreams not in any scope appear under "Workstreams."

<!-- TODO: Replace placeholder video ID (a2wERrLIYmI) with actual scopes video -->
<iframe width="560" height="315" src="https://www.youtube.com/embed/a2wERrLIYmI" title="Scopes overview" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="max-width: 100%; aspect-ratio: 16/9; margin: 1.5em 0;"></iframe>

## What scopes provide

- **Shared directories & branches** — Set once, inherited by every workstream in the scope.
- **Permissions** — Override which tools the agent can use for all workstreams in the scope.
- **Worktree isolation** — Automatically create a separate worktree for each new workstream in the scope.
- **Tags & linked entities** — Apply context that flows to every workstream in the scope.
- **Emoji icons** — Optionally assign an emoji to visually distinguish scopes in the sidebar.

## When to use scopes

- You're working on a feature that needs multiple parallel workstreams (frontend, backend, tests)
- You want a set of workstreams to share the same branch or directory configuration
- You want stricter or looser permissions for a category of work

## Tips

- Use **CMD+SHIFT+N** to quickly create a new scope
- You can drag workstreams between scopes in the sidebar
- Deleting a scope also deletes all workstreams within it — you'll be asked to confirm
