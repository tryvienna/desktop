# Logging

Vienna uses structured NDJSON logging powered by [Pino](https://getpino.io/). All logs are written to disk with session-based directories and automatic rotation.

## Developer mode

Logging is gated behind **developer mode** (`Settings → Advanced → Developer Mode`). When developer mode is off, both file logging and console logging are disabled, and the "copy session log path" button in the bottom-right corner is hidden.

| Build type | Default |
|------------|---------|
| Development (`pnpm dev`) | **On** |
| Production (packaged app) | **Off** |

The setting is stored as `advanced.developerMode` in `settings.json`. A `null` value (the default) means "use the environment default". Users can explicitly toggle it on or off in any build.

When toggled at runtime, both the main and renderer loggers are enabled/disabled immediately via `logger.setEnabled()`.

## Two audiences, two interfaces

| Audience | Interface | Package |
|----------|-----------|---------|
| Host app (main/renderer) | `Logger` | `@vienna/logger` |
| Plugins & integrations | `PluginLogger` | `@tryvienna/sdk` |

Plugins must **never** import `@vienna/logger` directly. Instead, they use the `PluginLogger` interface from `@tryvienna/sdk`, which the host injects at runtime via `EntityContext` and `AuthContext`.

## Host app logging

The host app creates loggers for the main and renderer processes:

```typescript
// Main process
import { createMainLogger } from '@vienna/logger/main';

const logger = createMainLogger({ baseLogDir: '/path/to/logs' });
logger.info('App started', { version: '1.0.0' });

// Child loggers carry bindings into every entry
const dbLogger = logger.child({ module: 'database' });
dbLogger.debug('Query executed', { table: 'projects', ms: 12 });
```

```typescript
// Renderer process
import { createRendererLogger } from '@vienna/logger/renderer';

const logger = createRendererLogger();
logger.info('Component mounted');
```

### Log levels

| Level | When to use |
|-------|-------------|
| `trace` | Very fine-grained diagnostic info (host only) |
| `debug` | Diagnostic info useful during development |
| `info` | Normal operational events |
| `warn` | Unexpected but recoverable situations |
| `error` | Failures that need attention |
| `fatal` | Unrecoverable errors before shutdown (host only) |

## Plugin logging with PluginLogger

Plugins receive a `PluginLogger` through context objects. The host injects a scoped child logger automatically — plugins never need to create or configure loggers.

### Interface

```typescript
import type { PluginLogger } from '@tryvienna/sdk';

interface PluginLogger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): PluginLogger;
}
```

Unlike the host-only `Logger`, `PluginLogger` includes `child()` so integrations can create sub-loggers scoped to specific operations.

### Using the logger in integrations

The logger is available via `AuthContext` in `createClient` and via `EntityContext` in entity handlers:

```typescript
import { defineIntegration } from '@tryvienna/sdk';

export const githubIntegration = defineIntegration({
  id: 'github',
  name: 'GitHub',
  icon: { svg: '...' },

  createClient: async (ctx) => {
    // ctx.logger is pre-scoped: { plugin: 'github', integration: 'github' }
    ctx.logger.info('Creating GitHub client');

    const token = await ctx.storage.get('personal_access_token');
    if (!token) {
      ctx.logger.warn('No token configured');
      return null;
    }

    ctx.logger.debug('Client created successfully');
    return new GitHubClient(token);
  },
});
```

### Using the logger in entity handlers

Entity resolve/search/resolveContext handlers receive an `EntityContext` with a scoped logger:

```typescript
// Inside a schema callback
builder.entityObjectType(githubPrEntity, {
  resolve: async (id, ctx) => {
    // ctx.logger is scoped: { plugin: 'github', entity: 'github_pr' }
    ctx.logger.debug('Resolving PR', { owner: id.owner, repo: id.repo });

    const gh = ctx.integrations.github.client;
    if (!gh) return null;

    const pr = await gh.getPullRequest(id.owner, id.repo, Number(id.number));
    return prToEntity(pr);
  },

  search: async (query, ctx) => {
    ctx.logger.info('Searching PRs', { query: query.query });
    // ...
  },
});
```

### Creating child loggers

Use `child()` to add context bindings for a specific operation:

```typescript
createClient: async (ctx) => {
  const opLogger = ctx.logger.child({ operation: 'oauth-refresh' });
  opLogger.info('Refreshing token');
  // All entries from opLogger include { operation: 'oauth-refresh' }
}
```

## How injection works

```
Host Logger (@vienna/logger)
  └─ child({ plugin: 'github' })              → plugin-level logger
       ├─ child({ integration: 'github' })     → AuthContext.logger
       └─ child({ entity: 'github_pr' })       → EntityContext.logger
```

1. When a plugin is loaded, the host creates a child logger scoped with `{ plugin: pluginId }`.
2. For integration `createClient`, the logger is further scoped with `{ integration: integrationId }` and passed via `AuthContext`.
3. For entity handlers, the logger is scoped with `{ entity: entityType }` and passed via `EntityContext`.
4. All log entries automatically include the plugin, integration, and entity scoping — no manual tagging needed.

## Testing

For tests, create a mock logger that captures entries:

```typescript
import type { PluginLogger } from '@tryvienna/sdk';

interface LogEntry {
  level: string;
  msg: string;
  ctx?: Record<string, unknown>;
}

function createMockLogger(): PluginLogger & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const logger: PluginLogger & { entries: LogEntry[] } = {
    entries,
    debug(msg, ctx) { entries.push({ level: 'debug', msg, ctx }); },
    info(msg, ctx) { entries.push({ level: 'info', msg, ctx }); },
    warn(msg, ctx) { entries.push({ level: 'warn', msg, ctx }); },
    error(msg, ctx) { entries.push({ level: 'error', msg, ctx }); },
    child() { return logger; }, // Returns self for simplicity
  };
  return logger;
}
```

The sdk also provides `MockSecureStorage` and `MockPluginLogger` in its testing utilities.

## Rules

- **No `console.*` anywhere** — ESLint enforces this; the build will fail.
- **Plugins use `PluginLogger` from `@tryvienna/sdk`** — never import `@vienna/logger`.
- **Host code imports from `@vienna/logger`** — `@vienna/logger/main` for main process, `@vienna/logger/renderer` for renderer.
- Use structured context objects instead of string interpolation — `logger.info('Created', { id })` not `` logger.info(`Created ${id}`) ``.
