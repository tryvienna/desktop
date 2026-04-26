# Getting Started

Install Vienna, open a project, and run your first agent in 10 minutes.

## Install

Vienna is macOS-only today. Windows and Linux are on the
[roadmap](https://github.com/tryvienna/desktop/blob/main/ROADMAP.md).

Download the latest signed DMG from
[GitHub Releases](https://github.com/tryvienna/desktop/releases), drag
Vienna into `/Applications`, and open it. macOS will verify the
signature on first launch.

To build from source, see the main repo's
[README](https://github.com/tryvienna/desktop#build-from-source).

## First launch

On first launch Vienna asks you to:

1. **Set up an AI provider.** Bring your own API key (BYOK). You can
   add keys for Claude, Codex, and Gemini at once — Vienna stores them
   in the macOS Keychain. Your keys never touch Vienna-operated
   servers.
2. **Pick a default permission preset.** Ranges from fully manual
   ("ask for every tool") to autonomous ("allow file reads and safe
   shell commands"). You can change this per-workstream later.
3. **Optionally sign in.** The hosted backend at `tryvienna.dev` is
   optional — you can skip this and use Vienna entirely offline.

## Open a project

Vienna organizes your work into **projects**. A project is just a
directory on disk.

1. Click the **+** in the sidebar and pick a directory.
2. Vienna indexes the project (read-only) and creates a **default
   workstream**.

## Run your first agent

A **workstream** is an isolated workspace: it has a dedicated git
worktree, linked issues, and a persistent conversation with an agent.

1. Select the default workstream.
2. Type a prompt in the composer. Try something concrete, e.g.:
   > "Read `README.md` and summarize what this project does."
3. Hit enter. The agent will ask for permission to read the file;
   approve it. You'll see its output stream in.

### Approving tools

When an agent wants to run a tool (read a file, search with grep,
execute a shell command), Vienna shows a permission prompt:

- **Allow once** — just this one call
- **Allow for this session** — matching calls for the rest of this
  workstream's session
- **Allow permanently** — persists as a rule across restarts

You can audit your rules at any time from **Settings → Permissions**.

## Next steps

- Set up a [routine](./features/) to run an agent on a schedule
- Browse the [plugin registry](https://github.com/tryvienna/registry)
  and install a GitHub or Linear integration
- Build your own plugin — see the
  [plugin development tutorial](./guide/plugin-development)
