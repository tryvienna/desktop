# @vienna/ipc

Type-safe, Zod-validated IPC framework for Electron apps.

## Architecture

This package provides a 4-phase IPC pipeline:

1. **Define** (`@vienna/ipc`) — `defineApi()`, `defineEvents()`, `method()`, `event()`
2. **Implement** (`@vienna/ipc/main`) — `implement()` registers handlers in main process
3. **Expose** (`@vienna/ipc/preload`) — `expose()` bridges to renderer via contextBridge
4. **Consume** (`@vienna/ipc/renderer`) — `getApi()`, `getEvents()` for typed client

## Key Design Principles

- **No global mutable state** — channel resolvers are passed as options, not set globally
- **No dynamic require('electron')** — all Electron types are `import type`, runtime references are injected
- **No raw emit()** — only `createEmitter()` for type-safe event emission
- **No fake React hooks** — only `getApi()`/`getEvents()` + availability checks
- **Separate window keys** — methods on `window.api`, events on `window.events` (configurable)

## Recommended Project Structure

When adopting this package, organize IPC as a modular domain system:

```
src/ipc/
├── index.ts              # Contract barrel (safe for ALL processes)
├── register.ts           # Main-process registration (main.ts only)
├── <domain>/
│   ├── contract.ts       # defineApi() with Zod schemas
│   └── handlers.ts       # Handler implementations (main-process only)
```

### Critical: Process Safety

The contract barrel (`ipc/index.ts`) must NEVER import main-process code (`@vienna/ipc/main`, handler files, `@vienna/env/main`, etc.). It is imported by the preload script, which runs in a sandboxed environment. If it pulls in main-process dependencies, the preload fails silently and the app renders blank.

- `ipc/index.ts` — imports **only** domain contracts. Safe for all processes.
- `ipc/register.ts` — imports `@vienna/ipc/main` + handlers. Main process only.
- `main.ts` imports from `./ipc/register`
- `preload.ts` and renderer code import from `./ipc` (the contract barrel)

### Adding a New Domain

1. Create `ipc/<domain>/contract.ts` with `defineApi()` and Zod schemas
2. Create `ipc/<domain>/handlers.ts` with typed `ApiHandlers`
3. Import the contract in `ipc/index.ts` and add to `mergeAllApis()`
4. Import the handlers in `ipc/register.ts` and spread into the handlers object
5. No changes needed in `main.ts`, `preload.ts`, or renderer code

## Consuming in the Renderer

```ts
import { getApi } from '@vienna/ipc/renderer';
import { api } from './ipc';

// Inside useEffect or event handlers — NOT at module scope
const client = getApi(api);
const data = await client.<domain>.<method>({});
```

**Important:** `getApi()` must be called inside `useEffect` or event handlers, not at module scope. Module-scope calls execute before test harnesses set up, causing `window.api is not available` errors.

## Testing

Use `createTestHarness()` from `@vienna/ipc/testing` to wire the full IPC pipeline in memory without Electron:

```ts
import { createTestHarness } from '@vienna/ipc/testing';
import { api } from './ipc';

const harness = createTestHarness(api, {
  <domain>: {
    <method>: async (input) => ({ /* mock response */ }),
  },
});

// getApi(api) in components will find the mock handlers
// Call harness.cleanup() in afterAll
```

## Export Paths

- `@vienna/ipc` — definitions, types, errors (no Electron dependency)
- `@vienna/ipc/main` — main process: `implement()`, `createEmitter()`
- `@vienna/ipc/preload` — preload: `expose()`
- `@vienna/ipc/renderer` — renderer: `getApi()`, `getEvents()`
- `@vienna/ipc/errors` — error types, schemas, guards, factories
- `@vienna/ipc/testing` — mock helpers for testing without Electron

## Commands

```bash
pnpm test:unit       # Run unit tests
pnpm test:coverage   # Run tests with coverage
pnpm typecheck       # Type check
pnpm lint            # Lint
pnpm format          # Format
```
