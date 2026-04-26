# @vienna/graphql

Code-first GraphQL schema (Pothos) + Apollo Client utilities for Vienna. Provides both **typed domain queries** (project, workstream) and **generic entity operations** (entity, entities, entitySearch, entityAction, integrationMethod) that work for any registered entity type.

## Architecture

This package is split into two halves — one for the main process (schema), one for the renderer (client):

```
Schema (main process only)                Client (renderer process)
├── schema/builder.ts  ← Pothos builder   ├── client/create-client.ts ← Apollo factory
├── schema/scalars.ts  ← DateTime, JSON   ├── client/ipc-link.ts     ← IPC transport
├── schema/index.ts    ← assembled schema ├── client/cache-config.ts  ← type policies
├── domains/projects/                     ├── client/operations.ts    ← gql operations
│   ├── types.ts                          └── client/index.ts         ← barrel
│   ├── queries.ts
│   └── mutations.ts
├── domains/workstreams/
│   ├── types.ts
│   ├── queries.ts
│   └── mutations.ts
└── domains/entities/        ← generic entity operations
    ├── types.ts             ← Entity, EntityTypeInfo, EntityActionResult
    ├── queries.ts           ← entity, entities, entitySearch, entityTypes
    └── mutations.ts         ← entityAction, integrationMethod
```

### Execution Path

```
Renderer                          Main Process
─────────                         ────────────
React component
  └─ useQuery(GET_PROJECTS)
      └─ Apollo Client (InMemoryCache)
          └─ IPC Link (createIpcLink)
              └─ window.api.graphql.execute() ──IPC──> graphql-js execute()
                                                          └─ Pothos schema
                                                              └─ ctx.db / ctx.entityRegistry
                                                                  └─ SQLite (WAL)
```

### Type Flow

Every native domain type traces back to one Zod schema in `@vienna/app-db`. Generic entity types come from `@tryvienna/sdk`:

```
Native domains:
  Zod schema (@vienna/app-db)
    → z.infer → TypeScript type (ProjectRecord)
      → Pothos backing model (builder.objectRef<ProjectRecord>)
        → GraphQL schema fields (fully type-checked resolvers)

Generic entities:
  @tryvienna/sdk types (BaseEntity, EntityTypeSummary, EntityActionResult)
    → Pothos backing model (builder.objectRef<BaseEntity>)
      → GraphQL schema fields
        → Resolvers delegate to EntityRegistry / IntegrationRegistry
```

## Key Design Principles

- **Types defined ONCE** — Zod schemas in `@vienna/app-db` are the source of truth for native domains. Entity SDK types are the source of truth for generic operations. No SDL files, no codegen for server types.
- **No Apollo Server** — the main process uses `graphql-js execute()` directly (~30 LOC). Zero HTTP overhead, just a function call over IPC.
- **Process safety** — `@vienna/graphql/schema` must ONLY be imported in the main process. The renderer imports `@vienna/graphql/client`. The root `@vienna/graphql` export contains only shared types (safe everywhere).
- **Each domain is ~50 lines** — types.ts + queries.ts + mutations.ts per domain.
- **Normalized cache** — Apollo's InMemoryCache normalizes entities by their key fields (`id` for native types, `uri` for generic entities).
- **Runtime-extensible** — New entity types register in the `EntityRegistry` at runtime. No schema rebuild needed.

## Export Paths

| Path                     | Import from       | Contents                                                       |
| ------------------------ | ----------------- | -------------------------------------------------------------- |
| `@vienna/graphql`        | Any process       | `GraphQLContext` type                                          |
| `@vienna/graphql/schema` | Main process only | Pothos `schema`, `builder`                                     |
| `@vienna/graphql/client` | Renderer only     | `createApolloClient`, `createIpcLink`, operations, cache utils |

### Critical: Process Safety

Never import `@vienna/graphql/schema` in the renderer or preload. It pulls in Pothos, graphql-js, and `@vienna/app-db` (which depends on `better-sqlite3`, a native module). Renderer code should only import from `@vienna/graphql/client`.

## Schema Overview

### Native Domain Queries

Typed queries with full Pothos type-checking:

```graphql
# Projects
query {
  projects {
    id
    name
    createdAt
  }
}
query {
  project(id: "abc") {
    id
    name
    workstreams {
      id
      title
    }
  }
}
mutation {
  createProject(input: { name: "My Project" }) {
    id
    name
  }
}

# Workstreams
query {
  workstreamsByProject(projectId: "abc") {
    id
    title
    status
    isPinned
  }
}
mutation {
  archiveWorkstream(id: "xyz") {
    id
    status
  }
}
mutation {
  pinWorkstream(id: "xyz") {
    id
    isPinned
  }
}
```

### Generic Entity Operations

Work for ANY registered entity type (built-in or plugin-provided):

```graphql
# Resolve by URI
query {
  entity(uri: "@vienna//project/abc") {
    id
    type
    uri
    title
    metadata
  }
}

# List entities of a type (with optional filters)
query {
  entities(type: "workstream", query: "design", limit: 10) {
    id
    title
    metadata
  }
}

# Search across types
query {
  entitySearch(query: "design", types: ["project", "workstream"]) {
    id
    type
    title
  }
}

# Discover registered types (for MCP entity_types tool)
query {
  entityTypes {
    type
    displayName
    icon
    source
    uriExample
    actions
  }
}

# Execute an entity action
mutation {
  entityAction(type: "workstream", action: "archive", uri: "@vienna//workstream/xyz") {
    success
    message
    entity {
      id
      title
    }
  }
}

# Call an integration method
mutation {
  integrationMethod(integration: "linear", method: "list_teams")
}
```

### GraphQLContext

The context passed to every resolver:

```ts
interface GraphQLContext {
  db: AppDb; // App-level database repositories
  userId: string | null; // Authenticated user
  entityRegistry?: EntityRegistry; // Generic entity operations
  integrationRegistry?: IntegrationRegistry; // Integration method calls
}
```

The registries are optional — when not provided, entity queries return null/empty gracefully. This allows the schema to work in test environments without full registry setup.

## Adding a New Native Domain

Follow this exact sequence:

### Step 1: Data layer (`@vienna/app-db`)

1. Add Zod schemas to `packages/app-db/src/schemas.ts`
2. Add migration SQL to `packages/app-db/src/database.ts`
3. Create repository in `packages/app-db/src/<domain>.ts`
4. Export from `packages/app-db/src/index.ts` and add to `AppDb` interface

### Step 2: Builder configuration

1. Import the new record type in `src/schema/builder.ts`
2. Add it to the `Objects` map in the builder generic parameter

### Step 3: Domain module

Create `src/domains/<domain>/types.ts`, `queries.ts`, and `mutations.ts`.

### Step 4: Register in schema

Import all three files in `src/schema/index.ts`.

### Step 5: Client operations

Add gql operations to `src/client/operations.ts`.

### Step 6: Cache config

Add type policy to `src/client/cache-config.ts`.

### Step 7: Tests

Add execution tests in `src/schema.test.ts`.

## Adding a New Entity Type (Plugin)

Entity types register at runtime — no schema changes needed:

1. Define an `EntityTypeRegistration` with type, resolver, actions, and display metadata
2. Call `entityRegistry.register(registration)` in the main process
3. The entity is immediately queryable through all generic entity operations

See `@tryvienna/sdk` README for the full registration API.

## Cache Configuration

Type policies for Apollo InMemoryCache:

```ts
{
  Project: { keyFields: ['id'] },
  Workstream: { keyFields: ['id'] },
  Entity: { keyFields: ['uri'] },          // URI is globally unique across entity types
  EntityActionResult: { keyFields: false }, // Mutations don't cache by identity
}
```

### Cache Invalidation Events

Two structured patterns for keeping the renderer cache consistent:

1. **`onInvalidate`** — broad invalidation (entity created/deleted)

   ```ts
   emitter.graphql.onInvalidate({ typename: 'Workstream' });
   ```

2. **`onCacheUpdate`** — granular field update (status change, counter bump)
   ```ts
   emitter.graphql.onCacheUpdate({
     typename: 'Workstream',
     id: ws.id,
     fields: { status: 'active' },
   });
   ```

Use `invalidateEntity()` and `updateCachedEntity()` from `@vienna/graphql/client` to handle these events.

## Circular Dependencies Between Domains

When domain A references domain B and vice versa, use lazy imports:

```ts
// In projects/types.ts — lazy import at bottom of file
builder.objectType(ProjectRef, {
  fields: (t) => ({
    workstreams: t.field({
      type: [WorkstreamRef],
      resolve: (project, _args, ctx) => ctx.db.workstreams.getByProject(project.id),
    }),
  }),
});

import { WorkstreamRef } from '../workstreams/types';
```

## Desktop Integration (IPC)

The GraphQL IPC domain lives in `apps/desktop/src/ipc/graphql/`:

- **`contract.ts`** — defines `graphqlApi` (execute method) and `graphqlEvents` (cache invalidation events)
- **`handlers.ts`** — uses `graphql-js execute()` with document caching, injects `EntityRegistry` and `IntegrationRegistry` into context

```ts
const context: GraphQLContext = {
  db,
  userId: null,
  entityRegistry: options.entityRegistry,
  integrationRegistry: options.integrationRegistry,
};
const result = await execute({
  schema,
  document,
  contextValue: context,
  variableValues: variables,
});
```

## Testing

Tests use `graphql-js execute()` directly against the Pothos schema with an in-memory SQLite database:

```ts
import { execute, parse } from 'graphql';
import { schema } from './schema/index';
import { EntityRegistry } from '@tryvienna/sdk';

const raw = openAppDatabase({ path: ':memory:' });
const db = createAppDb(raw, '/tmp/settings.json');
const entityRegistry = new EntityRegistry();
// ... register entity types ...

const result = await execute({
  schema,
  document: parse('{ entity(uri: "@vienna//project/abc") { id title } }'),
  contextValue: { db, userId: null, entityRegistry },
});
```

### Vitest Configuration

This package requires `test.server.deps.inline: true` in `vitest.config.ts`. Without it, vitest's Vite transform pipeline loads the `graphql` module twice, causing `"Cannot use GraphQLSchema from another module or realm"` errors. Do NOT remove this setting.

## Client Operations

All gql operations are exported from `@vienna/graphql/client`:

**Native domains**: `GET_PROJECTS`, `GET_PROJECT`, `CREATE_PROJECT`, `UPDATE_PROJECT`, `DELETE_PROJECT`, `GET_WORKSTREAMS_BY_PROJECT`, `GET_WORKSTREAM`, `GET_ARCHIVED_WORKSTREAMS`, `CREATE_WORKSTREAM`, `UPDATE_WORKSTREAM`, `ARCHIVE_WORKSTREAM`, `UNARCHIVE_WORKSTREAM`, `PIN_WORKSTREAM`, `UNPIN_WORKSTREAM`, `DELETE_WORKSTREAM`

**Generic entities**: `GET_ENTITY`, `GET_ENTITIES`, `SEARCH_ENTITIES`, `GET_ENTITY_TYPES`, `ENTITY_ACTION`, `INTEGRATION_METHOD`

## Commands

```bash
pnpm test:unit       # Run unit tests (21 tests)
pnpm typecheck       # Type check
pnpm schema:print    # Print schema as SDL (for inspection)
```
