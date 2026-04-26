# 05: API Surface Cleanup

## Priority: HIGH

## Summary

Clean up the public API surface before locking it in for v1. Fix asymmetric exports, remove pre-release backwards compatibility aliases, add missing schema fields, and clean up type redundancies.

## Items

### 1. Missing `usePluginMutation` in root index.ts

The root `index.ts` re-exports most React hooks for convenience (useEntity, useEntities, usePluginQuery, usePluginClient), but `usePluginMutation` is missing. This is asymmetric.

**File:** `src/index.ts`

**Fix:** Add the missing re-export:
```ts
export { usePluginMutation } from './react/usePluginMutation';
```

Also add the `useHostApi` export if it's missing from root (check — it's exported from `./react` but may not be in root).

### 2. Remove backwards compatibility aliases

**File:** `src/testing.ts` (lines 211-212)

```ts
export { MockSecureStorage as MockEntityStorage };
export { MockPluginLogger as MockEntityLogger };
```

These are pre-v1 aliases from when the classes were named differently. They should NOT ship in the public API — they're confusing (two names for the same thing) and will be permanent debt once published.

**Fix:** Remove both lines. Then grep the monorepo for `MockEntityStorage` and `MockEntityLogger` and update any remaining usages to the canonical names (`MockSecureStorage`, `MockPluginLogger`).

Also remove the corresponding exports from `src/index.ts`:
```ts
MockEntityStorage,
MockEntityLogger,
```

### 3. Add `metadata` field to BaseEntity schema

The README (and the actual GraphQL schema in `@vienna/graphql`) includes a `metadata` field on entities, but the Zod schema in `schemas.ts` doesn't have it. This means the SDK's BaseEntity type is incomplete.

**File:** `src/schemas.ts`

**Fix:** Add the metadata field to `BaseEntitySchema`:
```ts
export const BaseEntitySchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  uri: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});
```

**Verify:** Check how `metadata` is used in:
- `packages/graphql/src/domains/entities/` — the GraphQL entity type
- `apps/desktop/src/main/entities/` — built-in entity registrations
- `packages/plugin-github/` — GitHub plugin entities

Ensure the schema matches the runtime shape. The metadata field is serialized as JSON in GraphQL, so `z.record(z.unknown())` is correct.

### 4. Clean up CanvasLogger / PluginLogger redundancy

**Files:** `src/canvas.ts`, `src/types.ts`

`CanvasLogger` in canvas.ts:
```ts
export interface CanvasLogger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
}
```

This is identical to `PluginLogger` in types.ts minus the `child()` method. Having two nearly-identical interfaces is confusing for plugin developers.

**Fix:** Replace `CanvasLogger` with `Omit<PluginLogger, 'child'>`:
```ts
import type { PluginLogger } from './types';

export type CanvasLogger = Omit<PluginLogger, 'child'>;
```

Or, even simpler: just use `PluginLogger` directly in canvas props and document that `child()` is available but optional to use. This reduces API surface.

**Decision needed:** Which approach is cleaner? Using `PluginLogger` everywhere is simpler but exposes `child()` in a context where it's not needed. Using `Omit` keeps the distinction but adds complexity. Lean toward using `PluginLogger` directly — it's one fewer type to learn.

### 5. Tighten SearchQuery type

**File:** `src/types.ts`

```ts
export interface SearchQuery {
  query?: string;
  limit?: number;
  offset?: number;
  [key: string]: unknown;  // This makes the type essentially Record<string, unknown>
}
```

The index signature means plugin developers get zero type safety on their filter keys.

**Fix:** Remove the index signature and use a separate `filters` field:
```ts
export interface SearchQuery {
  query?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}
```

**Important:** This is a breaking change for any handlers that use custom keys directly on SearchQuery. Check all usages in the monorepo:
- `packages/plugin-github/` handlers
- `packages/graphql/` entity domain resolvers
- `apps/desktop/src/main/entities/` built-in handlers

If existing code relies on the index signature, this change needs to be coordinated. If nobody uses it, just remove it.

## Verification

1. `pnpm typecheck` from monorepo root — must pass
2. `pnpm test` in the SDK package — all tests must pass
3. `grep -r "MockEntityStorage\|MockEntityLogger" packages/ apps/` — must return zero results
4. `pnpm lint` — must pass
