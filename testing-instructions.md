# Testing Instructions: Registry Plugin Support

## Prerequisites

1. You're on the `integrations-v2` branch
2. The `tryvienna/registry` repo has been updated with `plugins/` directory (already pushed)
3. Run `pnpm install` from the repo root
4. Build the graphql package: `cd packages/graphql && npx tsc --emitDeclarationOnly`

## 1. TypeScript Compilation (Smoke Test)

Verify zero new errors in the affected packages:

```bash
# GraphQL package
cd packages/graphql && npx tsc --noEmit

# App-db package
cd packages/app-db && npx tsc --noEmit

# Paths package
cd packages/paths && npx tsc --noEmit

# Desktop app
cd apps/desktop && npx tsc --noEmit
```

All should pass with zero errors from our changes. (Some pre-existing errors in unrelated files may appear in the desktop app.)

## 2. Database Migration

Start the app and verify the `installed_plugins` table was created:

```bash
pnpm dev
```

Then check SQLite directly (the DB path is shown in logs, or find it at `~/.vienna/profiles/default/vienna.db`):

```bash
sqlite3 ~/.vienna/profiles/default/vienna.db ".schema installed_plugins"
```

Expected: table with columns `id, name, description, version, registry_version, source, source_ref, registry, path, icon, category, tags_json, author, enabled, install_date, created_at, updated_at`.

## 3. Registry Sync Picks Up Plugins

After the app starts, trigger a registry sync. In the GraphQL playground (or DevTools console):

```graphql
mutation {
  syncRegistries {
    synced
  }
}
```

Then query registry plugins:

```graphql
query {
  registryPlugins {
    id
    name
    description
    version
    source
    icon
    category
    tags
    author { name }
    registry
  }
}
```

**Expected**: 5 plugins returned (weather, github, linear, quick-actions, verify), all with `source: "inline"`, `registry: "official"`.

## 4. Plugin Defaults

```graphql
query {
  registryPluginDefaults
}
```

**Expected**: `["weather", "quick-actions", "verify"]`

## 5. Install a Plugin from Registry

```graphql
mutation {
  installPlugin(pluginId: "weather") {
    plugin {
      id
      name
      description
      version
      source
      sourceRef
      registry
      path
      enabled
      installDate
    }
  }
}
```

**Expected**: Returns the installed plugin record. Check:
- `source` is `"inline"`
- `registry` is `"official"`
- `enabled` is `true`
- `path` points to `~/.vienna/profiles/default/plugins/weather/`

**Verify on disk**: The plugin source was copied to `~/.vienna/profiles/default/plugins/weather/` and `npm install` was run (node_modules exists).

## 6. List Installed Plugins

```graphql
query {
  installedPlugins {
    id
    name
    enabled
    hasUpdate
  }
}
```

**Expected**: weather plugin appears with `enabled: true`, `hasUpdate: false`.

## 7. Toggle Plugin Enabled/Disabled

```graphql
mutation {
  togglePluginEnabled(pluginId: "weather", enabled: false) {
    plugin {
      id
      enabled
    }
  }
}
```

**Expected**: Returns `enabled: false`. Run `installedPlugins` query again to confirm.

Toggle back on:

```graphql
mutation {
  togglePluginEnabled(pluginId: "weather", enabled: true) {
    plugin {
      id
      enabled
    }
  }
}
```

## 8. Uninstall a Plugin

```graphql
mutation {
  uninstallPlugin(pluginId: "weather") {
    success
  }
}
```

**Expected**: `success: true`. Verify:
- `installedPlugins` query no longer includes weather
- The `~/.vienna/profiles/default/plugins/weather/` directory was deleted

## 9. Check for Updates

Install a plugin, then manually edit its DB `registry_version` to an older value to simulate a stale install:

```bash
sqlite3 ~/.vienna/profiles/default/vienna.db \
  "UPDATE installed_plugins SET registry_version = '0.9.0' WHERE id = 'weather';"
```

Then query:

```graphql
query {
  pluginUpdates {
    pluginId
    currentVersion
    registryVersion
  }
}
```

**Expected**: weather appears in the update list.

## 10. Update a Plugin

```graphql
mutation {
  updatePlugin(pluginId: "weather") {
    plugin {
      id
      version
      registryVersion
    }
  }
}
```

**Expected**: Plugin re-installed with updated version. `registryVersion` matches registry's `1.0.0`.

## 11. Default Plugin Auto-Install

Delete all installed plugins from DB, restart the app, and verify that the three default plugins (weather, quick-actions, verify) are automatically installed on startup.

```bash
sqlite3 ~/.vienna/profiles/default/vienna.db "DELETE FROM installed_plugins;"
# Restart the app
pnpm dev
```

After startup, run `installedPlugins` query — defaults should appear.

## 12. Plugin Actually Loads at Runtime

After installing a plugin (e.g. weather), verify it's loaded in the plugin system:

```graphql
query {
  loadedPlugins {
    id
    name
  }
}
```

The installed plugin should appear in the loaded plugins list. If it has a menu-bar canvas (weather, verify, quick-actions), the icon should appear in the top-right menu bar.

## Edge Cases to Check

- **Install non-existent plugin**: `installPlugin(pluginId: "nonexistent")` should return an error
- **Double install**: Installing an already-installed plugin should error gracefully
- **Uninstall non-existent**: `uninstallPlugin(pluginId: "nonexistent")` should error gracefully
- **Malformed registry data**: Temporarily corrupt `plugins/_index.json` in the cache dir and verify the reader skips bad entries without crashing

## Files Changed (Reference)

**Modified (16):**
- `packages/paths/src/index.ts` + `main.ts` — plugins path
- `apps/desktop/src/main/registry/types.ts` — Zod schemas
- `apps/desktop/src/main/registry/RegistryReader.ts` — read methods
- `apps/desktop/src/main/registry/RegistryManager.ts` — cache + methods
- `packages/app-db/src/schemas.ts` — DB schemas
- `packages/app-db/src/database.ts` — migration v18
- `packages/app-db/src/index.ts` — AppDb wiring
- `packages/graphql/src/schema/builder.ts` — types + context
- `packages/graphql/src/index.ts` — exports
- `packages/graphql/src/schema/index.ts` — domain imports
- `packages/graphql/src/client/operations.ts` — client ops
- `apps/desktop/src/main/plugins/index.ts` — export
- `apps/desktop/src/ipc/graphql/handlers.ts` — pass-through
- `apps/desktop/src/ipc/register.ts` — options
- `apps/desktop/src/main.ts` — initialization

**Created (5):**
- `packages/app-db/src/installed-plugins.ts` — repository
- `packages/graphql/src/domains/plugins/types.ts` — GraphQL types
- `packages/graphql/src/domains/plugins/queries.ts` — queries
- `packages/graphql/src/domains/plugins/mutations.ts` — mutations
- `apps/desktop/src/main/plugins/PluginInstaller.ts` — core service
