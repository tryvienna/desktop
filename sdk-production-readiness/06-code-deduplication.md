# 06: Code Deduplication — PluginSystem and EntityRegistry

## Priority: MEDIUM

## Summary

`PluginSystem` and `EntityRegistry` contain significant duplicated code. Four methods are copy-pasted between the two classes: `getTypeSummaries()`, entity resolution by URI, search across types, and context resolution. This violates DRY and means bug fixes must be applied in two places.

## Duplicated Methods

### 1. getTypeSummaries() / getEntityTypeSummaries()

**EntityRegistry** (registry.ts:89-107):
```ts
getTypeSummaries(): EntityTypeSummary[] {
  return Array.from(this.definitions.values()).map((def) => {
    const exampleId: Record<string, string> = {};
    const uriPath = { segments: def.uriSegments as readonly string[] };
    for (const seg of def.uriSegments) {
      exampleId[seg] = `<${seg}>`;
    }
    const uriExample = buildEntityURI(def.type, exampleId, uriPath);
    return { type: def.type, displayName: def.name, icon: '...', source: def.source, uriExample, display: def.display };
  });
}
```

**PluginSystem** (plugin-system.ts:247-265) — identical logic.

### 2. Entity resolution by URI

**EntityRegistry.getByURI()** (registry.ts:110-126) and **PluginSystem.resolveEntity()** (plugin-system.ts:178-194) — same logic.

### 3. Search across entity types

**EntityRegistry.search()** (registry.ts:129-155) and **PluginSystem.searchEntities()** (plugin-system.ts:196-227) — same logic.

### 4. Context resolution

**EntityRegistry.resolveContext()** (registry.ts:158-172) and **PluginSystem.resolveEntityContext()** (plugin-system.ts:229-243) — same logic.

## Recommended Fix

**Option A: PluginSystem delegates to an internal EntityRegistry**

Make `PluginSystem` use an `EntityRegistry` internally for all entity operations:

```ts
export class PluginSystem {
  private plugins = new Map<string, PluginDefinition>();
  private entityRegistry = new EntityRegistry();  // delegate
  private integrations = new Map<string, IntegrationDefinition>();
  // ...

  registerPlugin(plugin: PluginDefinition): void {
    // ... conflict checks ...
    for (const entity of plugin.entities) {
      this.entityRegistry.register(entity);
    }
  }

  // Delegate entity operations
  resolveEntity(uri: string, ctx: EntityContext) {
    return this.entityRegistry.getByURI(uri, ctx);
  }

  searchEntities(query: string, ctx: EntityContext, types?: string[], limit?: number) {
    return this.entityRegistry.search(query, ctx, types, limit);
  }

  // etc.
}
```

**Option B: Extract shared functions**

Extract the duplicated logic into standalone functions that both classes call:

```ts
// internal/entity-operations.ts
export function buildTypeSummary(def: EntityDefinition): EntityTypeSummary { ... }
export async function resolveByURI(definitions: Map<string, EntityDefinition>, handlers: Map<string, EntityHandlers>, uri: string, ctx: EntityContext): Promise<BaseEntity | null> { ... }
// etc.
```

**Recommendation:** Option A is cleaner. `PluginSystem` is the higher-level abstraction that composes `EntityRegistry` + `IntegrationRegistry` + plugin management. It should delegate, not duplicate.

## Risks

- `PluginSystem` currently stores entities/handlers in its own Maps. Switching to delegation means the internal Maps move into the `EntityRegistry`. The `PluginSystem`'s `unregisterPlugin()` method needs access to unregister entities — make sure `EntityRegistry.unregister()` is used.
- Check that `PluginSystem`'s entity-to-plugin mapping still works after delegation.
- The `EntityRegistry` is also exported and used directly in some places (e.g., `apps/desktop/src/main.ts`). Make sure the refactor doesn't break those usages.

## Verification

1. `pnpm test` — all 210 tests must pass (especially plugin-system.unit.test.ts and registry.unit.test.ts)
2. `pnpm typecheck` — must pass
3. Verify that `PluginSystem` and `EntityRegistry` produce identical results for the same operations
