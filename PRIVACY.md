# Privacy

Vienna is local-first. Your code, prompts, and project data stay on your
machine by default. This document describes what data leaves your
machine, under what circumstances, and what controls you have.

Last updated: 2026-04-24.

## What never leaves your machine

- **Source code** you open, edit, or prompt agents about. Vienna does
  not send source to any Vienna-operated server. Ever.
- **Conversation history** with agents. Stored locally in SQLite at
  `~/Library/Application Support/Vienna/`.
- **API keys and tokens**. Stored in the macOS Keychain, accessed only
  by Vienna. They are never transmitted to Vienna-operated servers.
- **Workstream metadata, routines, permissions, plugin configs.**
  Local-only.

## What may leave your machine (and when)

### AI provider traffic (always, by design)

When an agent runs, Vienna sends prompts and tool I/O to the AI provider
you're using — Anthropic (Claude), OpenAI (Codex), Google (Gemini), or
others. This is the same direct BYOK path you'd have if you called those
APIs yourself. Vienna never proxies or inspects this traffic.

The provider's privacy policy applies to that data. Vienna does not log
or store your prompts outside of the local conversation history.

### Optional auth (opt-in)

If you log into a Vienna account (e.g. to track your plugin downloads or
sync preferences across devices), your browser talks to
`tryvienna.dev`. What we receive:

- Your email address
- OAuth tokens issued by the hosted backend to your desktop
- Aggregated usage metadata (session counts, feature flags)

What we do not receive: source code, prompts, tool I/O, file contents.

Run `VIENNA_WEB_URL=""` or don't log in to avoid this path entirely.

### Plugin registry sync (opt-in; default enabled)

Vienna periodically fetches the public
[plugin registry](https://github.com/tryvienna/registry). This is an
unauthenticated GET to a public GitHub URL. No user data is sent; our
servers don't see your IP unless it flows through tryvienna.dev.

Disable in **Settings → Plugins → Auto-sync registry** if you prefer.

### Feedback and bug reports (opt-in)

If you use **Help → Send feedback** inside the app, the text you write
is sent to `tryvienna.dev/api/feedback` with your account (if logged in)
or anonymously. We never include logs or file contents automatically.

### Crash reporting (off by default)

Vienna does not currently collect crash reports. If crash reporting
ships in a future version, it will be:

- Off by default
- Prompt for explicit opt-in the first time, with preview of what's sent
- Scrubbed of file paths, API keys, and personally-identifying info
- Disabled globally via an environment variable

## Telemetry

Vienna ships **no telemetry** by default. We do not collect:

- Which features you use
- Which files you open
- How long you run the app
- Your geographic location
- Any fingerprint of your machine

If anonymous usage telemetry is ever added, it will follow the same
opt-in rules as crash reporting above, will be documented here first,
and will be observable (we'll log what's sent so you can audit it).

## Third-party code

Vienna is built on Electron, Node.js, and many npm packages — see
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md). Some of those
packages may make their own network calls when their code executes.
Notable examples:

- **`electron-updater`**: if auto-update is enabled (default), checks
  GitHub Releases on startup. No user data sent beyond the standard
  HTTPS request metadata.
- **Plugin subprocesses**: plugins run arbitrary code you install and
  can make their own network calls. Vienna does not sandbox network
  access from plugins today. Read a plugin's code before you install it
  — this is why we only list plugins with public source repos.

## Data retention

Data stored locally (SQLite, Keychain, logs) stays on your machine
until you delete it:

- Delete Vienna → Preferences → Advanced → **Reset local data** wipes
  the SQLite files and cached plugin metadata
- API keys must be deleted individually from macOS Keychain Access or
  via Vienna's Settings

On `tryvienna.dev` (only relevant if you logged in):

- Account deletion: email `privacy@tryvienna.dev` with your account
  email. We remove user records and associated logs within 30 days.
- Feedback messages are kept for ~180 days and then purged.

## Contact

- Privacy questions: `privacy@tryvienna.dev`
- Security concerns: see [SECURITY.md](./SECURITY.md)
- For concerns about this policy being inaccurate or incomplete, open
  an issue or email `privacy@tryvienna.dev`.
