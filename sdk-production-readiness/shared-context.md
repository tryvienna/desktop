# Shared Context: @tryvienna/sdk Production Readiness

## What Is This?

We are preparing `@vienna/entity-sdk` (located at `packages/entity-sdk/`) for publication as `@tryvienna/sdk` on npm. This is a public SDK for **external third-party plugin developers** who will primarily use **AI-driven development** (e.g., Claude Code, Cursor) to build plugins for the Vienna desktop app.

## Current State

- **Location:** `packages/entity-sdk/` in the Vienna monorepo
- **Version:** 0.0.1 (private)
- **Tests:** 210 passing (11 test files), 92% statement coverage
- **Typecheck:** Clean
- **Lint:** 3 errors, 7 warnings (needs fixing)

## What the Package Does

The SDK provides the foundation for Vienna's plugin system:

- **Definition factories:** `definePlugin()`, `defineIntegration()`, `defineEntity()` — create validated, immutable plugin/integration/entity definitions
- **URI system:** Build/parse `@vienna//<type>/<segments>` URIs for entity identification
- **Registries:** `EntityRegistry`, `IntegrationRegistry`, `PluginSystem` — runtime registration of plugins and their components
- **Schema builder:** Typed subset of Pothos API so plugins can extend the GraphQL schema without depending on Pothos directly
- **React hooks:** `useEntity()`, `useEntities()`, `usePluginQuery()`, `usePluginMutation()` — data fetching for plugin UI
- **Canvas types:** Type definitions for plugin UI surfaces (nav-sidebar, drawer, menu-bar)
- **Testing utilities:** Mock implementations of SecureStorage, PluginLogger, OAuthAccessor, etc.
- **Codegen config:** Factory for `@graphql-codegen/client-preset` configuration

## Architecture

```
Plugin Code (defineEntity, defineIntegration, definePlugin)
    |
    v
PluginSystem (unified registry)
    |
    v
GraphQL Entity Domain (@vienna/graphql)
    |
    v
IPC (type-safe channel)
    |
    v
Apollo Client (renderer) + React Hooks
    |
    v
Plugin UI Components (canvases)
```

## Key Design Decisions

1. **Zod-first:** All types derive from Zod schemas via `z.infer<>`
2. **Immutable definitions:** All factory outputs are `Object.freeze()`-d
3. **Branded types:** `__brand` fields prevent passing raw objects where definitions are expected
4. **React-optional:** React hooks in separate `./react` entry point; core is framework-agnostic
5. **Zero Vienna internal deps:** The SDK has no imports from `@vienna/ipc`, `@vienna/logger`, etc.

## Target Package Name

**`@tryvienna/sdk`** — published on npm under the `@tryvienna` scope.

## Target Audience

External third-party developers building plugins for Vienna, primarily using AI coding assistants. This means:
- API must be extremely clear and well-documented
- Error messages must be descriptive and actionable
- Examples must be copy-pasteable
- The README should serve as a comprehensive guide an AI can use to build plugins

## License

Apache 2.0. We should also note the need for a Plugin Developer Agreement (separate from this SDK work).

## Entry Points

The package has three entry points:
1. **`.`** (root) — All SDK functionality: types, schemas, registries, factories, testing utilities
2. **`./react`** — React hooks and provider (renderer-only)
3. **`./codegen`** — GraphQL codegen configuration factory

## File Structure

```
packages/entity-sdk/src/
  index.ts          — Main barrel export (186 lines)
  schemas.ts        — Zod schemas, source of truth (184 lines)
  types.ts          — Runtime interfaces (231 lines)
  uri.ts            — URI building/parsing (219 lines)
  errors.ts         — Error classes (48 lines)
  define-entity.ts  — Entity factory (181 lines)
  define-integration.ts — Integration factory (86 lines)
  define-plugin.ts  — Plugin factory (192 lines)
  registry.ts       — EntityRegistry, IntegrationRegistry (205 lines)
  plugin-system.ts  — Unified PluginSystem (326 lines)
  canvas.ts         — Canvas types & host API (169 lines)
  schema-builder.ts — Pothos schema builder interface (255 lines)
  cache.ts          — LRU entity cache (79 lines)
  testing.ts        — Mocks & test harness (213 lines)
  codegen.ts        — GraphQL codegen factory (54 lines)
  react/
    index.ts              — React entry point
    PluginDataProvider.ts — Context provider
    PluginDataContext.ts  — Context definition & hooks
    useEntity.ts          — Single entity hook
    useEntities.ts        — Entity list hook
    usePluginQuery.ts     — Custom query hook
    usePluginMutation.ts  — Custom mutation hook
    operations.ts         — GraphQL document nodes
    cache.ts              — Cache utilities
  __tests__/              — 11 test files, 210 tests
```

## Dependencies

**Production:**
- `@apollo/client` ^3.13.8
- `@graphql-typed-document-node/core` ^3.2.0
- `graphql-tag` ^2.12.6
- `zod` ^3.25.67

**Peer (optional):**
- `graphql` >=16.0.0
- `react` >=18.0.0

## How It's Used in the Monorepo

85+ files import from `@vienna/entity-sdk` across:
- `apps/desktop/src/main.ts` — Creates registries, loads plugins
- `apps/desktop/src/main/entities/` — Built-in entity registrations
- `apps/desktop/src/main/plugins/` — Plugin loading, bundling, evaluation
- `packages/graphql/` — GraphQL entity domain, schema builder wrapper
- `packages/plugin-github/` — Reference plugin (4 entities, 1 integration)
- `packages/plugin-weather/` — Simple reference plugin
- `packages/plugin-quick-actions/` — Another reference plugin
- `apps/desktop/src/renderer/` — React hooks, drawer rendering
- `packages/mcp-entities/` — MCP bridge

## Important Monorepo Conventions

- **No `.js` import extensions** — bundler module resolution
- **ESM only** — no CommonJS
- **Strict TypeScript** — `strict: true`, `noUncheckedIndexedAccess: true`
- **No `console.*`** — use `@vienna/logger`
- **No `process.env`** — use `@vienna/env`
- **No `window.*`** — use `@vienna/ipc`

## Critical Warning

When renaming the package, ALL 85+ import sites across the monorepo must be updated. Use find-and-replace but verify with `pnpm typecheck` from the monorepo root after changes.
