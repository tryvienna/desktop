# @vienna/graphql

Code-first GraphQL schema (Pothos) + Apollo Client utilities for Vienna.

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
└── domains/workstream-groups/
    ├── types.ts       ← WorkstreamGroup, GroupLinkedEntity, GroupDirectory + derivedStatus
    ├── queries.ts
    └── mutations.ts
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
                                                              └─ ctx.db.projects.listAll()
                                                                  └─ SQLite (WAL)
```

### Type Flow

Every type traces back to one Zod schema in `@vienna/app-db`. Change the schema and TypeScript errors propagate through every layer:

```
Zod schema (@vienna/app-db)
  → z.infer → TypeScript type (ProjectRecord)
    → Pothos backing model (builder.objectRef<ProjectRecord>)
      → GraphQL schema fields (fully type-checked resolvers)
        → Apollo Client (typed operations in useQuery/useMutation)
          → React component (no `as` casts needed)
```

## Key Design Principles

- **Types defined ONCE** — Zod schemas in `@vienna/app-db` are the source of truth. Pothos infers resolver types from the backing model. No SDL files, no codegen for server types.
- **No Apollo Server** — the main process uses `graphql-js execute()` directly (~30 LOC). Zero HTTP overhead, just a function call over IPC.
- **Process safety** — `@vienna/graphql/schema` must ONLY be imported in the main process. The renderer imports `@vienna/graphql/client`. The root `@vienna/graphql` export contains only shared types (safe everywhere).
- **Each domain is ~50 lines** — types.ts + queries.ts + mutations.ts per domain, not a monolithic resolver file.
- **Normalized cache** — Apollo's InMemoryCache is the core value proposition. Type policies and cache invalidation utilities preserve UI consistency across components.

## Export Paths

| Path                     | Import from       | Contents                                                       |
| ------------------------ | ----------------- | -------------------------------------------------------------- |
| `@vienna/graphql`        | Any process       | `GraphQLContext` type                                          |
| `@vienna/graphql/schema` | Main process only | Pothos `schema`, `builder`                                     |
| `@vienna/graphql/client` | Renderer only     | `createApolloClient`, `createIpcLink`, operations, cache utils |

### Critical: Process Safety

Never import `@vienna/graphql/schema` in the renderer or preload. It pulls in Pothos, graphql-js, and `@vienna/app-db` (which depends on `better-sqlite3`, a native module). Renderer code should only import from `@vienna/graphql/client`.

## Adding a New Domain

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

1. Create `src/domains/<domain>/types.ts`:

   ```ts
   import type { FooRecord } from '@vienna/app-db';
   import { builder } from '../../schema/builder';

   export const FooRef = builder.objectRef<FooRecord>('Foo');

   builder.objectType(FooRef, {
     fields: (t) => ({
       id: t.exposeID('id'),
       name: t.exposeString('name'),
       createdAt: t.expose('createdAt', { type: 'DateTime' }),
       // Relational fields use resolver:
       // parent: t.field({ type: ParentRef, resolve: (foo, _args, ctx) => ctx.db.parents.getById(foo.parentId) }),
     }),
   });
   ```

2. Create `src/domains/<domain>/queries.ts`:

   ```ts
   builder.queryFields((t) => ({
     foo: t.field({
       type: FooRef,
       nullable: true,
       args: { id: t.arg.id({ required: true }) },
       resolve: (_root, args, ctx) => ctx.db.foos.getById(String(args.id)),
     }),
   }));
   ```

3. Create `src/domains/<domain>/mutations.ts`:

   ```ts
   const CreateFooInput = builder.inputType('CreateFooInput', {
     fields: (t) => ({ name: t.string({ required: true }) }),
   });

   builder.mutationFields((t) => ({
     createFoo: t.field({
       type: FooRef,
       args: { input: t.arg({ type: CreateFooInput, required: true }) },
       resolve: (_root, args, ctx) => ctx.db.foos.create({ name: args.input.name }),
     }),
   }));
   ```

### Step 4: Register in schema

Import all three files in `src/schema/index.ts`:

```ts
import '../domains/<domain>/types';
import '../domains/<domain>/queries';
import '../domains/<domain>/mutations';
```

### Step 5: Client operations

Add gql operations to `src/client/operations.ts`:

```ts
export const GET_FOOS = gql`
  query GetFoos {
    foos {
      id
      name
      createdAt
    }
  }
`;
```

### Step 6: Cache config

Add type policy to `src/client/cache-config.ts` if the domain needs custom cache behavior:

```ts
Foo: { keyFields: ['id'] },
```

### Step 7: Tests

Add execution tests in `src/schema.test.ts` or a separate `src/domains/<domain>/<domain>.test.ts`.

## Workstream Groups Domain

The `workstream-groups` domain (`src/domains/workstream-groups/`) provides GraphQL types, queries, and mutations for workstream groups.

### Types

- **WorkstreamGroup** — id, name, isPinned, project, workstreams, linkedEntities, directories, derivedStatus
- **GroupLinkedEntity** — entityUri, entityType, entityTitle, contextOverride, createdAt
- **GroupDirectory** — id, path, label, createdAt
- **derivedStatus** — computed field: highest-priority status among member workstreams (waiting_permission > completed_unviewed > processing > active > idle > archived)

### Queries

- `workstreamGroup(id)` — single group by ID
- `workstreamGroupsByProject(projectId)` — all groups in a project
- `groupLinkedEntities(groupId)` — entities linked to a group
- `groupDirectories(groupId)` — directories shared by a group

### Mutations

- `createWorkstreamGroup`, `updateWorkstreamGroup`, `deleteWorkstreamGroup`
- `pinWorkstreamGroup`, `unpinWorkstreamGroup`
- `addWorkstreamToGroup`, `removeWorkstreamFromGroup`
- `linkGroupEntity`, `unlinkGroupEntity`
- `addGroupDirectory`, `removeGroupDirectory`

All mutations follow the Relay payload convention (return `{ group { ... } }` or `{ workstream { ... } }`).

### Cross-Domain References

- `Workstream.group` — nullable relation to WorkstreamGroup (uses lazy ref to avoid circular imports)
- `Workstream.groupId` — exposed nullable ID field
- `WorkstreamGroup.workstreams` — list of non-archived member workstreams
- `WorkstreamGroup.project` — parent project relation

## Circular Dependencies Between Domains

When domain A references domain B and vice versa (e.g., Project.workstreams and Workstream.project), use lazy imports:

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

// Lazy import AFTER the builder.objectType call
import { WorkstreamRef } from '../workstreams/types';
```

Pothos resolves these lazily at schema build time, so import order doesn't matter.

## Desktop Integration (IPC)

The GraphQL IPC domain lives in `apps/desktop/src/ipc/graphql/`:

- **`contract.ts`** — defines `graphqlApi` (execute method) and `graphqlEvents` (cache invalidation events)
- **`handlers.ts`** — uses `graphql-js execute()` with document caching against the Pothos schema

The handler receives `AppDb` from `registerIpc()` and constructs a `GraphQLContext` for each request:

```ts
const context: GraphQLContext = { db, userId: null };
const result = await execute({
  schema,
  document,
  contextValue: context,
  variableValues: variables,
});
```

### Cache Invalidation Events

Two structured patterns for keeping the renderer cache consistent:

1. **`onInvalidate`** — broad invalidation (entity created/deleted, list may have changed)

   ```ts
   emitter.graphql.onInvalidate({ typename: 'Workstream' });
   // Renderer: evict from cache, refetch active queries
   ```

2. **`onCacheUpdate`** — granular field update (status change, counter bump)
   ```ts
   emitter.graphql.onCacheUpdate({
     typename: 'Workstream',
     id: ws.id,
     fields: { status: 'active' },
   });
   // Renderer: modify cache directly, no refetch
   ```

Use `invalidateEntity()` and `updateCachedEntity()` from `@vienna/graphql/client` to handle these events in the renderer.

## Testing

Tests use `graphql-js execute()` directly against the Pothos schema with an in-memory SQLite database:

```ts
import { execute, parse } from 'graphql';
import { schema } from './schema/index';
import { openAppDatabase, closeAppDatabase, createAppDb } from '@vienna/app-db';

const raw = openAppDatabase({ path: ':memory:' });
const db = createAppDb(raw, '/tmp/settings.json');
const context: GraphQLContext = { db, userId: null };

const result = await execute({
  schema,
  document: parse('{ projects { id name } }'),
  contextValue: context,
});
expect(result.data?.projects).toEqual([]);
```

### Vitest Configuration

This package requires `test.server.deps.inline: true` in `vitest.config.ts`. Without it, vitest's Vite transform pipeline loads the `graphql` module twice (once for Pothos, once for tests), causing `"Cannot use GraphQLSchema from another module or realm"` errors. Do NOT remove this setting.

## Commands

```bash
pnpm test:unit       # Run unit tests
pnpm typecheck       # Type check
pnpm schema:print    # Print schema as SDL (for inspection)
```
