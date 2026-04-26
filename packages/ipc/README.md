# @vienna/ipc

Type-safe, Zod-validated IPC framework for Electron apps. Provides a 4-phase pipeline for defining, implementing, exposing, and consuming IPC methods and events with full TypeScript inference and runtime validation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Shared Contract                            │
│  defineApi({ users: { create: method({ input, output }) } })       │
│  defineEvents({ users: { onCreated: event({ payload }) } })        │
└───────────────┬──────────────────────────────────────┬──────────────┘
                │                                      │
    ┌───────────▼───────────┐            ┌─────────────▼─────────────┐
    │    Main Process       │            │    Preload Script          │
    │  implement(ipcMain,   │            │  expose(contextBridge,     │
    │    api, handlers)     │            │    ipcRenderer, api,       │
    │  createEmitter(events,│            │    events)                 │
    │    targets)           │            └─────────────┬──────────────┘
    └───────────────────────┘                          │
                                          ┌────────────▼─────────────┐
                                          │    Renderer Process       │
                                          │  getApi(api)              │
                                          │  getEvents(events)        │
                                          └──────────────────────────┘
```

### The 4 Phases

1. **Define** — Create contracts with Zod schemas. Shared across all processes.
2. **Implement** — Register `ipcMain.handle()` handlers. Main process only.
3. **Expose** — Bridge API to renderer via `contextBridge`. Preload script only.
4. **Consume** — Get typed clients. Renderer process only.

## Recommended Project Structure

Organize IPC as a modular domain system. Each domain owns its contract and handlers. A shared barrel re-exports the merged contract, and a separate registration file wires handlers in the main process.

```
src/ipc/
├── index.ts              # Contract barrel (safe for ALL processes)
├── register.ts           # Main-process registration (main.ts only)
├── system/
│   ├── contract.ts       # defineApi() with Zod schemas
│   └── handlers.ts       # Handler implementations
├── users/
│   ├── contract.ts
│   └── handlers.ts
└── settings/
    ├── contract.ts
    └── handlers.ts
```

### Critical: Process Safety

The contract barrel (`ipc/index.ts`) **must not** import main-process code. It is imported by the preload script, which runs in a sandboxed environment without access to Node.js APIs, `process.versions`, etc. If `index.ts` imports handlers or `@vienna/ipc/main`, the preload will fail silently and the app will render blank.

| File                       | Imports from                     | Safe for          |
| -------------------------- | -------------------------------- | ----------------- |
| `ipc/index.ts`             | Domain contracts only            | All processes     |
| `ipc/register.ts`          | `@vienna/ipc/main`, handlers     | Main process only |
| `ipc/<domain>/contract.ts` | `@vienna/ipc`, `zod`             | All processes     |
| `ipc/<domain>/handlers.ts` | App services, `@vienna/env/main` | Main process only |

### Adding a New Domain

1. Create `ipc/<domain>/contract.ts`:

```ts
// ipc/users/contract.ts
import { z } from 'zod';
import { defineApi, method } from '@vienna/ipc';

export const usersApi = defineApi({
  users: {
    create: method({
      input: z.object({ name: z.string().min(1), email: z.string().email() }),
      output: z.object({ id: z.string(), name: z.string(), email: z.string() }),
    }),
    get: method({
      input: z.object({ id: z.string() }),
      output: z.object({ id: z.string(), name: z.string(), email: z.string() }),
    }),
  },
});
```

2. Create `ipc/<domain>/handlers.ts`:

```ts
// ipc/users/handlers.ts
import type { ApiHandlers } from '@vienna/ipc';
import type { usersApi } from './contract';

export const usersHandlers: ApiHandlers<typeof usersApi> = {
  users: {
    create: async (input) => {
      const user = await db.users.create(input);
      return user;
    },
    get: async (input) => {
      const user = await db.users.findById(input.id);
      if (!user) throw createNotFoundError('user', { id: input.id });
      return user;
    },
  },
};
```

3. Register in the contract barrel (`ipc/index.ts`):

```ts
import { mergeAllApis } from '@vienna/ipc';
import { systemApi } from './system/contract';
import { usersApi } from './users/contract';

export const api = mergeAllApis(systemApi, usersApi);
```

4. Register in the main-process wiring (`ipc/register.ts`):

```ts
import type { IpcMainLike } from '@vienna/ipc/main';
import { implement } from '@vienna/ipc/main';
import { api } from './index';
import { systemHandlers } from './system/handlers';
import { usersHandlers } from './users/handlers';

const handlers = { ...systemHandlers, ...usersHandlers };

export function registerIpc(ipcMain: IpcMainLike): () => void {
  return implement(ipcMain, api, handlers);
}
```

No changes needed in `main.ts`, `preload.ts`, or renderer code — they all reference `api` from `ipc/index.ts` which picks up the new domain automatically.

## Quick Start

### 1. Define the Contract

```ts
// ipc/system/contract.ts
import { z } from 'zod';
import { defineApi, method } from '@vienna/ipc';

export const systemApi = defineApi({
  system: {
    getVersions: method({
      input: z.object({}),
      output: z.object({
        electron: z.string(),
        node: z.string(),
        chrome: z.string(),
      }),
    }),
  },
});
```

### 2. Implement Handlers (Main Process)

```ts
// ipc/system/handlers.ts
import type { ApiHandlers } from '@vienna/ipc';
import type { systemApi } from './contract';

export const systemHandlers: ApiHandlers<typeof systemApi> = {
  system: {
    getVersions: () => ({
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome,
    }),
  },
};
```

### 3. Wire Up Registration

```ts
// ipc/index.ts (contract barrel — safe for all processes)
import { systemApi } from './system/contract';
export const api = systemApi;

// ipc/register.ts (main-process only)
import type { IpcMainLike } from '@vienna/ipc/main';
import { implement } from '@vienna/ipc/main';
import { api } from './index';
import { systemHandlers } from './system/handlers';

export function registerIpc(ipcMain: IpcMainLike): () => void {
  return implement(ipcMain, api, systemHandlers);
}
```

### 4. Main Process

```ts
// main.ts
import { ipcMain } from 'electron';
import { registerIpc } from './ipc/register';

const cleanupIpc = registerIpc(ipcMain);

app.on('will-quit', () => {
  cleanupIpc();
});
```

### 5. Preload Script

```ts
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { expose } from '@vienna/ipc/preload';
import { api } from './ipc';

expose(contextBridge, ipcRenderer, api);
```

### 6. Renderer

```ts
// App.tsx
import { getApi } from '@vienna/ipc/renderer';
import { api } from './ipc';

// Call inside useEffect or event handlers — not at module scope
const client = getApi(api);
const versions = await client.system.getVersions({});
```

**Important:** Call `getApi()` inside `useEffect` or event handlers, not at module scope. Module-scope calls execute before test harnesses can set up, causing `window.api is not available` errors in tests.

## Events

### Defining Events

```ts
import { defineEvents, event } from '@vienna/ipc';

export const events = defineEvents({
  users: {
    onCreated: event({
      payload: z.object({ userId: z.string(), name: z.string() }),
    }),
  },
});
```

### Emitting Events (Main Process)

```ts
import { createEmitter } from '@vienna/ipc/main';

const emitter = createEmitter(events, {
  getWebContents: () => BrowserWindow.getAllWindows().map((w) => w.webContents),
});

emitter.users.onCreated({ userId: '123', name: 'Alice' });
```

### Subscribing to Events (Renderer)

```ts
import { getEvents } from '@vienna/ipc/renderer';

const subscriptions = getEvents(events);
const unsub = subscriptions.users.onCreated((payload) => {
  console.log('User created:', payload.userId);
});
```

### Exposing Events in Preload

```ts
expose(contextBridge, ipcRenderer, api, events);
```

## Export Paths

| Path                   | Environment      | Exports                                                                        |
| ---------------------- | ---------------- | ------------------------------------------------------------------------------ |
| `@vienna/ipc`          | Any              | `defineApi`, `defineEvents`, `method`, `event`, merge utilities, types, errors |
| `@vienna/ipc/main`     | Main process     | `implement`, `createEmitter`                                                   |
| `@vienna/ipc/preload`  | Preload script   | `expose`                                                                       |
| `@vienna/ipc/renderer` | Renderer process | `getApi`, `getEvents`, `isApiAvailable`, `areEventsAvailable`                  |
| `@vienna/ipc/errors`   | Any              | Error schemas, type guards, factories, `IpcMethodError`, `normalizeError`      |
| `@vienna/ipc/testing`  | Tests            | Mock factories, `createTestHarness`                                            |

## Error Handling

Errors are a discriminated union on the `type` field. They serialize safely across the IPC boundary.

| Type                | When                              | Key Fields                  |
| ------------------- | --------------------------------- | --------------------------- |
| `validation`        | Input/output fails Zod validation | `field?`, `details?`        |
| `not_found`         | Resource doesn't exist            | `resource`, `id?`           |
| `permission_denied` | User lacks permission             | `required?`, `action?`      |
| `rate_limited`      | Rate limit exceeded               | `retryAfter?`, `limit?`     |
| `internal`          | Unexpected error                  | `code?`, `stack?`           |
| `timeout`           | Operation timed out               | `timeoutMs?`                |
| `network`           | Network failure                   | `statusCode?`, `url?`       |
| `conflict`          | State conflict                    | `conflictingId?`, `reason?` |

### Catching Errors

In the renderer, failed method calls throw `IpcMethodError`:

```ts
import { isIpcMethodError } from '@vienna/ipc/errors';

try {
  await client.users.get({ id: 'nonexistent' });
} catch (err) {
  if (isIpcMethodError(err)) {
    console.log(err.error.type); // 'not_found', 'validation', etc.
    console.log(err.error.message); // Human-readable message
    console.log(err.group); // 'users'
    console.log(err.method); // 'get'
  }
}
```

### Throwing Typed Errors in Handlers

Use factory helpers to throw structured errors from handlers:

```ts
import { createNotFoundError, createValidationError } from '@vienna/ipc/errors';

const usersHandlers: ApiHandlers<typeof usersApi> = {
  users: {
    get: async (input) => {
      const user = await db.users.findById(input.id);
      if (!user) {
        throw createNotFoundError('user', { id: input.id });
      }
      return user;
    },
  },
};
```

## Testing

### createTestHarness()

The test harness wires the full Define > Implement > Expose > Consume pipeline in memory. No Electron required.

```ts
import { createTestHarness } from '@vienna/ipc/testing';
import { api } from './ipc';

let cleanup: (() => void) | undefined;

beforeAll(() => {
  const harness = createTestHarness(api, {
    system: {
      getVersions: async () => ({
        electron: '40.0.0',
        node: '22.0.0',
        chrome: '130.0.0',
      }),
    },
  });
  cleanup = harness.cleanup;
});

afterAll(() => {
  cleanup?.();
});

it('renders version info', async () => {
  render(<App />);
  await waitFor(() => {
    expect(screen.getByText(/Electron 40/)).toBeInTheDocument();
  });
});
```

The harness installs mock IPC on `globalThis`, so `getApi(api)` in components automatically finds the mock handlers.

### Individual Mock Factories

For lower-level tests:

```ts
import {
  createMockIpcMain,
  createMockIpcRenderer,
  createMockContextBridge,
  createMockWebContents,
} from '@vienna/ipc/testing';

const ipcMain = createMockIpcMain();
ipcMain.handle('test', async (_event, input) => ({ echo: input }));
const result = await ipcMain.invoke('test', 'hello'); // { echo: 'hello' }

const ipcRenderer = createMockIpcRenderer(ipcMain); // auto-wired to ipcMain
await ipcRenderer.invoke('test', 'world'); // { echo: 'world' }
```

## Advanced Usage

### Custom Channel Resolvers

Override the default `ipc:{group}:{method}` channel naming:

```ts
const resolver = (group: string, method: string) => `v2:${group}:${method}`;

implement(ipcMain, api, handlers, { channelResolver: resolver });
expose(contextBridge, ipcRenderer, api, events, {
  channelResolver: resolver,
  eventChannelResolver: (g, e) => `v2:${g}:${e}`,
});
```

### Custom Window Keys

Change the default `window.api` / `window.events` keys:

```ts
// Preload
expose(contextBridge, ipcRenderer, api, events, {
  apiKey: 'myApp',
  eventsKey: 'myEvents',
});

// Renderer
const client = getApi(api, 'myApp');
const subs = getEvents(events, 'myEvents');
```

### Input Validation in Preload (Fail Fast)

Validate inputs before the IPC round-trip:

```ts
expose(contextBridge, ipcRenderer, api, events, {
  validateInput: true, // throws IpcMethodError with type: 'validation' for bad inputs
});
```

### Static Emitter Targets

If you have a fixed set of windows:

```ts
const emitter = createEmitter(events, {
  webContents: [mainWindow.webContents],
});
```

## Design Principles

- **No global mutable state** — channel resolvers are passed as options, not set globally
- **No `require('electron')`** — Electron types are `import type` only; runtime objects are injected via function parameters
- **No raw `emit()`** — only `createEmitter()` provides type-safe event emission
- **No fake React hooks** — only `getApi()` / `getEvents()` plus availability checks
- **Separate window keys** — methods on `window.api`, events on `window.events` (both configurable)
- **Proper error narrowing** — `IpcResult<T>` discriminated union, no `as any` casts
- **`IpcMethodError` importable from errors** — not buried inside preload internals

## Wire Protocol

Methods use Electron's invoke/handle pattern. All responses are wrapped in `IpcResult<T>`:

```
Renderer                  Main Process
   │                         │
   │  ipcRenderer.invoke()   │
   │ ───────────────────────>│
   │                         │  validate input
   │                         │  execute handler
   │                         │  wrap result
   │  IpcResult<T>           │
   │ <───────────────────────│
   │                         │
   │  { success: true,       │  success
   │    data: T }            │
   │  { success: false,      │  failure
   │    error: IpcError }    │
```

Events use Electron's send/on pattern:

```
Main Process              Renderer
   │                         │
   │  webContents.send()     │
   │ ───────────────────────>│
   │                         │  ipcRenderer.on()
   │                         │  invoke callback(payload)
```

## Commands

```bash
pnpm test:unit       # Run all 111 unit tests
pnpm test:coverage   # Run tests with coverage report
pnpm typecheck       # Type check
pnpm lint            # Lint
pnpm format          # Format
```
