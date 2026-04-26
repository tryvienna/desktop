# @vienna/env

**This package is the ONLY authorized way to access environment variables in the Vienna codebase.**

## Rules

1. **NEVER use `process.env` directly** in the desktop app (`apps/desktop/src/`). The ESLint rule `no-restricted-syntax` will break the build if you do.
2. **NEVER use `import.meta.env` directly** in the desktop app. Same ESLint rule applies.
3. **Always import from `@vienna/env`** to access environment variables.

## How it works

### Main process (`src/main.ts`, handler files)

```typescript
import { mainEnv } from '@vienna/env/main';

// Access validated env vars:
mainEnv.NODE_ENV; // 'development' | 'production' | 'test'
mainEnv.CI; // string | undefined
mainEnv.VIENNA_DATA_DIR; // string | undefined — overrides app data directory
mainEnv.MAIN_WINDOW_VITE_DEV_SERVER_URL; // string (URL) | undefined
mainEnv.MAIN_WINDOW_VITE_NAME; // string (defaults to 'main_window')
```

### Renderer process (React components)

The renderer is sandboxed and cannot access `process.env`. Environment values are passed through the IPC bridge via `@vienna/ipc`:

```typescript
import { getApi } from '@vienna/ipc/renderer';
import { api } from './ipc';

// Inside useEffect or event handlers — not at module scope
const client = getApi(api);
const env = await client.system.getEnv({});
env.NODE_ENV; // 'development' | 'production' | 'test'
env.isDev; // boolean
env.isProd; // boolean
env.isTest; // boolean
env.isCI; // boolean
```

Direct `window` property access is prohibited by ESLint — use `@vienna/ipc/renderer` instead.

### Adding a new environment variable

1. Add the Zod field to the schema in `packages/env/src/main.ts` (`mainEnvSchema`)
2. If it should be exposed to the renderer:
   - Add it to `rendererEnvSchema` in `packages/env/src/renderer.ts`
   - Map it in the `createRendererEnv()` function
   - The IPC contract in `apps/desktop/src/ipc/system/contract.ts` uses `rendererEnvSchema` directly as its output schema, so new fields are picked up automatically
3. Run `pnpm build` from the monorepo root to rebuild

## Architecture

- `src/main.ts` — Zod schema + validated `mainEnv` singleton (the single `process.env` access point)
- `src/renderer.ts` — Renderer-safe schema + `createRendererEnv()` factory
- `src/index.ts` — Re-exports both

The `process.env` access in `src/main.ts` has an `eslint-disable` comment — this is intentional and is the ONLY place this is allowed.

## Not to be confused with @vienna/shell-env

This package (`@vienna/env`) provides validated access to **specific, named config variables** (NODE_ENV, CI, etc.).

For **spawning child processes** with the user's full shell environment (SSH_AUTH_SOCK, PATH, etc.), use `@vienna/shell-env` instead. See `packages/shell-env/CLAUDE.md`.
