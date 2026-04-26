# FAQ & Troubleshooting

## Getting started

### Does Vienna send my code anywhere?

No. Vienna is BYOK and local-first. Prompts and tool I/O go directly
from your machine to the AI provider you're using. Vienna-operated
servers never see your code. See
[PRIVACY.md](https://github.com/tryvienna/desktop/blob/main/PRIVACY.md).

### Can I use Vienna without signing in?

Yes. The hosted backend at `tryvienna.dev` is optional. Skip the sign-in
on first launch, or set `VIENNA_WEB_URL=""` before launch to disable
the path entirely.

### Which AI providers are supported?

Today: Claude (Anthropic), Codex (OpenAI), and Gemini (Google) — all
BYOK. New providers are added through `packages/agent-providers/`.
Open a feature request if your provider isn't listed.

### Can I use multiple providers at once?

Yes. Each workstream picks one, but different workstreams can use
different providers. You can also switch providers mid-conversation
(you'll see a context handoff note).

### Is Vienna free?

Yes. Vienna is free under Apache 2.0 and will remain so. You pay the
AI provider for token usage at their posted rates.

## Permissions

### Why is the agent asking to read a file it shouldn't need?

Agents sometimes over-read for context. Deny the read if it's
irrelevant; the agent will adapt. For repeated annoyance, create a
persistent deny rule via **Settings → Permissions**.

### How do I let the agent run arbitrary shell commands?

You don't — the permission model doesn't have a single "allow all
Bash" switch on purpose. You can allow specific commands (e.g.
`Bash(npm:*)` allows `npm` invocations of any shape) or raise the
workstream's preset to `autonomous`, which auto-approves common safe
commands. Review what `autonomous` includes before switching.

### I approved a permission and now I want to revoke it

**Settings → Permissions** lists every rule with a revoke button.
Rules are scoped — revoking a persistent rule removes it globally;
revoking a session rule affects only the current session.

## Plugins

### How do I install a plugin?

Two paths:

- From inside Vienna: **Plugins drawer → Install**, then paste the
  plugin's GitHub URL or search the registry.
- From the CLI: `vcli plugin install <github-url>`.

### How do I build my own plugin?

See the [plugin development guide](./guide/plugin-development) or run
`vcli plugin scaffold --name=myplugin`.

### My plugin isn't showing up

Check:
1. The plugin's manifest (`plugin.json` or the `definePlugin` call)
   has the right `id`
2. The registry fetch succeeded — see **Settings → Plugins → Sync
   status**
3. Logs: `~/Library/Logs/Vienna/` filtered for `plugin`

## Performance

### Vienna is slow to start on my machine

Cold-start is dominated by SQLite opens and plugin registry sync. Try:

- Disable plugins you don't use (**Plugins drawer → Installed → Disable**)
- Move the data directory off an encrypted/slow volume: set
  `VIENNA_DATA_DIR=/path/to/fast/ssd`

### File indexing pegs my CPU

The file indexer honors `.gitignore` but large repos still take time
on first run. Subsequent launches use the cache. If you see runaway
indexing, file an issue with your repo's approximate size (number of
tracked files + disk usage).

## Data / storage

### Where does Vienna store my data?

- **App state and agent events**: SQLite at
  `~/Library/Application Support/Vienna/`
- **API keys**: macOS Keychain (look for "Vienna" entries)
- **Logs**: `~/Library/Logs/Vienna/`

### How do I reset Vienna to a clean state?

**Settings → Advanced → Reset local data**, or manually delete the
three paths above. API keys must be deleted from Keychain Access
separately.

### Can I sync my workstreams across machines?

Not today. Workstreams and their conversation history are local-only.
Cross-device sync is on the roadmap as a later phase; the design
question is how to do it without compromising the local-first
promise.

## Contributing

### I want to fix a bug — where do I start?

1. Read [CONTRIBUTING.md](https://github.com/tryvienna/desktop/blob/main/CONTRIBUTING.md)
2. Read [docs/architecture.md](https://github.com/tryvienna/desktop/blob/main/docs/architecture.md)
3. Look for `good first issue` labels, or open an issue for the bug
   and discuss before implementing

### My PR is failing checks

Today we don't run automated CI yet (tracked on the roadmap). If a
maintainer reviewing your PR asks for typecheck/lint/test fixes, run
`pnpm typecheck`, `pnpm lint`, `pnpm test` locally and address
anything red.

### I want to propose a new first-party plugin

Open an issue with the
[plugin request template](https://github.com/tryvienna/desktop/issues/new?template=plugin_request.yml).
You don't need maintainer blessing to build and distribute a
third-party plugin.
