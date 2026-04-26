# Plugin Development Guide

This guide walks you through building a complete Vienna plugin from scratch. By the end, you'll have created a custom entity type, an integration with a GraphQL schema, UI canvases, and custom entity rendering — all wired into Vienna's type-safe architecture.

**Audience:** AI agents and developers building plugins for the Vienna desktop app.

[[toc]]

---

## 1. Architecture Overview

Vienna plugins extend the app through three core primitives:

| Primitive | What it does | Factory function |
|-----------|-------------|-----------------|
| **Entity** | Metadata-only type definition: URI structure, display config, cache, optional UI components | `defineEntity()` |
| **Integration** | Connects to an external API: client factory, OAuth, credentials, GraphQL schema extensions | `defineIntegration()` |
| **Plugin** | Bundles entities + integrations + UI canvases into a deployable unit | `definePlugin()` |

Entities are **data descriptors** — they define what an entity type looks like, not how to fetch or mutate it. All data operations (queries, mutations, resolve, search) are defined in the integration's `schema` callback via a Pothos-based `SchemaBuilder`.

### Data flow

```
defineEntity() / defineIntegration() / definePlugin()
    |
    v
PluginSystem  (unified registry — main process)
    |
    v
GraphQL schema (generic queries + plugin-defined types/mutations)
    |
    v
IPC transport
    |
    v
Apollo Client (renderer process)
    |
    v
React components / Plugin canvases
```

### Key packages

| Package | Import | Purpose |
|---------|--------|---------|
| `@tryvienna/sdk` | `defineEntity`, `defineIntegration`, `definePlugin`, `PluginLogger`, `SecureStorage` | Plugin definition factories, runtime registry, logging, storage |
| `@tryvienna/sdk/react` | `usePluginQuery`, `usePluginMutation`, `useEntity`, `useHostApi`, `useActiveWorkstreamId`, `useWorkstream` | React hooks for plugin UI |
| `@tryvienna/sdk/graphql` | `SEND_WORKSTREAM_MESSAGE` | Pre-defined GraphQL operations for platform features |
| `@tryvienna/ui` | UI components | Radix-based component library (80+ components) |

::: danger PLUGIN IMPORT BOUNDARY
Plugins must **only** import from `@tryvienna/sdk`, `@tryvienna/sdk/react`, and `@tryvienna/ui`. Do **not** import `@vienna/ipc`, `@vienna/logger`, `@vienna/env`, or any other internal packages — those are host-only.

For logging, use the [`PluginLogger`](/guide/logging) interface injected via `EntityContext` and `AuthContext`. For secure storage, use the `SecureStorage` interface. Both are provided automatically at runtime.
:::

### Enforced conventions

These rules are enforced by ESLint — the build will fail on violations:

- **No `process.env`** — environment config goes through `EntityContext` or `SecureStorage`
- **No `window.*`** — except in plugin UI code with `// eslint-disable-next-line no-restricted-properties`
- **No `console.*`** — use `PluginLogger` from `EntityContext` or `AuthContext`
- **8pt grid spacing** — use Tailwind classes (`p-2`, `gap-4`, `m-3`). Base unit = 4px
- **ESM only** — no `require()`, no CommonJS
- **No `.js` import extensions** — bundler module resolution
- **Strict TypeScript** — `strict: true`, `noUncheckedIndexedAccess: true`

---

## 2. Concepts

Before writing code, understand these core concepts.

### BaseEntity

Every entity in Vienna conforms to the `BaseEntity` schema — a Zod-validated shape that all entities share:

```typescript
// From @tryvienna/sdk — BaseEntitySchema
{
  id: string;          // Unique identifier
  type: string;        // Entity type (e.g., 'github_issue', 'bookmark')
  uri: string;         // Full URI: @vienna//type/segment1/segment2
  title: string;       // Display title
  description?: string;      // Optional preview text
  createdAt?: number;        // Unix ms timestamp
  updatedAt?: number;        // Unix ms timestamp
}
```

Plugin-specific fields (like `state`, `url`, `labels`) are added by extending `BaseEntity` in your GraphQL object type — they are **not** stored in a generic `metadata` bag.

### Entity URIs

Every entity has a globally unique URI:

```
@vienna//type/segment1/segment2?label=Base64EncodedTitle
```

Examples:
- `@vienna//project/abc123` — a project with ID `abc123`
- `@vienna//github_issue/owner/repo/42` — GitHub issue #42 in owner/repo
- `@vienna//bookmark/my-bookmark-id` — a bookmark entity

The URI path structure is defined by `uri: ['id']` in the entity definition. Multi-segment URIs use multiple named segments like `uri: ['owner', 'repo', 'number']`.

### PluginIcon

All `icon` fields in `defineEntity`, `defineIntegration`, and `definePlugin` require a `PluginIcon` object — not a string:

```typescript
{ svg: '<svg>...</svg>' }   // Inline SVG markup
{ png: 'base64...' }        // Base64-encoded PNG
{ path: './icon.svg' }      // Relative path to icon file
```

### SchemaBuilder

The `SchemaBuilder` is a typed subset of the Pothos GraphQL builder API. It's passed to your integration's `schema` callback and lets you:

- Define GraphQL object types, input types, and enums
- Add queries and mutations
- Register entity handlers (resolve, search, context generation)
- Use high-level helpers like `entityObjectType()` and `entityPayload()`

### Canvas types

Plugins contribute UI through **canvases** — named slots where plugin components render:

| Canvas | Where it renders | Props |
|--------|-----------------|-------|
| `nav-sidebar` | Left navigation panel | `NavSidebarCanvasProps` |
| `drawer` | Right-side tabbed drawer | `PluginDrawerCanvasProps` |
| `menu-bar` | TopBar trailing slot (top-right) | Icon: `MenuBarIconProps`, Content: `MenuBarCanvasProps` |
| `feed` | Home feed card grid | `FeedCanvasProps` |

### Entity sources

| Source | Meaning |
|--------|---------|
| `'builtin'` | Ships with Vienna (project, workstream, routine, tag) |
| `'integration'` | Provided by a plugin |

---

## 3. Tutorial: Build a Bookmark Plugin

In this tutorial, you'll build a **Bookmark** plugin that:

1. Defines a `bookmark` entity type with display metadata
2. Defines a `bookmarks` integration with a GraphQL schema for CRUD operations
3. Bundles everything with `definePlugin()`
4. Adds nav-sidebar and drawer canvases

### 3.1 Create the package

Plugins can live in one of two places:

1. **Inline** — as a directory under `plugins/` in the Vienna registry monorepo
2. **External** — in their own GitHub repository, referenced by the registry's `_index.json` with `"source": "github"` and a `"repo"` URL

Both approaches use the same package structure. For inline plugins:

```json
// plugins/bookmarks/package.json
{
  "name": "@vienna/plugin-bookmarks",
  "version": "0.0.1",
  "private": true,
  "description": "Bookmark manager plugin",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "dependencies": {
    "@tryvienna/sdk": "workspace:*",
    "zod": "^3.25.67"
  },
  "peerDependencies": {
    "@tryvienna/ui": "workspace:*",
    "react": ">=18.0.0"
  },
  "peerDependenciesMeta": {
    "@tryvienna/ui": { "optional": true },
    "react": { "optional": true }
  },
  "devDependencies": {
    "@types/node": "^25.3.2",
    "@types/react": "^19.0.0",
    "typescript": "^5.9.3"
  }
}
```

::: tip AUTO-DISCOVERY
Plugins in `packages/plugin-*` are auto-discovered by the main process. The `exports` field pointing to `./src/index.ts` is all you need — no manual registration in `main.ts`.
:::

### 3.2 Define the entity

Entity definitions are **metadata-only** — they describe what a bookmark looks like, not how to fetch or create one. They also optionally provide custom UI components for rendering.

```typescript
// src/entities/bookmark.ts

import { defineEntity } from '@tryvienna/sdk';
import { BookmarkEntityDrawer } from '../ui/BookmarkEntityDrawer';

const BOOKMARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>';

export const bookmarkEntity = defineEntity({
  type: 'bookmark',
  name: 'Bookmark',
  icon: { svg: BOOKMARK_SVG },
  uri: ['id'],  // URI structure: @vienna//bookmark/<id>

  display: {
    emoji: '🔖',
    colors: {
      bg: '#FFF3E0',
      text: '#E65100',
      border: '#FFB74D',
    },
    description: 'A saved link with tags',
  },

  cache: {
    ttl: 30_000,    // 30 seconds
    maxSize: 200,
  },

  // Custom UI components (optional)
  ui: {
    drawer: BookmarkEntityDrawer,  // Opens when user clicks entity chip/card
    // card: BookmarkEntityCard,   // Custom inline card rendering (optional)
  },
});
```

Notice: no `resolve`, no `search`, no `actions`, no `schema`. The entity is pure metadata — it defines the type identity, URI format, display styling, cache policy, and optional UI components.

#### The `ui` field

The `ui` field lets you register custom React components for entity rendering:

| Component | Props | When it renders |
|-----------|-------|-----------------|
| `drawer` | `EntityDrawerProps` | When a user clicks an entity chip or card in chat, or opens an entity from the nav |
| `card` | `EntityCardProps` | When an entity is rendered as a block card (`[[@vienna//bookmark/abc]]`) in chat |

Entity types **without** a custom `ui.drawer` get the `GenericEntityDrawer` (shows title + type badge + description). Types without a custom `ui.card` get the default card renderer.

**EntityDrawerProps:**

```typescript
interface EntityDrawerProps {
  uri: string;
  DrawerContainer: ComponentType<DrawerContainerProps>;  // Host-provided layout wrapper
  headerActions?: ReactNode;                              // Injected header actions
  onNavigate?: (entityUri: string, entityType: string, label?: string) => void;
  onClose?: () => void;
  projectId?: string;
}
```

**EntityCardProps:**

```typescript
interface EntityCardProps {
  uri: string;
  label?: string;  // Pre-resolved label from the URI
}
```

See [section 3.5](#_3-5-build-ui-canvases) for a full drawer implementation example.

### 3.3 Define the integration

The integration connects to your data source and defines the GraphQL schema for operating on bookmarks.

```typescript
// src/integration.ts

import { defineIntegration, buildEntityURI } from '@tryvienna/sdk';
import type { BaseEntity, SchemaBuilder } from '@tryvienna/sdk';
import { bookmarkEntity } from './entities/bookmark';

// The client type — in production, this might be a database connection or API client
interface BookmarkStore {
  bookmarks: Map<string, BookmarkData>;
}

interface BookmarkData extends BaseEntity {
  url: string;
  tags: string[];
}

function registerBookmarkSchema(builder: SchemaBuilder) {
  // 1. Create the GraphQL type + register entity handlers
  const BookmarkRef = builder.entityObjectType<BookmarkData>(bookmarkEntity, {
    description: 'A saved bookmark',
    fields: (t) => ({
      id: t.exposeID('id'),
      title: t.exposeString('title'),
      url: t.exposeString('url'),
      tags: t.exposeStringList('tags'),
    }),

    // Entity handlers — called by generic entity queries and MCP tools
    resolve: async (id, ctx) => {
      const store = ctx.integrations.bookmarks.client as BookmarkStore | null;
      if (!store) return null;
      return store.bookmarks.get(id['id']!) ?? null;
    },

    search: async (query, ctx) => {
      const store = ctx.integrations.bookmarks.client as BookmarkStore | null;
      if (!store) return [];
      let results = Array.from(store.bookmarks.values());

      if (query.query) {
        const q = query.query.toLowerCase();
        results = results.filter(
          (b) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q),
        );
      }

      return results.slice(0, query.limit ?? 20);
    },

    resolveContext: async (entity) => {
      return `### Bookmark: ${entity.title}\n- **URL:** ${entity.url}\n- **Tags:** ${entity.tags.join(', ') || 'none'}`;
    },
  });

  // 2. Create a mutation payload type
  const BookmarkPayload = builder.entityPayload('BookmarkPayload', BookmarkRef, 'bookmark');

  // 3. Define input types
  const CreateBookmarkInput = builder.inputType('CreateBookmarkInput', {
    fields: (t) => ({
      title: t.string({ required: true, description: 'Bookmark title' }),
      url: t.string({ required: true, description: 'The URL to bookmark' }),
      tags: t.field({ type: '[String!]', description: 'Tags for categorization' }),
    }),
  });

  // 4. Define mutations
  builder.mutationFields((t) => ({
    createBookmark: t.field({
      type: BookmarkPayload,
      description: 'Save a new bookmark',
      args: {
        input: t.arg({ type: CreateBookmarkInput, required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const store = ctx.integrations?.bookmarks?.client as BookmarkStore | null;
        if (!store) return { success: false, message: 'Bookmark store not available' };

        const input = args.input as { title: string; url: string; tags?: string[] };
        const id = crypto.randomUUID();
        const bookmark: BookmarkData = {
          id,
          type: 'bookmark',
          uri: buildEntityURI('bookmark', { id }, { segments: ['id'] }),
          title: input.title,
          url: input.url,
          tags: input.tags ?? [],
          createdAt: Date.now(),
        };

        store.bookmarks.set(id, bookmark);
        return { success: true, entity: bookmark, message: `Bookmark "${input.title}" created` };
      },
    }),

    deleteBookmark: t.field({
      type: BookmarkPayload,
      description: 'Remove a bookmark',
      args: {
        id: t.arg.string({ required: true, description: 'Bookmark ID to delete' }),
      },
      resolve: async (_root, args, ctx) => {
        const store = ctx.integrations?.bookmarks?.client as BookmarkStore | null;
        if (!store) return { success: false, message: 'Bookmark store not available' };

        const deleted = store.bookmarks.delete(args.id as string);
        return {
          success: deleted,
          message: deleted ? 'Bookmark deleted' : 'Bookmark not found',
        };
      },
    }),
  }));
}

export const bookmarksIntegration = defineIntegration<BookmarkStore>({
  id: 'bookmarks',
  name: 'Bookmarks',
  icon: { svg: '<svg>...</svg>' },
  description: 'Bookmark management integration',

  // Client factory — creates the data store
  createClient: async () => ({
    bookmarks: new Map<string, BookmarkData>(),
  }),

  // Schema callback — registers GraphQL types and mutations
  schema: registerBookmarkSchema,
});
```

#### What this gives you automatically

Once loaded by the plugin system, this integration provides:

| Capability | How | Example |
|-----------|-----|---------|
| GraphQL query | `entity(uri: "@vienna//bookmark/abc")` | Fetch a single bookmark |
| GraphQL search | `entities(type: "bookmark", query: "react")` | Search bookmarks |
| GraphQL mutation | `createBookmark(input: {...})` | Create a bookmark |
| GraphQL mutation | `deleteBookmark(id: "abc")` | Delete a bookmark |
| MCP tool | `graphql_execute` with the above queries | Claude can query bookmarks |
| MCP tool | `entity_get` with URI | Claude can fetch bookmark details |
| URI resolution | `@vienna//bookmark/abc123` | Clickable links in chat |
| Type discovery | `entityTypes()` query | Shows up in entity type listings |
| Context generation | `resolveContext()` | AI gets markdown context about the entity |

#### Key architectural pattern

All entity operations go through GraphQL:

- **Generic queries** (`entity`, `entities`, `entitySearch`) — automatically available for all entity types via the entity handler registration
- **Custom mutations** — defined per-integration in the `schema` callback, giving you full control over types, validation, and behavior
- **MCP access** — Claude discovers operations via `graphql_operations` and executes them via `graphql_execute`

### 3.4 Bundle as a plugin

The `definePlugin()` call ties everything together:

```typescript
// src/index.ts

import { definePlugin } from '@tryvienna/sdk';
import { bookmarkEntity } from './entities/bookmark';
import { bookmarksIntegration } from './integration';
import { BookmarkNavSection } from './ui/BookmarkNavSection';
import { BookmarkPluginDrawer } from './ui/BookmarkPluginDrawer';

const BOOKMARK_SVG = '<svg>...</svg>';

export const bookmarkPlugin = definePlugin({
  id: 'bookmarks',
  name: 'Bookmarks',
  description: 'Save and organize bookmarks',
  icon: { svg: BOOKMARK_SVG },

  integrations: [bookmarksIntegration],
  entities: [bookmarkEntity],

  canvases: {
    'nav-sidebar': {
      component: BookmarkNavSection,
      label: 'Bookmarks',
      priority: 60,
    },
    drawer: {
      component: BookmarkPluginDrawer,
      label: 'Bookmarks',
    },
  },
});
```

::: tip VALIDATION
`definePlugin()` validates that:
- All items are created via their respective `define*` factories (branded types)
- No duplicate integration IDs or entity types within the plugin
- Canvas components are valid React components
- A drawer canvas requires a nav-sidebar or menu-bar entry point
:::

### 3.4b Main vs Renderer: Separate Entry Points

Vienna bundles each plugin **twice** — once for the main process (Node.js) and once for the renderer (browser). This mirrors Electron's own process separation.

**When you need this:** If your plugin's integration or schema imports Node built-ins (`node:fs`, `node:child_process`, `node:path`, etc.), the renderer bundle will fail because those modules don't exist in the browser.

**Solution:** Provide a separate `src/renderer.ts` entry point that contains only browser-safe code (canvases + plugin identity):

```
packages/plugin-bookmarks/
└── src/
    ├── index.ts        ← Main entry: full plugin (integrations + schema + canvases)
    ├── renderer.ts     ← Renderer entry: canvases only (React components)
    ├── integration.ts  ← Integration (may import Node-only schema code)
    ├── schema.ts       ← GraphQL resolvers (may use node:fs, node:child_process)
    └── ui/             ← Browser-safe React components
```

The renderer entry re-declares the plugin with the same `id`, `name`, and `icon`, but only includes canvases:

```typescript
// src/renderer.ts — Renderer entry point (browser-safe)

import { definePlugin } from '@tryvienna/sdk';
import { BookmarkNavSection } from './ui/BookmarkNavSection';
import { BookmarkPluginDrawer } from './ui/BookmarkPluginDrawer';

const BOOKMARK_SVG = '<svg>...</svg>';

export default definePlugin({
  id: 'bookmarks',        // Must match index.ts
  name: 'Bookmarks',
  icon: { svg: BOOKMARK_SVG },

  // Canvases only — no integrations, no entities, no schema
  canvases: {
    'nav-sidebar': {
      component: BookmarkNavSection,
      label: 'Bookmarks',
      priority: 60,
    },
    drawer: {
      component: BookmarkPluginDrawer,
      label: 'Bookmarks',
    },
  },
});
```

::: tip WHEN DO YOU NEED `renderer.ts`?
- **Yes** — if your `schema.ts` or `integration.ts` imports `node:*` modules (file system, child processes, etc.)
- **No** — if your schema only uses `fetch()`, `graphql`, or `@tryvienna/sdk` (all browser-safe)

The weather plugin doesn't need one (uses `fetch()` only). The quick-actions plugin does (uses `node:child_process` to launch terminals).
:::

::: warning ID MUST MATCH
The `id` field in `renderer.ts` **must exactly match** the `id` in `index.ts`. The renderer looks up the bundle by plugin ID — a mismatch means the plugin silently fails to load in the UI.
:::

**How it works under the hood:**

The `PluginBundler` resolves entry points per target:
1. **Main target** → always uses `src/index.ts`
2. **Renderer target** → prefers `src/renderer.ts` if it exists, falls back to `src/index.ts`

This means plugins without `renderer.ts` continue to work exactly as before — no migration needed unless you're using Node built-ins.

### 3.5 Build UI canvases

#### Nav-sidebar canvas

The nav-sidebar renders in the left navigation panel. It receives `NavSidebarCanvasProps`:

```tsx
// src/ui/BookmarkNavSection.tsx

import type { NavSidebarCanvasProps } from '@tryvienna/sdk';
import { usePluginQuery } from '@tryvienna/sdk/react';
import { gql } from '@apollo/client';

const GET_BOOKMARKS = gql`
  query GetBookmarks($type: String!, $query: String, $limit: Int) {
    entities(type: $type, query: $query, limit: $limit) {
      id
      uri
      title
    }
  }
`;

export function BookmarkNavSection({ openEntityDrawer }: NavSidebarCanvasProps) {
  const { data, loading } = usePluginQuery(GET_BOOKMARKS, {
    variables: { type: 'bookmark', limit: 50 },
    fetchPolicy: 'cache-and-network',
  });

  const bookmarks = data?.entities ?? [];

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="text-xs font-medium text-muted-foreground px-2 py-1">
        Bookmarks
      </div>
      {loading && bookmarks.length === 0 && (
        <div className="px-2 py-1 text-xs text-muted-foreground">Loading...</div>
      )}
      {bookmarks.map((bookmark: { id: string; uri: string; title: string }) => (
        <button
          key={bookmark.id}
          type="button"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
          onClick={() => openEntityDrawer(bookmark.uri)}
        >
          <span>🔖</span>
          <span className="truncate">{bookmark.title}</span>
        </button>
      ))}
    </div>
  );
}
```

#### Drawer canvas

The drawer canvas renders in the right-side panel. It receives `PluginDrawerCanvasProps` with a `payload` from the nav-sidebar or menu-bar:

```tsx
// src/ui/BookmarkPluginDrawer.tsx

import type { PluginDrawerCanvasProps } from '@tryvienna/sdk';

export function BookmarkPluginDrawer({ payload, hostApi }: PluginDrawerCanvasProps) {
  const view = (payload.view as string) ?? 'settings';

  switch (view) {
    case 'settings':
      return <BookmarkSettingsDrawer hostApi={hostApi} />;
    default:
      return <div className="p-4 text-sm text-muted-foreground">Open Settings</div>;
  }
}
```

#### Entity drawer

The entity drawer opens when a user clicks an entity chip or card in chat, or navigates to an entity from the nav. It's registered via the `ui.drawer` field in `defineEntity()` (see [section 3.2](#_3-2-define-the-entity)).

The drawer component receives `EntityDrawerProps`, which includes a `DrawerContainer` layout wrapper provided by the host app:

```tsx
// src/ui/BookmarkEntityDrawer.tsx

import type { EntityDrawerProps } from '@tryvienna/sdk';
import { useEntity, usePluginMutation } from '@tryvienna/sdk/react';
import { Button, Badge } from '@tryvienna/ui';
import { gql } from '@apollo/client';

const DELETE_BOOKMARK = gql`
  mutation DeleteBookmark($id: String!) {
    deleteBookmark(id: $id) {
      success
      message
    }
  }
`;

export function BookmarkEntityDrawer({ uri, DrawerContainer, onClose }: EntityDrawerProps) {
  const { entity, loading } = useEntity(uri);
  const [deleteBookmark] = usePluginMutation(DELETE_BOOKMARK);

  if (loading && !entity) {
    return (
      <DrawerContainer>
        <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
          Loading...
        </div>
      </DrawerContainer>
    );
  }

  if (!entity) {
    return (
      <DrawerContainer>
        <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
          Bookmark not found
        </div>
      </DrawerContainer>
    );
  }

  const handleDelete = async () => {
    await deleteBookmark({ variables: { id: entity.id } });
    onClose?.();
  };

  return (
    <DrawerContainer>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{entity.title}</h2>
          {entity.description && (
            <p className="text-sm text-muted-foreground">{entity.description}</p>
          )}
        </div>

        <Button variant="destructive" size="sm" onClick={handleDelete}>
          Delete Bookmark
        </Button>
      </div>
    </DrawerContainer>
  );
}
```

**Key points:**
- Always wrap content in `DrawerContainer` — it provides the standard drawer chrome (scroll, padding, header layout)
- Use `onNavigate` to link to other entities from within your drawer
- Use `onClose` to dismiss the drawer after destructive actions
- For entity types **without** a custom drawer, the `GenericEntityDrawer` is used automatically (shows title + type badge + description)

#### Entity card (optional)

You can also provide a custom card component for rendering entity block cards in chat (`[[@vienna//bookmark/abc]]`):

```tsx
// src/ui/BookmarkEntityCard.tsx

import type { EntityCardProps } from '@tryvienna/sdk';

export function BookmarkEntityCard({ uri, label }: EntityCardProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <span>🔖</span>
      <span className="text-sm font-medium">{label ?? 'Bookmark'}</span>
    </div>
  );
}
```

Register it in the entity definition:

```typescript
ui: {
  drawer: BookmarkEntityDrawer,
  card: BookmarkEntityCard,
},
```

#### Feed canvas

The feed canvas renders a card on the home feed grid. It receives `FeedCanvasProps` with `hostApi` for credential checks and `onNavigate` for entity navigation:

```tsx
// src/ui/MyPluginFeed.tsx

import { useState, useEffect } from 'react';
import type { FeedCanvasProps } from '@tryvienna/sdk';
import { usePluginQuery } from '@tryvienna/sdk/react';
import { Settings } from 'lucide-react';

export function MyPluginFeed({ hostApi, onNavigate }: FeedCanvasProps) {
  // Check if the user has configured credentials
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    hostApi.getCredentialStatus('my-integration').then((keys) => {
      if (!cancelled) setIsAuthenticated(keys.some((k) => k.isSet));
    });
    return () => { cancelled = true; };
  }, [hostApi]);

  // Show setup prompt when not configured
  if (isAuthenticated === false) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="text-sm font-medium">My Plugin</span>
        </div>
        <div className="border-t border-border px-4 py-6 text-center">
          <Settings className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Open settings in the sidebar to connect your account.
          </p>
        </div>
      </div>
    );
  }

  // Normal authenticated view with data
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="px-4 py-3">
        <span className="text-sm font-medium">My Plugin</span>
      </div>
      <div className="border-t border-border">
        {/* Render items, filters, etc. */}
      </div>
    </div>
  );
}
```

Register the feed canvas in `definePlugin()`:

```typescript
canvases: {
  feed: {
    component: MyPluginFeed,
    label: 'My Plugin',
    description: 'Shows items from My Plugin. Use when the user wants to see their items.',
    priority: 40,
  },
  'nav-sidebar': { /* ... */ },
  drawer: { /* ... */ },
},
```

**Key points:**
- Feed cards should always handle the unconfigured state — show a setup CTA with instructions
- The `description` field helps the AI decide when to show your feed card
- `priority` controls ordering relative to other plugin feed cards (higher = appears first)
- Use `onNavigate` with `@vienna//` URIs to open entity drawers when users click items
- Feed cards don't have `openPluginDrawer` — direct users to the sidebar settings instead
- The `hostApi` provides credential checking, OAuth status, and proxied fetch

::: tip LAUNCHING WORKSTREAMS FROM FEED CARDS
Feed cards can launch agent workstreams using the `@tryvienna/sdk/graphql` operations:

```typescript
import { usePluginClient } from '@tryvienna/sdk/react';
import { GET_PROJECTS, CREATE_WORKSTREAM, SEND_WORKSTREAM_MESSAGE } from '@tryvienna/sdk/graphql';

const client = usePluginClient();

// 1. Get the project
const { data } = await client.query({ query: GET_PROJECTS });
const projectId = data.projects[0].id;

// 2. Create a workstream
const { data: wsData } = await client.mutate({
  mutation: CREATE_WORKSTREAM,
  variables: {
    input: {
      projectId,
      title: 'Work on task',
      groupName: 'My Tasks',     // auto-creates scope if needed
      createWorktrees: true,      // git worktree isolation
      branchName: 'my-branch',
    },
  },
});

// 3. Send a message to kick off the agent
await client.mutate({
  mutation: SEND_WORKSTREAM_MESSAGE,
  variables: {
    workstreamId: wsData.createWorkstream.workstream.id,
    text: 'Work on this task',
  },
});
```

See the [Linear](https://github.com/tryvienna/linear-plugin) and [Asana](https://github.com/tryvienna/asana-plugin) plugins for complete examples of feed cards with selection checkboxes and agent launching.
:::

### 3.6 Entity rendering in chat

When an agent mentions an entity in chat, it appears as an **inline chip** or a **block card**:

```
Inline chip:  [@vienna//bookmark/abc123?label=TXkgQm9va21hcms=]
Block card:   [[@vienna//bookmark/abc123?label=TXkgQm9va21hcms=]]
```

This rendering is automatic — the `EntityTextRenderer` in `@vienna/chat-ui` parses entity URI markup and renders it using the `EntityWidgetProvider` context.

### 3.7 Write tests

The entity SDK provides testing utilities for unit testing your definitions.

```typescript
// src/__tests__/bookmark.unit.test.ts

import { describe, it, expect } from 'vitest';
import { bookmarkEntity } from '../entities/bookmark';

describe('bookmark entity', () => {
  it('has correct type and metadata', () => {
    expect(bookmarkEntity.type).toBe('bookmark');
    expect(bookmarkEntity.name).toBe('Bookmark');
    expect(bookmarkEntity.source).toBe('integration');
    expect(bookmarkEntity.display?.emoji).toBe('🔖');
  });

  it('creates a valid URI', () => {
    const uri = bookmarkEntity.createURI({ id: 'abc123' });
    expect(uri).toBe('@vienna//bookmark/abc123');
  });

  it('parses a URI', () => {
    const parsed = bookmarkEntity.parseURI('@vienna//bookmark/abc123');
    expect(parsed.type).toBe('bookmark');
    expect(parsed.id).toEqual({ id: 'abc123' });
  });

  it('round-trips URI create/parse', () => {
    const id = { id: 'test-123' };
    const uri = bookmarkEntity.createURI(id);
    const parsed = bookmarkEntity.parseURI(uri);
    expect(parsed.id).toEqual(id);
  });
});
```

#### Using the test harness

For more advanced testing with mock storage and logging:

```typescript
import { createTestHarness, createMockEntityContext, MockSecureStorage, MockPluginLogger } from '@tryvienna/sdk';

const harness = createTestHarness(bookmarkEntity);

// harness.storage — MockSecureStorage (in-memory key-value store)
// harness.logger — MockPluginLogger (captures log entries for assertions)
// harness.ctx — EntityContext with mock dependencies
// harness.definition — The entity definition
// harness.createURI(id) — Build URIs
// harness.parseURI(uri) — Parse URIs

// For integration testing with mock clients:
const { ctx, storage, logger } = createMockEntityContext({
  bookmarks: new MockIntegrationAccessor(myMockStore),
});
```

---

## 4. API Reference

### 4.1 `defineEntity(config)`

Creates a validated, immutable entity definition. Returns a frozen `EntityDefinition` object.

```typescript
function defineEntity(config: EntityDefinitionConfig): EntityDefinition
```

#### EntityDefinitionConfig

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `string` | Yes | — | Lowercase alphanumeric + underscore, starts with letter, max 64 chars |
| `name` | `string` | Yes | — | Human-readable display name |
| `icon` | `PluginIcon` | Yes | — | Icon object (`{ svg }`, `{ png }`, or `{ path }`) |
| `uri` | `string[]` | Yes | — | URI segment names (at least one), e.g. `['id']` or `['owner', 'repo', 'number']` |
| `description` | `string` | No | — | What this entity represents |
| `source` | `'builtin' \| 'integration'` | No | `'integration'` | Where this entity comes from |
| `display` | `EntityDisplayMetadata` | No | — | Display styling metadata |
| `cache` | `{ ttl: number; maxSize?: number }` | No | — | LRU cache config (ttl in ms, maxSize default 100) |
| `ui` | `{ drawer?, card? }` | No | — | Custom UI components (see below) |

#### Entity UI components

| Field | Type | Description |
|-------|------|-------------|
| `ui.drawer` | `ComponentType<EntityDrawerProps>` | Renders when a user clicks an entity chip/card. Receives `uri`, `DrawerContainer`, `onNavigate`, `onClose`, `headerActions`, `projectId` |
| `ui.card` | `ComponentType<EntityCardProps>` | Renders for block card markup (`[[@vienna//...]]`) in chat. Receives `uri`, `label?` |

Without `ui.drawer`, the `GenericEntityDrawer` is used. Without `ui.card`, the default card renderer is used.

#### EntityDefinition (returned)

The returned object has all config fields as readonly properties, plus these methods:

| Method | Returns | Description |
|--------|---------|-------------|
| `createURI(id)` | `string` | Build a `@vienna//` URI for this entity type |
| `parseURI(uri)` | `{ type, id }` | Parse a URI and extract ID segments |
| `uriSegments` | `readonly string[]` | The URI segment names |

#### EntityDisplayMetadata

```typescript
{
  emoji: string;
  colors: {
    bg: string;      // Background color (hex)
    text: string;    // Text color (hex)
    border: string;  // Border color (hex)
  };
  description?: string;
  filterDescriptions?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  outputFields?: Array<{
    key: string;
    label: string;
    metadataPath: string;
    format?: string;
  }>;
}
```

### 4.2 `defineIntegration<TClient>(config)`

Creates a validated, immutable integration definition. Returns a frozen `IntegrationDefinition` object.

```typescript
function defineIntegration<TClient>(
  config: IntegrationConfig<TClient>
): IntegrationDefinition<TClient>
```

#### IntegrationConfig

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string` | Yes | — | Lowercase alphanumeric + underscore, starts with letter |
| `name` | `string` | Yes | — | Human-readable name |
| `icon` | `PluginIcon` | Yes | — | Icon object |
| `description` | `string` | No | — | What this integration provides |
| `oauth` | `OAuthConfig` | No | — | OAuth provider configurations |
| `credentials` | `string[]` | No | — | Secure storage key names (e.g., `['personal_access_token']`) |
| `createClient` | `(ctx: AuthContext) => Promise<TClient \| null>` | Yes | — | Factory to create a typed client |
| `schema` | `(builder: SchemaBuilder) => void` | No | — | GraphQL schema extension callback |

#### IntegrationDefinition (returned)

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Integration identifier |
| `name` | `string` | Display name |
| `icon` | `PluginIcon` | Icon |
| `description` | `string \| undefined` | Description |
| `oauth` | `OAuthConfig \| undefined` | OAuth configuration |
| `credentials` | `readonly string[] \| undefined` | Credential key names |
| `createClient` | Function | Client factory |
| `schema` | Function \| undefined | Schema callback |

#### AuthContext

```typescript
interface AuthContext {
  storage: SecureStorage;     // Per-integration scoped secure storage
  logger: PluginLogger;       // Scoped structured logger
  oauth?: OAuthAccessor;      // OAuth token accessor (if configured)
}
```

#### OAuthConfig

```typescript
interface OAuthConfig {
  providers: OAuthProviderConfig[];
}

interface OAuthProviderConfig {
  providerId: string;
  displayName: string;
  flow: OAuthFlowConfig;  // 'authorization_code' | 'device_code' | 'manual_code'
  scopes: string[];
  required?: boolean;
  // ... additional flow-specific fields
}
```

### 4.3 `definePlugin(config)`

Bundles integrations and entities into a deployable plugin.

```typescript
function definePlugin(config: PluginConfig): PluginDefinition
```

#### PluginConfig

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string` | Yes | — | Unique plugin ID |
| `name` | `string` | Yes | — | Human-readable name |
| `icon` | `PluginIcon` | Yes | — | Plugin icon |
| `description` | `string` | No | — | Plugin description |
| `integrations` | `IntegrationDefinition[]` | No | `[]` | Integrations provided by this plugin |
| `entities` | `EntityDefinition[]` | No | `[]` | Entity types provided by this plugin |
| `canvases` | `PluginCanvases` | No | — | UI canvas contributions |
| `allowedDomains` | `string[]` | No | `[]` | Exact hostname matches for plugin fetch proxy |

#### PluginCanvases

```typescript
interface PluginCanvases {
  'nav-sidebar'?: {
    component: ComponentType<NavSidebarCanvasProps>;
    label: string;
    icon?: string;
    priority?: number;
  };
  drawer?: {
    component: ComponentType<PluginDrawerCanvasProps>;
    label: string;
  };
  'menu-bar'?: {
    icon: ComponentType<MenuBarIconProps>;
    component: ComponentType<MenuBarCanvasProps>;
    label: string;
    priority?: number;
  };
}
```

#### Canvas props

```typescript
// Nav-sidebar
interface NavSidebarCanvasProps {
  pluginId: string;
  openPluginDrawer: (payload: Record<string, unknown>) => void;
  openEntityDrawer: (uri: string) => void;
  hostApi: PluginHostApi;
  logger: CanvasLogger;
}

// Drawer
interface PluginDrawerCanvasProps {
  pluginId: string;
  payload: Record<string, unknown>;
  drawer: PluginDrawerActions;        // close, open, push, pop, canPop
  openEntityDrawer: (uri: string) => void;
  hostApi: PluginHostApi;
  logger: CanvasLogger;
}

// Menu bar icon
interface MenuBarIconProps {
  pluginId: string;
  hostApi: PluginHostApi;
  logger: CanvasLogger;
}

// Menu bar content (popover)
interface MenuBarCanvasProps {
  pluginId: string;
  onClose: () => void;
  openPluginDrawer: (payload: Record<string, unknown>) => void;
  hostApi: PluginHostApi;
  logger: CanvasLogger;
}
```

#### PluginHostApi

Available in all canvas components for interacting with the host app:

```typescript
interface PluginHostApi {
  // Credential management
  getCredentialStatus(integrationId: string): Promise<CredentialStatusEntry[]>;
  setCredential(integrationId: string, key: string, value: string): Promise<void>;
  removeCredential(integrationId: string, key: string): Promise<void>;

  // OAuth
  startOAuthFlow(integrationId: string, providerId: string): Promise<{ success: boolean; error?: string }>;
  getOAuthStatus(integrationId: string): Promise<OAuthProviderStatusEntry[]>;
  revokeOAuthToken(integrationId: string, providerId: string): Promise<{ success: boolean }>;

  // HTTP proxy (CSP-safe)
  fetch(url: string, options?: PluginFetchOptions): Promise<PluginFetchResult>;
}
```

### 4.4 SchemaBuilder

Typed subset of the Pothos API for plugin schema extensions. Passed to the integration's `schema` callback.

#### Type registration

```typescript
// Object types
const MyRef = builder.objectRef<MyShape>('MyType');
builder.objectType(MyRef, {
  description: 'My custom type',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    count: t.exposeInt('count'),
    active: t.exposeBoolean('active'),
    tags: t.exposeStringList('tags'),
  }),
});

// Input types
const MyInput = builder.inputType('MyInput', {
  fields: (t) => ({
    name: t.string({ required: true, description: 'Name' }),
    count: t.int({ description: 'Count' }),
    active: t.boolean({ defaultValue: true }),
  }),
});

// Enum types
const StatusEnum = builder.enumType('Status', {
  values: ['open', 'closed', 'archived'] as const,
});
```

#### Queries and mutations

```typescript
builder.queryFields((t) => ({
  myItems: t.field({
    type: [MyRef],
    args: {
      query: t.arg.string(),
      limit: t.arg.int({ defaultValue: 20 }),
    },
    resolve: async (_root, args, ctx) => {
      // Return array of MyShape
    },
  }),
}));

builder.mutationFields((t) => ({
  createItem: t.field({
    type: MyPayload,
    args: {
      input: t.arg({ type: MyInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      // Return EntityPayloadShape
    },
  }),
}));
```

#### Entity helpers

```typescript
// High-level: creates GraphQL type + registers entity handlers
const MyRef = builder.entityObjectType<MyData>(myEntity, {
  integrations: { myService: myIntegration },  // Injected into EntityContext
  description: 'My entity type',
  fields: (t) => ({ /* field definitions */ }),
  resolve: async (id, ctx) => { /* fetch by URI segments */ },
  search: async (query, ctx) => { /* search/list */ },
  resolveContext: async (entity, ctx) => { /* markdown for AI */ },
});

// Low-level: register handlers only (for manual Pothos types)
builder.registerEntityHandlers<MyData>(myEntity, {
  integrations: { myService: myIntegration },
  resolve: async (id, ctx) => { /* ... */ },
  search: async (query, ctx) => { /* ... */ },
  resolveContext: async (entity, ctx) => { /* ... */ },
});

// Mutation payload type
const MyPayload = builder.entityPayload('MyPayload', MyRef, 'myField');
// Creates: { success: Boolean!, message: String, myField: MyType, data: JSON }
```

#### EntityContext

Passed to `resolve`, `search`, and `resolveContext` handlers:

```typescript
interface EntityContext {
  storage: SecureStorage;
  logger: PluginLogger;
  integrations: {
    [name: string]: { client: TClient | null };
  };
}
```

### 4.5 PluginSystem

Unified runtime registry. Managed by the host app — plugins don't interact with it directly, but it's useful to understand for debugging.

```typescript
class PluginSystem {
  // Plugin lifecycle
  registerPlugin(plugin: PluginDefinition): void;
  unregisterPlugin(id: string): boolean;
  getPlugin(id: string): PluginDefinition | undefined;
  getPlugins(): PluginDefinition[];

  // Integration lookup
  getIntegration(id: string): IntegrationDefinition | undefined;
  getAllIntegrations(): IntegrationDefinition[];

  // Entity lookup
  getEntity(type: string): EntityDefinition | undefined;
  getEntityTypes(): string[];
  getAllEntities(): EntityDefinition[];

  // Entity handlers (registered via SchemaBuilder)
  getEntityHandlers(type: string): EntityHandlers | undefined;

  // Entity resolution
  resolveEntity(uri: string, ctx: EntityContext): Promise<BaseEntity | null>;
  searchEntities(query: string, ctx: EntityContext, types?: string[], limit?: number): Promise<BaseEntity[]>;
  resolveEntityContext(uri: string, ctx: EntityContext): Promise<string | null>;

  // Canvas queries
  getNavCanvases(): ResolvedNavSidebar[];
  getDrawerCanvas(pluginId: string): ResolvedDrawer | undefined;
  getMenuBarItems(): ResolvedMenuBar[];
  getEntityDrawer(type: string): ResolvedEntityDrawer | undefined;
}
```

### 4.6 URI Utilities

```typescript
import {
  buildEntityURI,
  buildEntityURIWithLabel,
  parseEntityURI,
  parseEntityURIWithLabel,
  getEntityTypeFromURI,
  isEntityURI,
  extractLabel,
  compareEntityURIs,
} from '@tryvienna/sdk';

// Build URIs
buildEntityURI('bookmark', { id: 'abc' }, { segments: ['id'] });
// → '@vienna//bookmark/abc'

buildEntityURI('github_pr', { owner: 'foo', repo: 'bar', number: '42' }, { segments: ['owner', 'repo', 'number'] });
// → '@vienna//github_pr/foo/bar/42'

buildEntityURIWithLabel('bookmark', { id: 'abc' }, { segments: ['id'] }, 'My Bookmark');
// → '@vienna//bookmark/abc?label=TXkgQm9va21hcms='

// Parse URIs
parseEntityURI('@vienna//bookmark/abc', { segments: ['id'] });
// → { type: 'bookmark', id: { id: 'abc' } }

parseEntityURIWithLabel('@vienna//bookmark/abc?label=TXkgQm9va21hcms=');
// → { type: 'bookmark', id: { id: 'abc' }, label: 'My Bookmark' }

// Utilities
getEntityTypeFromURI('@vienna//bookmark/abc');  // → 'bookmark'
isEntityURI('@vienna//bookmark/abc');           // → true
extractLabel('@vienna//bookmark/abc?label=TXkgQm9va21hcms=');  // → 'My Bookmark'
compareEntityURIs(uri1, uri2);                 // → true/false (ignores labels)
```

### 4.7 Error Classes

```typescript
import {
  EntityURIError,
  EntityDefinitionError,
  isEntityURIError,
  isEntityDefinitionError,
} from '@tryvienna/sdk';

// EntityURIError
try {
  parseEntityURI('invalid');
} catch (e) {
  if (isEntityURIError(e)) {
    e.code;    // 'INVALID_FORMAT' | 'MISSING_ENTITY_TYPE' | 'MISSING_PATH' | ...
    e.uri;     // The invalid URI string
    e.message; // Human-readable description
  }
}

// EntityDefinitionError
try {
  defineEntity({ type: 'INVALID', /* ... */ });
} catch (e) {
  if (isEntityDefinitionError(e)) {
    e.entityType; // 'INVALID'
    e.field;      // 'type'
    e.message;    // 'Invalid entity type ...'
  }
}
```

URI error codes:

| Code | Meaning |
|------|---------|
| `INVALID_FORMAT` | URI doesn't match `@vienna//...` format |
| `MISSING_ENTITY_TYPE` | No type segment after `@vienna//` |
| `MISSING_PATH` | No path segments after type |
| `INVALID_ENTITY_TYPE` | Type doesn't match naming rules |
| `INVALID_PATH_SEGMENT` | Segment contains control characters |
| `INVALID_LABEL_ENCODING` | Base64 label couldn't be decoded |
| `SEGMENT_COUNT_MISMATCH` | URI has wrong number of segments for the entity type |

### 4.8 EntityCache

LRU cache with TTL (time-to-live) expiration:

```typescript
import { EntityCache } from '@tryvienna/sdk';

const cache = new EntityCache<BaseEntity>({ ttl: 60_000, maxSize: 100 });

cache.set('key', entity);
cache.get('key');          // Returns entity or undefined if expired
cache.invalidate('key');   // Remove specific entry
cache.prune();             // Remove all expired entries, returns count removed
cache.clear();             // Remove everything
cache.size;                // Number of live (non-expired) entries
```

### 4.9 Testing Utilities

```typescript
import {
  createTestHarness,
  createMockEntityContext,
  MockSecureStorage,
  MockPluginLogger,
  MockOAuthAccessor,
  MockIntegrationAccessor,
} from '@tryvienna/sdk';

// MockSecureStorage — in-memory key-value store implementing SecureStorage
const storage = new MockSecureStorage();
await storage.set('api_key', 'sk-test-123');
await storage.get('api_key');    // 'sk-test-123'
await storage.has('api_key');    // true
await storage.delete('api_key');
storage.clear();
storage.size;  // 0

// MockPluginLogger — captures structured log entries
const logger = new MockPluginLogger();
logger.info('hello', { extra: 'data' });
logger.entries;  // [{ level: 'info', msg: 'hello', ctx: { extra: 'data' } }]
logger.clear();

// MockOAuthAccessor — simulates OAuth token storage
const oauth = new MockOAuthAccessor();
oauth.setToken('github', { accessToken: 'gho_xxx', expiresAt: Date.now() + 3600000 });
await oauth.getAccessToken('github');  // 'gho_xxx'
await oauth.isAuthenticated('github'); // true

// MockIntegrationAccessor — wraps a mock client
const accessor = new MockIntegrationAccessor(myMockClient);
accessor.client;  // myMockClient

// createMockEntityContext — builds a full EntityContext with mocks
const { ctx, storage, logger } = createMockEntityContext({
  bookmarks: new MockIntegrationAccessor(mockStore),
});

// createTestHarness — wraps an entity definition with mock dependencies
const harness = createTestHarness(bookmarkEntity);
harness.storage;     // MockSecureStorage
harness.logger;      // MockPluginLogger
harness.definition;  // The entity definition
harness.createURI({ id: '123' });
harness.parseURI('@vienna//bookmark/123');
```

### 4.10 React Hooks

Available from `@tryvienna/sdk/react`:

```typescript
// Fetch a single entity by URI
const { entity, loading, error, refetch } = useEntity(uri, {
  fetchPolicy: 'cache-and-network',
  pollInterval: 30_000,
});

// Fetch a list of entities by type
const { entities, loading, error } = useEntities({
  type: 'bookmark',
  query: 'react',
  limit: 20,
});

// Typed GraphQL query (uses plugin's Apollo client)
const { data, loading } = usePluginQuery(MY_QUERY, {
  variables: { id: '123' },
});

// Typed GraphQL mutation
const [mutate, { loading }] = usePluginMutation(MY_MUTATION);

// Access the plugin host API (fetch proxy, credentials, OAuth)
const hostApi = useHostApi();

// Get the active workstream ID (null if none selected)
const workstreamId = useActiveWorkstreamId();

// Access the Apollo client directly
const client = usePluginClient();

// Get the current resolved theme ('dark' or 'light')
const { resolvedTheme } = useTheme();
```

#### Theme-aware UI

Plugins can adapt their appearance based on the current theme:

```typescript
import { useTheme } from '@tryvienna/sdk/react';

function MyCard() {
  const { resolvedTheme } = useTheme();

  return (
    <div className={resolvedTheme === 'dark' ? 'card-dark' : 'card-light'}>
      Theme: {resolvedTheme}
    </div>
  );
}
```

#### Workstream-aware UI

Plugins can conditionally show or hide UI based on whether a workstream is active:

```typescript
import { useActiveWorkstreamId } from '@tryvienna/sdk/react';
import type { MenuBarIconProps } from '@tryvienna/sdk';

function MyMenuBarIcon(_props: MenuBarIconProps) {
  const workstreamId = useActiveWorkstreamId();

  // Only show the icon when a workstream is selected
  if (!workstreamId) return null;

  return <MyIcon />;
}
```

#### Cache utilities

```typescript
import { invalidateEntity, updateCachedEntity } from '@tryvienna/sdk/react';

// Evict an entity from Apollo cache
invalidateEntity(client, 'Bookmark', 'abc123');

// Update specific fields in cache (optimistic UI)
updateCachedEntity(client, 'Bookmark', 'abc123', {
  title: 'Updated Title',
});
```

### 4.11 GraphQL API

#### Generic queries (available for all entity types)

```graphql
# Get single entity by URI
query GetEntity($uri: String!) {
  entity(uri: $uri) {
    id
    type
    uri
    title
    description
    createdAt
    updatedAt
  }
}

# List entities of a type
query ListEntities($type: String!, $query: String, $filters: JSON, $limit: Int) {
  entities(type: $type, query: $query, filters: $filters, limit: $limit) {
    id
    type
    uri
    title
    description
  }
}

# Search across all entity types
query SearchEntities($query: String!, $types: [String!], $limit: Int) {
  entitySearch(query: $query, types: $types, limit: $limit) {
    id
    type
    uri
    title
  }
}

# Discover registered entity types
query EntityTypes {
  entityTypes {
    type
    displayName
    icon
    source
    uriExample
    display { emoji colors { bg text border } description }
  }
}

# Discover registered integrations
query Integrations {
  integrations {
    id
    displayName
    icon
  }
}
```

#### Plugin-defined mutations

Entity mutations are **not generic** — each integration defines its own mutations via the `schema` callback. For example, the GitHub plugin defines:

```graphql
mutation CreatePR($input: CreateGitHubPRInput!) {
  githubCreatePR(input: $input) {
    success
    message
    pr { id title state }
  }
}

mutation MergePR($input: MergePRInput!) {
  githubMergePR(input: $input) {
    success
    message
  }
}
```

Claude discovers these operations via the `graphql_operations` MCP tool.

### 4.12 MCP Tools

These tools are automatically available to Claude agents:

| Tool | Description | Key inputs |
|------|------------|-----------|
| `graphql_operations` | Discover available GraphQL queries and mutations | `query?` (keyword), `kind?` (query/mutation) |
| `graphql_execute` | Execute a GraphQL query or mutation | `query`, `variables?` |
| `entity_types` | List registered entity types and integrations | (none) |
| `entity_get` | Get entity details by URI | `uri` |

Claude's workflow for operating on entities:

1. **Discover** — Call `graphql_operations` to find available operations (e.g., `graphql_operations({ query: "bookmark" })`)
2. **Execute** — Call `graphql_execute` with the discovered query/mutation
3. **Resolve** — Call `entity_get` to fetch entity details by URI

---

## 5. Complete File Listing

### Plugin package structure

```
packages/plugin-bookmarks/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    ← Main entry point (definePlugin — full definition)
    ├── renderer.ts                 ← Renderer entry point (canvases only — optional)
    ├── integration.ts              ← Integration definition (defineIntegration)
    ├── schema.ts                   ← GraphQL schema registration (main-process only)
    ├── entities/
    │   └── bookmark.ts             ← Entity definition (defineEntity)
    ├── ui/
    │   ├── BookmarkNavSection.tsx   ← Nav-sidebar canvas
    │   ├── BookmarkPluginDrawer.tsx ← Drawer canvas router
    │   └── BookmarkEntityDrawer.tsx ← Custom entity drawer (optional)
    └── __tests__/
        └── bookmark.unit.test.ts   ← Entity tests
```

`renderer.ts` is **optional** — only needed when your plugin imports Node built-ins in its schema or integration code. See [§3.4b Main vs Renderer](#_3-4b-main-vs-renderer-separate-entry-points) for details.

### Reference plugins

These existing plugins demonstrate the patterns:

| Plugin | What it demonstrates |
|--------|---------------------|
| `packages/plugin-github/` | Full integration: OAuth, 4 entity types, 12 queries, 10 mutations, entity drawers with editing, nav-sidebar |
| `packages/plugin-weather/` | Simple integration: menu-bar canvas, plugin fetch proxy, settings persistence, no entities |
| `packages/plugin-quick-actions/` | Dual entry points (`renderer.ts`), Node built-ins in schema resolvers, menu-bar + drawer canvases, localStorage settings |

---

## 6. Checklist

Before shipping your plugin:

- [ ] Plugin ID and entity types are lowercase alphanumeric + underscore, starting with letter
- [ ] `name` (not `displayName`) is used in all `define*` calls
- [ ] `icon` is a `PluginIcon` object (`{ svg: '...' }`) — not a bare string
- [ ] Entity `uri` segments match the data model (e.g., `['owner', 'repo', 'number']`)
- [ ] `resolve()` handler returns `null` for missing entities (not throwing)
- [ ] `search()` handler respects `query.limit` parameter
- [ ] `resolveContext()` returns useful markdown for AI consumption
- [ ] GraphQL mutations use `entityPayload()` for consistent return shapes
- [ ] Input fields use `description` for AI-friendly operation discovery
- [ ] External API domains declared in `allowedDomains` (not CSP)
- [ ] All HTTP calls use `hostApi.fetch()` — never direct `fetch()` in renderer
- [ ] No `process.env`, `window.*`, or `console.*` usage (use `// eslint-disable-next-line` in plugin UI if needed)
- [ ] All spacing follows 8pt grid (Tailwind `p-2`, `gap-4`, etc.)
- [ ] Tests cover: entity definition, URI round-trip, integration schema
- [ ] `pnpm typecheck --filter=@vienna/plugin-bookmarks` passes
- [ ] If schema/integration imports `node:*` modules, provide `src/renderer.ts` with canvases only
- [ ] `renderer.ts` plugin `id` matches `index.ts` plugin `id` exactly
- [ ] Plugin auto-discovers via `packages/plugin-*` naming convention

---

## 7. Common Errors

These are the most frequent `EntityDefinitionError` scenarios and how to fix them.

### Invalid entity type format

```
EntityDefinitionError: Invalid entity type "MyIssue" — must be lowercase alphanumeric + underscores, starting with a letter (1-64 chars)
```

**Fix:** Use snake_case for entity type IDs:

```typescript
defineEntity({
  type: 'my_issue',  // ✅ lowercase + underscores
  // type: 'MyIssue',  // ❌ uppercase not allowed
  // type: '1_issue',  // ❌ must start with a letter
  name: 'My Issue',
  icon: { svg: '...' },
  uri: ['id'],
});
```

### Missing required `icon` field

```
EntityDefinitionError: "icon" must be a PluginIcon object ({ svg: string } | { png: string } | { path: string })
```

**Fix:** Provide a `PluginIcon` object, not a string:

```typescript
defineEntity({
  type: 'task',
  name: 'Task',
  icon: { svg: '<svg>...</svg>' },  // ✅ object with svg/png/path key
  // icon: '📋',  // ❌ bare string not allowed
  uri: ['id'],
});
```

### Empty URI segments

```
EntityDefinitionError: "uri.segments" must contain at least one segment
```

**Fix:** Every entity needs at least one URI segment to build addressable URIs:

```typescript
defineEntity({
  type: 'note',
  name: 'Note',
  icon: { svg: '...' },
  uri: ['id'],  // ✅ at least one segment
  // uri: [],                  // ❌ empty segments array
});
```

### Duplicate entity type registration

```
EntityDefinitionError: Entity type "github_pr" is already registered
```

**Fix:** Each entity type must be globally unique. If two plugins define the same type, the second registration fails. Use a namespace prefix for your entity types:

```typescript
defineEntity({
  type: 'mycompany_task',  // ✅ namespaced to avoid collisions
  // type: 'task',          // ❌ too generic, may collide
  name: 'Task',
  icon: { svg: '...' },
  uri: ['id'],
});
```

### Invalid display metadata colors

```
EntityDefinitionError: "display.colors" must include bg, text, and border fields
```

**Fix:** All three color fields are required when providing display metadata:

```typescript
defineEntity({
  type: 'alert',
  name: 'Alert',
  icon: { svg: '...' },
  uri: ['id'],
  display: {
    emoji: '🚨',
    colors: {
      bg: '#fef2f2',      // ✅ all three required
      text: '#dc2626',
      border: '#fecaca',
    },
  },
});
```

---

## 8. Troubleshooting

### Plugin doesn't load

1. **Check package naming** — The package must be in `packages/plugin-*` for auto-discovery. Verify the directory name matches this pattern.
2. **Check the exports field** — `package.json` needs `"exports": { ".": "./src/index.ts" }`. Missing or incorrect exports prevent the plugin loader from finding your entry point.
3. **Check the console** — Open DevTools (`Cmd+Option+I`) and look for plugin registration errors in the main process logs. Common causes: syntax errors in your plugin code, missing dependencies.
4. **Check plugin ID** — The `id` in `definePlugin()` must be unique across all plugins. Duplicate IDs silently fail.
5. **Restart the app** — Plugins are loaded at startup. After adding a new plugin package, restart the dev server with `pnpm dev`.

### Schema fails to compile

1. **Missing schema registration** — If you added types in `schema.ts` but didn't register them in `plugin-schemas.ts` for codegen, the generated types won't exist. Add your schema to the codegen pipeline.
2. **Circular references** — Pothos doesn't support circular object type references. If type A references type B which references type A, extract the shared fields into a base type.
3. **Type mismatch** — Ensure your resolver return types match the Pothos field definitions. `t.exposeString('name')` expects the resolver to return an object with a `name: string` property.

### React hooks return undefined

1. **Missing Apollo Provider** — `usePluginQuery` and `usePluginMutation` require the plugin's Apollo client to be available. This is automatically set up by the host — but if you're testing in isolation, wrap your component in `<ApolloProvider>`.
2. **Wrong import path** — Hooks must be imported from `@tryvienna/sdk/react`, not from `@tryvienna/sdk`. The root export doesn't include React dependencies.
3. **Query not returning data** — Check that your GraphQL operation matches the schema. Use the MCP `graphql_execute` tool to test queries directly.
4. **Skip condition active** — If you pass `skip: true` or a `skip` condition that evaluates to true, the hook won't execute the query. Check your skip logic.
