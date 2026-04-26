---
command-palette-label: Workstreams
command-palette-description: Threads of work with an AI agent
---

# Workstreams

A **workstream** is a single thread of work with an AI agent. Each workstream has its own conversation, context, and state.

Think of a workstream like giving a task to a colleague — "fix the auth bug", "add dark mode", "refactor the API layer." The agent works within the workstream's context: its directories, branches, permissions, and linked entities.

<!-- TODO: Replace placeholder video ID (a2wERrLIYmI) with actual workstreams video -->
<iframe width="560" height="315" src="https://www.youtube.com/embed/a2wERrLIYmI" title="Workstreams overview" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="max-width: 100%; aspect-ratio: 16/9; margin: 1.5em 0;"></iframe>

## Key concepts

- **Status** — Each workstream has a live status: *idle*, *active*, *processing*, *waiting for permission*, *needs review*, or *completed (unviewed)*. Status icons in the sidebar update in real time.
- **Model** — Choose which AI model powers each workstream. Different tasks may benefit from different models.
- **Directories & branches** — Workstreams can be pointed at specific code directories and git branches, so the agent knows where to work.
- **Worktrees** — Optionally give a workstream its own git worktree so it works on an isolated branch without affecting your main checkout.

## Tips

- Use **CMD+N** to quickly create a new workstream
- Pin important workstreams so they always appear at the top of the sidebar
- Archive workstreams you're done with to keep the sidebar clean
