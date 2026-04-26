# @vienna/app-db

SQLite persistence layer for app-level data (projects, workstreams, routines, and future domains).

## Architecture

This package follows the same patterns as `@vienna/agent-db`:

- **Zod schemas** in `src/schemas.ts` are the **source of truth** for all types
- **Repository classes** wrap prepared statements for each domain
- **Row mapping** converts SQLite snake_case columns to camelCase records via Zod `.parse()`
- **WAL mode** for concurrent read/write performance
- **Inline migrations** embedded in `src/database.ts` (no runtime fs lookups in packaged apps)
- **Foreign keys enforced** (`PRAGMA foreign_keys = ON`)

## Key Design Principles

- **Zod schemas define the types** — every TypeScript type is `z.infer<typeof Schema>`. The GraphQL layer (Pothos in `@vienna/graphql`) references these types as backing models. Change a Zod schema and TypeScript errors propagate through every layer.
- **Prepared statements** — repositories create all prepared statements in the constructor, not on each call. This is ~10x faster than ad-hoc queries.
- **Snake_case in SQLite, camelCase in TypeScript** — rows are mapped via Zod parse in each repository method. Never expose raw row objects outside the repository.
- **`:memory:` for tests** — tests use `openAppDatabase({ path: ':memory:' })` for fast, isolated test runs with zero cleanup.

## File Structure

```
src/
├── index.ts                    # Public API barrel + AppDb interface + createAppDb() factory
├── database.ts                 # SQLite setup, WAL pragma, inline migrations
├── schemas.ts                  # Zod schemas (source of truth for ALL types)
├── projects.ts                 # ProjectRepository (CRUD with prepared statements)
├── workstreams.ts              # WorkstreamRepository (CRUD, filtering, pin/archive, group membership)
├── workstream-groups.ts        # WorkstreamGroupRepository (groups of related workstreams)
├── group-linked-entities.ts    # GroupLinkedEntityRepository (entities linked at group level)
├── group-directories.ts        # GroupDirectoryRepository (directories shared at group level)
├── project-directories.ts      # ProjectDirectoryRepository
├── workstream-directories.ts   # WorkstreamDirectoryRepository
├── workstream-linked-entities.ts # WorkstreamLinkedEntityRepository
├── branch-selections.ts        # BranchSelectionRepository
├── routines.ts                 # RoutineRepository
├── registries.ts               # RegistryRepository
├── settings.ts                 # SettingsRepository (JSON file, not SQLite)
├── path-utils.ts               # Path normalization helpers
└── *.test.ts                   # Tests (in-memory SQLite)
```

## Public API

```ts
import {
  openAppDatabase, // Open/create SQLite DB, run migrations
  closeAppDatabase, // Close handle (call on app shutdown)
  createAppDb, // Factory: Database → AppDb (all repositories)
  ProjectRepository,
  WorkstreamRepository,
} from '@vienna/app-db';

// Types (all derived from Zod schemas)
import type {
  AppDb,
  ProjectRecord,
  CreateProjectInput,
  UpdateProjectInput,
  WorkstreamRecord,
  CreateWorkstreamInput,
  UpdateWorkstreamInput,
  WorkstreamStatus,
} from '@vienna/app-db';
```

## Adding a New Domain

1. **Add Zod schemas** to `src/schemas.ts` — define `FooRecordSchema`, `CreateFooInputSchema`, etc.
2. **Add migration SQL** to the `MIGRATIONS` array in `src/database.ts` — bump version number, add `CREATE TABLE` and indexes
3. **Create `src/<domain>.ts`** with a Repository class:
   - Constructor takes `Database`, creates prepared statements
   - Each method maps snake_case rows → Zod parse → camelCase records
   - Use `crypto.randomUUID()` for IDs, `Date.now()` for timestamps
4. **Export** from `src/index.ts` — schemas, types, and repository class
5. **Add to `AppDb` interface** and `createAppDb()` in `src/index.ts`
6. **Add tests** in `src/<domain>.test.ts` using `:memory:` database
7. **Update `@vienna/graphql`** — add backing model to builder `Objects`, create domain module

### Repository Pattern

```ts
export class FooRepository {
  private stmts: {
    getById: Statement;
    create: Statement;
    // ...
  };

  constructor(db: Database) {
    this.stmts = {
      getById: db.prepare('SELECT * FROM foos WHERE id = ?'),
      create: db.prepare('INSERT INTO foos (...) VALUES (...)'),
    };
  }

  getById(id: string): FooRecord | null {
    const row = this.stmts.getById.get(id) as Record<string, unknown> | undefined;
    return row
      ? FooRecordSchema.parse({
          /* snake_case → camelCase mapping */
        })
      : null;
  }
}
```

### Migration Pattern

```ts
// In src/database.ts, add to the MIGRATIONS array:
{
  version: 2,  // Increment from last version
  sql: `
    CREATE TABLE IF NOT EXISTS foos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_foos_name ON foos(name);
  `,
},
```

Migrations run automatically on `openAppDatabase()`. Each migration runs in a transaction. Already-applied migrations are tracked in `_migrations` table and skipped.

## Workstream Groups

Groups organize related workstreams under a named container (e.g., "Feature ABC" containing implementation, review, and testing workstreams).

### Data Model

```
Project → Group → Workstream   (grouped)
Project → Workstream           (ungrouped — groups are optional)
```

- A workstream belongs to at most one group (`workstreams.group_id`, nullable FK)
- Groups belong to a project (`workstream_groups.project_id`)
- Deleting a group sets `group_id = NULL` on its workstreams (ON DELETE SET NULL)
- Routines are never in groups

### Entity & Directory Inheritance

- **Group linked entities** (`workstream_group_linked_entities`) are automatically inherited by all workstreams in the group at the agent context level — no duplication in the DB
- **Group directories** (`workstream_group_directories`) cascade to member workstreams on add/remove. When a workstream is created into a group, `GroupDirectoryRepository.inheritToWorkstream()` copies the group's directories
- At agent context build time, `mergeLinkedEntities()` merges group + workstream entities (workstream-level takes precedence for same URI)

### Key Tables (Migration v6)

| Table | Purpose | FK behavior |
|---|---|---|
| `workstream_groups` | Named groups within a project | CASCADE on project delete |
| `workstreams.group_id` | Optional group membership | SET NULL on group delete |
| `workstream_group_linked_entities` | Entities linked at group level | CASCADE on group delete |
| `workstream_group_directories` | Directories shared at group level | CASCADE on group delete |

### Repositories

- `WorkstreamGroupRepository` — CRUD, pin/unpin, getByProject (pinned first)
- `GroupLinkedEntityRepository` — link/unlink entities, context override
- `GroupDirectoryRepository` — add/remove with cascade to member workstreams
- `WorkstreamRepository.getByGroup(groupId)` — list workstreams in a group
- `WorkstreamRepository.setGroup(id, groupId)` — move workstream to/from a group

## Desktop Integration

The database is initialized in `apps/desktop/src/main.ts`:

```ts
const appDbRaw = openAppDatabase({ path: path.join(paths.baseDir, 'app.db') });
const appDb = createAppDb(appDbRaw, path.join(paths.baseDir, 'settings.json'));
// Passed to IPC handlers via registerIpc(ipcMain, logger, { appDb })
// Closed on app quit: closeAppDatabase(appDbRaw)
// Settings stored in portable settings.json (VS Code–style, human-editable)
```

The `AppDb` instance is injected into GraphQL resolvers via the `GraphQLContext.db` field. Resolvers access repositories as `ctx.db.projects.getById(id)`.

## Commands

```bash
pnpm test:unit       # Run unit tests (in-memory SQLite)
pnpm test:coverage   # Run tests with coverage
pnpm typecheck       # Type check
pnpm lint            # Lint
pnpm format          # Format
```
