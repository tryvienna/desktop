---
name: plugin-dev
description: Build Vienna plugins — scaffold with vcli, then implement integrations, entities, sidebar/drawer/menu-bar canvases, and GraphQL schemas. Use when the user wants to create, build, or modify a Vienna plugin.
version: "3.0"
author: Vienna
icon: puzzle-piece
category: Development
tags: [plugins, development, vienna, drawer, sidebar, entity, integration, scaffold]
allowed-tools: WebFetch Read Glob Grep Bash Write Edit
user-invocable: true
argument-hint: Describe the plugin you want to build
---

# Vienna Plugin Development

You are building a plugin for Vienna, a programmable desktop IDE. Plugins extend Vienna via three primitives: **integrations** (API connections), **entities** (typed data), and **canvases** (UI slots).

## Step 1: Scaffold with vcli

**Always start by scaffolding.** The `vcli` CLI generates a complete, working plugin skeleton. It's bundled with the Vienna desktop app — install it to your PATH via **Vienna → Install 'vcli' Command**.

```bash
# Scaffold a plugin (vcli is bundled with Vienna)
vcli plugin scaffold \
  --name=my-plugin \
  --canvas=sidebar,drawer,menu-bar \
  --entity=task,comment \
  --auth=oauth \
  --description="My plugin description"
```

If vcli is not on your PATH, you can also use npx:

```bash
npx @tryvienna/cli plugin scaffold \
  --name=my-plugin \
  --auth=oauth \
  --entity=task
```

The scaffold auto-detects the registry (via `registry.json`) and outputs to `plugins/<name>/`. If not in a registry, it creates the plugin in the current directory.

### Flags

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--name` | kebab-case | **required** | Plugin name (e.g. `github-issues`) |
| `--canvas` | `sidebar`, `drawer`, `menu-bar` | `sidebar,drawer` | UI canvases (comma-separated) |
| `--entity` | kebab-case names | none | Entity types (comma-separated) |
| `--auth` | `oauth`, `pat`, `api-key`, `none` | `none` | Authentication pattern |
| `--description` | string | `"A Vienna plugin"` | Plugin description |
| `--dry-run` | flag | false | Preview without writing |
| `--output` | path | auto-detect | Override output directory |

### Auth patterns

| Pattern | When to use | Real examples |
|---------|-------------|---------------|
| `oauth` | Third-party services with OAuth support | `github` (PKCE + PAT fallback), `linear` (PKCE + API key fallback) |
| `pat` | Services that issue personal access tokens | — |
| `api-key` | Simple key-based auth or internal APIs | `feedback` (API key + base URL) |
| `none` | Public APIs or no external service | `weather`, `profile_badge`, `quick_actions` |

**Note:** Real plugins often combine patterns. The `github` plugin uses OAuth PKCE with PAT fallback — the scaffold generates this structure when you choose `oauth`. For custom credential patterns (session cookies, service accounts, CLI-delegated auth), start with `api-key` or `none` and modify `integration.ts` manually.

### Canvas auto-expansion

`drawer` is automatically included when `sidebar` or `menu-bar` is selected — the drawer provides settings, entity detail views, and routing.

### What gets generated

A full plugin with 11–21 files depending on options:
- `package.json`, `tsconfig.json`, `codegen.ts`
- `src/index.ts` — `definePlugin()` bundling everything
- `src/integration.ts` — `defineIntegration()` with auth pattern
- `src/schema.ts` — GraphQL types/queries via Pothos SchemaBuilder
- `src/api.ts` — API client method stubs
- `src/entities/` — `defineEntity()` per entity type, plus URI resolver
- `src/client/operations.ts` — GraphQL query documents (TypedDocumentNode)
- `src/ui/` — Canvas components (NavSection, PluginDrawer, SettingsDrawer, MenuBarIcon, MenuBarContent, EntityDrawer, useSettings hook)

## Step 2: Implement the plugin

After scaffolding, work through the `TODO` comments in the generated code:

1. **`src/integration.ts`** — Set OAuth URLs, import your API client library, implement `createClient`
2. **`src/schema.ts`** — Define GraphQL types matching your API response shapes, implement `resolve` and `search` handlers
3. **`src/api.ts`** — Implement API wrapper methods
4. **`src/entities/*.ts`** — Adjust URI segments, display metadata (emoji, colors), output fields
5. **`src/ui/*.tsx`** — Customize UI components with real data queries
6. **`src/client/operations.ts`** — Write GraphQL operations matching your schema, then run `pnpm codegen`

### Drawer routing

The plugin drawer uses a `payload.view` routing pattern. The generated `PluginDrawer` component routes between views:

```typescript
export function MyPluginPluginDrawer({ payload, drawer, ... }: PluginDrawerCanvasProps) {
  const view = payload?.view ?? 'main';

  switch (view) {
    case 'settings':
      return <MyPluginSettingsDrawer hostApi={hostApi} logger={logger} />;
    case 'entity':
      return <MyPluginEntityDrawer entity={payload.entity} ... />;
    default:
      return <div>Plugin home</div>;
  }
}
```

Open drawers programmatically: `openPluginDrawer({ view: 'settings' })` or `openEntityDrawer('@drift//<entity_type>/<id>')`.

### Schema resolvers

Schema resolve/search handlers receive a context object with access to the integration client:

```typescript
resolve: async (entityId, ctx) => {
  const client = await ctx.integrations.my_plugin.client;
  return api.getEntity(client, entityId);
},
search: async (query, ctx) => {
  const client = await ctx.integrations.my_plugin.client;
  return api.searchEntities(client, query);
}
```

## Plugin Architecture Reference

### Three primitives

| Primitive | Factory | Purpose |
|-----------|---------|---------|
| **Entity** | `defineEntity()` | Typed data with URI pattern, display metadata, cache config |
| **Integration** | `defineIntegration<TClient>()` | API connection with auth, client factory, GraphQL schema |
| **Canvas** | Part of `definePlugin()` | UI slots: `nav-sidebar`, `drawer`, `menu-bar` |

### Canvas types and props

| Canvas | Config | Props |
|--------|--------|-------|
| `nav-sidebar` | `{ component, label, priority? }` | `{ pluginId, openPluginDrawer, openEntityDrawer, hostApi, logger }` |
| `drawer` | `{ component, label, footer? }` | `{ pluginId, payload, drawer, openEntityDrawer, hostApi, logger }` |
| `menu-bar` | `{ icon, component, label, priority? }` | Icon: `{ pluginId, hostApi, logger }`, Content: `{ pluginId, onClose, openPluginDrawer, hostApi, logger }` |

Entity drawers are defined in `defineEntity()` via the `ui.drawer` field, not as a separate canvas.

### Entity definition

```typescript
export const myEntity = defineEntity({
  type: 'my_entity',
  integration: 'my_plugin',
  uriSegments: [{ name: 'id', source: 'id' }],
  display: { emoji: '📋', colorHue: 210 },
  output: { titleField: 'title', bodyField: 'description' },
  cache: { ttl: 30_000, maxSize: 100 },
  ui: {
    drawer: MyEntityDrawer,  // React component for entity detail view
  },
});
```

### All plugins in `registry/plugins/`

| Plugin | Auth | Canvases | Entities | Key pattern |
|--------|------|----------|----------|-------------|
| **github** | OAuth PKCE + PAT | sidebar, drawer | PR, Issue, WorkflowRun, Repo | Full OAuth integration, ~24 API methods |
| **linear** | OAuth PKCE + API key | sidebar, drawer | Issue | Project management, similar to GitHub |
| **feedback** | API key + base URL | sidebar, drawer | FeedbackItem | Simple credential pair |
| **google_workspace** | CLI delegation (gws) | sidebar, drawer | Gmail, Calendar, Drive, Docs | External CLI auth, no credentials array |
| **reddit** | Session cookie | sidebar, drawer | Post | Custom credential extraction |
| **weather** | none | menu-bar, drawer | none | Public API, pollInterval for live updates |
| **profile_badge** | none | menu-bar | none | Display-only, no integration |
| **quick_actions** | none (schema-only) | menu-bar, drawer | none | Main-process resolvers, separate `renderer.ts` |

When implementing a plugin, **read the closest real plugin** for patterns:
- OAuth sidebar plugin → read `plugins/github/src/`
- Menu-bar widget → read `plugins/weather/src/`
- Simple API key plugin → read `plugins/feedback/src/`

### Advanced patterns (from real plugins)

**Separate renderer entry point** — If your schema resolvers use Node built-ins (`node:fs`, `node:child_process`), create `src/renderer.ts` exporting only canvas components. The `quick_actions` plugin uses this pattern.

**Menu-bar polling** — Use `pollInterval` in `usePluginQuery()` for live-updating menu-bar icons:
```typescript
const { data } = usePluginQuery(MY_QUERY, { pollInterval: 30_000 });
```

**Drawer footer** — Pass a `footer` component in the drawer canvas config for persistent actions.

**localStorage settings** — Use a custom `useSettings()` hook with `localStorage` for plugin-local preferences (region, display options):
```typescript
const [settings, setSettings] = useState(() => {
  const saved = localStorage.getItem('my-plugin-settings');
  return saved ? JSON.parse(saved) : defaults;
});
```

## Plugin Imports

Plugins may ONLY import from these packages:

- **`@tryvienna/sdk`** — `defineEntity`, `defineIntegration`, `definePlugin`, `PluginLogger`, `SecureStorage`, URI utilities, types
- **`@tryvienna/sdk/react`** — `usePluginQuery`, `usePluginMutation`, `useEntity`, `useHostApi`, `useActiveWorkstreamId`
- **`@tryvienna/sdk/graphql`** — Pre-defined GraphQL operations
- **`@tryvienna/ui`** — Radix-based component library (80+ components)

**Do NOT import** `@vienna/ipc`, `@vienna/logger`, `@vienna/env`, or any host-internal packages.

For logging, use `PluginLogger` injected via context — never `console.*`:

```typescript
// In createClient:
createClient: async (ctx) => {
  ctx.logger.info('Creating client');
}

// In entity handlers (via schema builder):
resolve: async (entityId, ctx) => {
  ctx.logger.debug('Resolving entity', { entityId });
}
```

## Conventions (Enforced by ESLint)

- **8pt grid spacing** — Tailwind classes: `p-2`, `gap-4`, `m-3` (base unit 4px)
- **ESM only** — no `require()`, no CommonJS
- **No `.js` import extensions** — bundler module resolution
- **Strict TypeScript** — `strict: true`, `noUncheckedIndexedAccess: true`
- **No `process.env`** — use `@vienna/env` (host only) or secure storage (plugins)
- **No `console.*`** — use `PluginLogger` from context

## Documentation

Fetch additional documentation pages as needed:

| Page | URL | When to fetch |
|------|-----|---------------|
| Plugin Development | {{DOCS_BASE_URL}}/guide/plugin-development | Detailed architecture and concepts |
| Weather Plugin Tutorial | {{DOCS_BASE_URL}}/guide/weather-plugin-tutorial | Menu-bar plugin example |
| CLI Reference | {{DOCS_BASE_URL}}/reference/cli | Full CLI documentation |
| SDK Reference | {{DOCS_BASE_URL}}/reference/sdk | Full API reference |
| Logging | {{DOCS_BASE_URL}}/guide/logging | Structured logging details |

For the UI component catalog, read: `packages/ui/src/COMPONENTS.md`

## Workflow

1. **Understand** what the user wants the plugin to do — which external service, what data, what UI
2. **Scaffold** with `vcli plugin scaffold` using the right flags for auth, canvases, and entities
3. **Install dependencies** — `cd plugins/<name> && pnpm install`
4. **Read real plugin examples** in `registry/plugins/` for the closest pattern
5. **Implement** by filling in TODOs: integration auth, API methods, schema types, UI components
6. **Read `packages/ui/src/COMPONENTS.md`** for available UI components
7. **Run `pnpm codegen`** after schema changes to regenerate GraphQL types
8. **Run `pnpm typecheck`** to verify TypeScript correctness

## Key Files Reference

| File | Purpose |
|------|---------|
| `plugins/github/src/index.ts` | Canonical plugin definition (OAuth + sidebar + 4 entities) |
| `plugins/github/src/integration.ts` | OAuth PKCE + PAT fallback pattern |
| `plugins/github/src/schema.ts` | GraphQL schema with entityObjectType |
| `plugins/github/src/ui/GitHubNavSection.tsx` | Sidebar canvas with credential checking |
| `plugins/github/src/ui/GitHubPluginDrawer.tsx` | Drawer routing (view switching) |
| `plugins/weather/src/ui/WeatherMenuBarIcon.tsx` | Menu-bar icon with live polling |
| `plugins/weather/src/ui/WeatherMenuBarContent.tsx` | Menu-bar popover content |
| `plugins/quick_actions/src/renderer.ts` | Separate renderer entry point pattern |
| `packages/ui/src/COMPONENTS.md` | Full UI component catalog |
