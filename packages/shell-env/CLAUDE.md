# @vienna/shell-env

**This package resolves the user's full login shell environment for child process spawning.**

It exists because macOS GUI apps launched from Finder/Dock inherit a minimal `process.env` missing `SSH_AUTH_SOCK`, `GPG_TTY`, the full `PATH`, and other shell-configured variables.

## Usage

```typescript
import { getEnrichedEnv } from '@vienna/shell-env';

// Pass to any child process spawn:
spawn('git', ['status'], { env: getEnrichedEnv() });

// With extra overrides:
execFile('node', ['server.js'], { env: getEnrichedEnv({ MY_VAR: 'value' }) });
```

## How it works

On first call, invokes the user's interactive login shell (`$SHELL -ilc 'env -0'`) to capture the full environment. The result is cached for the process lifetime.

On Windows, returns `process.env` directly (GUI apps already inherit the full environment).

## Rules

1. **All child process spawning in the desktop app must use `getEnrichedEnv()`** — never pass raw `process.env` or omit `env` from spawn options.
2. **This package has zero internal dependencies** — it only uses `node:child_process`.
3. **`resolve.ts` is the single authorized `process.env` access point** in this package.

## Difference from @vienna/env

- `@vienna/env` — Zod-validated accessor for specific, named config variables (NODE_ENV, CI, etc.). Used in both main and renderer processes.
- `@vienna/shell-env` — Resolves the **full** shell environment for spawning child processes. Main-process only.
