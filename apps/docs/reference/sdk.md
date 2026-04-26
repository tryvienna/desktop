---
outline: [2, 3]
---

# Plugin SDK Reference

Complete API reference for `@tryvienna/sdk` — the type-safe foundation for Vienna's plugin, integration, and entity system.

::: tip Auto-generated
This reference is generated from the `@tryvienna/sdk` source code.
Regenerate with `pnpm --filter @vienna/docs generate:reference`.
:::

## Installation

`@tryvienna/sdk` is a workspace package — import it directly in any Vienna plugin or package:

```typescript
// Main entry — definitions, URIs, types, registries
import { definePlugin, defineIntegration, defineEntity } from '@tryvienna/sdk';

// React hooks — renderer-only
import { useEntity, useEntities, usePluginQuery } from '@tryvienna/sdk/react';

// Codegen helper — build tooling only
import { createPluginCodegenConfig } from '@tryvienna/sdk/codegen';
```

Three entry points serve different contexts:

| Entry Point | Use | Process |
|-------------|-----|---------|
| `@tryvienna/sdk` | Definitions, types, URIs, registries | Any |
| `@tryvienna/sdk/react` | React hooks, providers, cache utils | Renderer only |
| `@tryvienna/sdk/codegen` | GraphQL codegen config factory | Build tooling |

---

## Definition Factories

The three `define*` factories are the primary API for plugins. Each validates its input, returns an immutable definition object, and provides URI helpers.

### defineEntity()

```typescript
function defineEntity(config: EntityDefinitionConfig): EntityDefinition
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `EntityDefinitionConfig` | Yes |  |

**Returns:** `EntityDefinition`

::: tip
`defineEntity()` validates the `type` against `EntityTypeSchema` (lowercase alphanumeric + underscore, 1-64 chars) and freezes the returned object.
:::

#### EntityDefinitionConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `string` | Yes | Entity type identifier (validated against EntityTypeSchema) |
| `name` | `string` | Yes | Human-readable display name |
| `icon` | `PluginIcon` | Yes | Static icon asset |
| `uri` | `string[]` | Yes | URI segment names (e.g., ['owner', 'repo', 'number']) |
| `description` | `string` | No | Description of what this entity represents |
| `source` | `EntitySource` | No | Where this entity comes from |
| `display` | `EntityDisplayMetadata` | No | Display metadata for automatic styling |
| `cache` | `EntityCacheConfig` | No | Cache configuration |
| `ui` | `{ drawer?: ComponentType&lt;EntityDrawerProps&gt;; card?: ComponentType&lt;EntityCardProps&gt;; }` | No | UI components (optional) |

#### EntityDefinition

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `__brand` | `'EntityDefinition'` | Yes |  |
| `type` | `string` | Yes |  |
| `name` | `string` | Yes |  |
| `icon` | `PluginIcon` | Yes |  |
| `uriSegments` | `readonly string[]` | Yes |  |
| `description` | `string` | No |  |
| `source` | `EntitySource` | Yes |  |
| `display` | `EntityDisplayMetadata` | No |  |
| `cache` | `EntityCacheConfig` | No |  |
| `ui` | `{ readonly drawer?: ComponentType&lt;EntityDrawerProps&gt;; readonly card?: ComponentType&lt;EntityCardProps&gt;; }` | No |  |

**Methods**

- `createURI(id: Record&lt;string, string&gt;): string` — Build a URI for this entity type
- `parseURI(uri: string): { type: string; id: Record&lt;string, string&gt; }` — Parse a URI and extract ID segments

#### EntityDrawerProps

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `uri` | `string` | Yes |  |
| `DrawerContainer` | `ComponentType&lt;DrawerContainerProps&gt;` | Yes | Container injected by the host app — wrap drawer content in this. |
| `headerActions` | `React.ReactNode` | No |  |
| `onNavigate` | `(entityUri: string, entityType: string, label?: string) =&gt; void` | No |  |
| `onClose` | `() =&gt; void` | No |  |
| `projectId` | `string` | No |  |

#### EntityCardProps

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `uri` | `string` | Yes |  |
| `label` | `string` | No |  |

#### DrawerContainerProps

Props for a DrawerContainer component injected by the host app.
Entity drawers use this to set title, footer, and header actions
without depending on the host's internal drawer chrome.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `React.ReactNode` | No |  |
| `headerActions` | `React.ReactNode` | No |  |
| `footer` | `React.ReactNode` | No |  |
| `children` | `React.ReactNode` | Yes |  |

**Example**

```typescript
import { defineEntity } from '@tryvienna/sdk';
import type { EntityDrawerProps, EntityCardProps } from '@tryvienna/sdk';

// Custom entity drawer component
function PRDrawer({ uri, DrawerContainer, onNavigate }: EntityDrawerProps) {
  const { entity, loading } = useEntity(uri);
  if (loading || !entity) return null;

  return (
    <DrawerContainer title={entity.title}>
      <PRDetailView uri={uri} />
    </DrawerContainer>
  );
}

// Custom entity card/chip component (inline preview)
function PRCard({ uri, label }: EntityCardProps) {
  return <span>{label ?? uri}</span>;
}

export const githubPrEntity = defineEntity({
  type: 'github_pr',
  name: 'GitHub Pull Request',
  icon: { svg: '<svg>...</svg>' },
  uri: ['owner', 'repo', 'number'],
  display: {
    emoji: '🔀',
    colors: { bg: '#dafbe1', text: '#116329', border: '#aceebb' },
  },
  cache: { ttl: 30_000, maxSize: 200 },

  // UI overrides — custom rendering when this entity appears in the app
  ui: {
    drawer: PRDrawer,  // Shown when user clicks to expand this entity
    card: PRCard,      // Inline chip/card shown in lists and references
  },
});

// Build a URI
const uri = githubPrEntity.createURI({
  owner: 'anthropics', repo: 'sdk', number: '42',
});
// => '@vienna//github_pr/anthropics/sdk/42'

// Parse a URI
const { type, id } = githubPrEntity.parseURI(uri);
// => { type: 'github_pr', id: { owner: 'anthropics', repo: 'sdk', number: '42' } }
```

---

### defineIntegration()

```typescript
function defineIntegration<TClient>(
  config: IntegrationConfig<TClient>,
): IntegrationDefinition<TClient>
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `IntegrationConfig&lt;TClient&gt;` | Yes |  |

**Returns:** `IntegrationDefinition&lt;TClient&gt;`

#### IntegrationConfig&lt;TClient&gt;

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique integration ID (e.g., 'github', 'linear') |
| `name` | `string` | Yes | Human-readable display name |
| `icon` | `PluginIcon` | Yes | Static icon asset |
| `description` | `string` | No | Description of what this integration provides |
| `oauth` | `OAuthConfig` | No | OAuth configuration for external authentication |
| `credentials` | `string[]` | No | Keys stored in secure storage (e.g., ['api_key', 'personal_access_token']) |
| `createClient` | `(ctx: AuthContext) =&gt; Promise&lt;TClient \| null&gt;` | Yes | Create an API client from auth context. Returns null if auth not configured. |
| `schema` | `(builder: SchemaBuilder) =&gt; void` | No | Optional GraphQL schema extension. Called with the typed SchemaBuilder. |

#### IntegrationDefinition&lt;_TClient = unknown&gt;

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `__brand` | `'IntegrationDefinition'` | Yes |  |
| `id` | `string` | Yes |  |
| `name` | `string` | Yes |  |
| `icon` | `PluginIcon` | Yes |  |
| `description` | `string` | No |  |
| `oauth` | `OAuthConfig` | No |  |
| `credentials` | `readonly string[]` | No |  |
| `createClient` | `(ctx: AuthContext) =&gt; Promise&lt;_TClient \| null&gt;` | Yes |  |
| `schema` | `(builder: SchemaBuilder) =&gt; void` | No |  |

**Example**

```typescript
import { defineIntegration } from '@tryvienna/sdk';
import type { SchemaBuilder } from '@tryvienna/sdk';

interface GitHubClient {
  getPR(owner: string, repo: string, number: number): Promise<PRData>;
}

export const githubIntegration = defineIntegration<GitHubClient>({
  id: 'github',
  name: 'GitHub',
  icon: { svg: '<svg>...</svg>' },
  oauth: {
    providers: [{
      providerId: 'github',
      displayName: 'GitHub',
      flow: {
        grantType: 'authorization_code',
        clientId: 'your-client-id',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['repo', 'read:user'],
      },
    }],
  },
  createClient: async (ctx) => {
    const token = await ctx.oauth?.getAccessToken('github');
    if (!token) return null;
    return new GitHubClient(token);
  },
  schema: (builder) => registerGitHubSchema(builder),
});
```

---

### definePlugin()

```typescript
function definePlugin(config: PluginConfig): PluginDefinition
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `PluginConfig` | Yes |  |

**Returns:** `PluginDefinition`

#### PluginConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique plugin identifier (lowercase alphanumeric + underscores) |
| `name` | `string` | Yes | Human-readable display name |
| `icon` | `PluginIcon` | Yes | Static icon asset |
| `description` | `string` | No | Description of what this plugin does |
| `integrations` | `IntegrationDefinition&lt;any&gt;[]` | No | Integration definitions provided by this plugin |
| `entities` | `EntityDefinition[]` | No | Entity definitions provided by this plugin |
| `canvases` | `PluginCanvases` | No | UI canvas contributions |
| `allowedDomains` | `string[]` | No | Domains the plugin is allowed to fetch via `hostApi.fetch()`.
Only exact hostname matches are permitted (e.g. `"api.open-meteo.com"`). |

#### PluginDefinition

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `__brand` | `'PluginDefinition'` | Yes |  |
| `id` | `string` | Yes |  |
| `name` | `string` | Yes |  |
| `icon` | `PluginIcon` | Yes |  |
| `description` | `string` | No |  |
| `integrations` | `readonly IntegrationDefinition&lt;any&gt;[]` | Yes |  |
| `entities` | `readonly EntityDefinition[]` | Yes |  |
| `canvases` | `Readonly&lt;PluginCanvases&gt;` | Yes |  |
| `allowedDomains` | `readonly string[]` | Yes |  |

**Example**

```typescript
import { definePlugin } from '@tryvienna/sdk';

export const githubPlugin = definePlugin({
  id: 'github',
  name: 'GitHub',
  icon: { svg: '<svg>...</svg>' },
  integrations: [githubIntegration],
  entities: [githubPrEntity, githubIssueEntity],
  canvases: {
    'nav-sidebar': {
      component: GitHubSidebar,
      label: 'GitHub',
      icon: '🐙',
      priority: 80,
    },
    drawer: {
      component: GitHubDrawer,
      label: 'GitHub Settings',
    },
  },
  allowedDomains: ['api.github.com'],
});
```

### Type Guards

```typescript
function isEntityDefinition(value: unknown): value is EntityDefinition
function isIntegrationDefinition(value: unknown): value is IntegrationDefinition
function isPluginDefinition(value: unknown): value is PluginDefinition
```

Runtime type checks using the `__brand` discriminator on each definition type.

---

## URI Utilities

Entity URIs follow the pattern `@vienna//<type>/<segment1>/<segment2>/...` with optional labels appended as `?label=<base64>`.

```
@vienna//project/abc123
@vienna//github_pr/owner/repo/42
@vienna//project/abc123?label=TXkgUHJvamVjdA==
```

### ENTITY_URI_SCHEME

```typescript
const ENTITY_URI_SCHEME = '@vienna//'
```

The URI scheme prefix. All entity URIs start with this string.

### buildEntityURI()

Build an entity URI from type, ID parts, and URI path config.
```ts
buildEntityURI('project', { id: 'abc' }, { segments: ['id'] })
// => '@vienna//project/abc'
```

```typescript
function buildEntityURI(
  type: string,
  id: Record<string, string>,
  uriPath: EntityURIPath
): string
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `string` | Yes |  |
| `id` | `Record&lt;string, string&gt;` | Yes |  |
| `uriPath` | `EntityURIPath` | Yes |  |

**Returns:** `string`

```ts
buildEntityURI('project', { id: 'abc' }, { segments: ['id'] })
// => '@vienna//project/abc'
```

### buildEntityURIWithLabel()

Build an entity URI with an optional display label.
The label is base64-encoded and appended as a query parameter.

```typescript
function buildEntityURIWithLabel(
  type: string,
  id: Record<string, string>,
  uriPath: EntityURIPath,
  label?: string
): string
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `string` | Yes |  |
| `id` | `Record&lt;string, string&gt;` | Yes |  |
| `uriPath` | `EntityURIPath` | Yes |  |
| `label` | `string` | No |  |

**Returns:** `string`

### parseEntityURI()

Parse an entity URI and extract the type and path segments.
If `uriPath` is provided, segments are mapped to named keys.
Otherwise, segments are keyed by index ('0', '1', ...).

```typescript
function parseEntityURI(
  uri: string,
  uriPath?: EntityURIPath
): { type: string; id: Record<string, string> }
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uri` | `string` | Yes |  |
| `uriPath` | `EntityURIPath` | No |  |

**Returns:** `{ type: string; id: Record&lt;string, string&gt; }`

### parseEntityURIWithLabel()

Parse an entity URI and also extract the display label if present.

```typescript
function parseEntityURIWithLabel(
  uri: string,
  uriPath?: EntityURIPath
): { type: string; id: Record<string, string>; label?: string }
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uri` | `string` | Yes |  |
| `uriPath` | `EntityURIPath` | No |  |

**Returns:** `{ type: string; id: Record&lt;string, string&gt;; label?: string }`

### getEntityTypeFromURI()

Extract just the entity type from a URI without full parsing.

```typescript
function getEntityTypeFromURI(uri: string): string
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uri` | `string` | Yes |  |

**Returns:** `string`

### isEntityURI()

Check whether a string is a valid entity URI (non-throwing).

```typescript
function isEntityURI(uri: string): boolean
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uri` | `string` | Yes |  |

**Returns:** `boolean`

### extractLabel()

```typescript
function extractLabel(uri: string): string | undefined
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uri` | `string` | Yes |  |

**Returns:** `string \| undefined`

### compareEntityURIs()

Compare two entity URIs for equality, ignoring labels.

```typescript
function compareEntityURIs(uri1: string, uri2: string): boolean
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uri1` | `string` | Yes |  |
| `uri2` | `string` | Yes |  |

**Returns:** `boolean`

**Usage example**

```typescript
import {
  buildEntityURI,
  parseEntityURI,
  isEntityURI,
  compareEntityURIs,
  ENTITY_URI_SCHEME,
} from '@tryvienna/sdk';

// Build
const uri = buildEntityURI('github_pr', { owner: 'acme', repo: 'app', number: '7' }, {
  segments: ['owner', 'repo', 'number'],
});
// => '@vienna//github_pr/acme/app/7'

// Parse
const { type, id } = parseEntityURI(uri, { segments: ['owner', 'repo', 'number'] });
// => { type: 'github_pr', id: { owner: 'acme', repo: 'app', number: '7' } }

// Validate
isEntityURI('@vienna//project/abc');  // true
isEntityURI('not-a-uri');            // false

// Compare (ignores labels)
compareEntityURIs(
  '@vienna//project/abc?label=Zm9v',
  '@vienna//project/abc',
); // true
```

---

## React Hooks

Import from `@tryvienna/sdk/react` (or re-exported from the root). These hooks read the Apollo client from `<PluginDataProvider>` — plugins never import Apollo directly.

### useEntity()

```typescript
function useEntity(uri: string, options: UseEntityOptions = {}): UseEntityResult
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uri` | `string` | Yes |  |
| `options` | `UseEntityOptions` | No |  |

**Returns:** `UseEntityResult`

#### UseEntityOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `fetchPolicy` | `WatchQueryFetchPolicy` | No |  |
| `pollInterval` | `number` | No |  |
| `skip` | `boolean` | No |  |

#### UseEntityResult

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `entity` | `BaseEntity \| null` | Yes |  |
| `loading` | `boolean` | Yes |  |
| `error` | `Error \| undefined` | Yes |  |
| `refetch` | `() =&gt; Promise&lt;unknown&gt;` | Yes |  |

```tsx
import { useEntity } from '@tryvienna/sdk/react';

function PRDetail({ uri }: { uri: string }) {
  const { entity, loading, error, refetch } = useEntity(uri);

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!entity) return <NotFound />;

  return <div>{entity.title}</div>;
}
```

### useEntities()

```typescript
function useEntities(options: UseEntitiesOptions): UseEntitiesResult
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options` | `UseEntitiesOptions` | Yes |  |

**Returns:** `UseEntitiesResult`

#### UseEntitiesOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `string` | Yes |  |
| `query` | `string` | No |  |
| `filters` | `Record&lt;string, unknown&gt;` | No |  |
| `limit` | `number` | No |  |
| `fetchPolicy` | `WatchQueryFetchPolicy` | No |  |
| `pollInterval` | `number` | No |  |
| `skip` | `boolean` | No |  |

#### UseEntitiesResult

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `entities` | `BaseEntity[]` | Yes |  |
| `loading` | `boolean` | Yes |  |
| `error` | `Error \| undefined` | Yes |  |

```tsx
import { useEntities } from '@tryvienna/sdk/react';

function InboxList() {
  const { entities, loading } = useEntities({
    type: 'google_gmail_thread',
    query: 'in:inbox',
    limit: 20,
    pollInterval: 30_000,
  });

  return (
    <ul>
      {entities.map((e) => (
        <li key={e.uri}>{e.title}</li>
      ))}
    </ul>
  );
}
```

### usePluginQuery()

Run custom GraphQL queries through the plugin data context. Supports full type inference with `TypedDocumentNode` from codegen.

```typescript
// With TypedDocumentNode (codegen) — types inferred automatically
function usePluginQuery<TData, TVariables>(
  query: TypedDocumentNode<TData, TVariables>,
  options?: Omit<QueryHookOptions<TData, TVariables>, "client">,
): QueryResult<TData, TVariables>

// With plain DocumentNode — pass type parameters manually
function usePluginQuery<TData, TVariables>(
  query: DocumentNode,
  options?: Omit<QueryHookOptions<TData, TVariables>, "client">,
): QueryResult<TData, TVariables>
```

```tsx
// With codegen — fully typed, no manual generics
import { usePluginQuery } from '@tryvienna/sdk/react';
import { GET_GITHUB_ISSUE } from '../client/operations';

const { data } = usePluginQuery(GET_GITHUB_ISSUE, {
  variables: { owner: 'foo', repo: 'bar', issueNumber: 1 },
});
// data?.githubIssue is fully typed

// Without codegen — manual type parameters
import { usePluginQuery, gql } from '@tryvienna/sdk/react';

const GET_REPOS = gql\`query { repos { name } }\`;
const { data } = usePluginQuery<{ repos: { name: string }[] }>(GET_REPOS);
```

### usePluginMutation()

Run custom GraphQL mutations. Same overload pattern as `usePluginQuery`.

```typescript
// With TypedDocumentNode (codegen) — types inferred automatically
function usePluginMutation<TData, TVariables>(
  mutation: TypedDocumentNode<TData, TVariables>,
  options?: Omit<MutationHookOptions<TData, TVariables>, "client">,
): MutationTuple<TData, TVariables>

// With plain DocumentNode — pass type parameters manually
function usePluginMutation<TData, TVariables>(
  mutation: DocumentNode,
  options?: Omit<MutationHookOptions<TData, TVariables>, "client">,
): MutationTuple<TData, TVariables>
```

```tsx
import { usePluginMutation } from '@tryvienna/sdk/react';
import { MERGE_PR } from '../client/operations';

function MergeButton({ uri }: { uri: string }) {
  const [mergePR, { loading }] = usePluginMutation(MERGE_PR);

  return (
    <button onClick={() => mergePR({ variables: { uri } })} disabled={loading}>
      Merge
    </button>
  );
}
```

### usePluginClient()

Access the raw Apollo client from the plugin data context.

```typescript
function usePluginClient(): ApolloClient<any>
```

::: warning
Must be used within a `<PluginDataProvider>`. Throws if no provider is found.
:::

### useHostApi()

Access the host API for credential management, OAuth flows, and proxied fetch.

```typescript
function useHostApi(): PluginHostApi
```

See [PluginHostApi](#pluginhostapi) for the full interface.

### useActiveWorkstreamId()

Returns the ID of the workstream the plugin is currently running inside, or `null` if there is no active workstream context.

```typescript
function useActiveWorkstreamId(): string | null
```

::: warning
Must be used within a `<PluginDataProvider>`. Throws if no provider is found.
:::

### useWorkstream()

Convenience hook for interacting with a workstream. Currently exposes `sendMessage()` to send a text message (auto-starts the agent if needed).

```typescript
function useWorkstream(workstreamId: string | null): UseWorkstreamResult
```

#### UseWorkstreamResult

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string \| null` | The workstream ID passed to the hook, or `null`. |
| `sendMessage` | `(text: string) => Promise<void>` | Send a text message to the workstream. Throws if no ID was provided. |

```typescript
import { useActiveWorkstreamId, useWorkstream } from '@tryvienna/sdk/react';

const workstreamId = useActiveWorkstreamId();
const workstream = useWorkstream(workstreamId);

await workstream.sendMessage('Summarize today\'s activity');
```

### invalidateEntity()

Evict a cached entity and refetch all active queries.

```typescript
function invalidateEntity(
  client: ApolloClient<any>,
  typename: string,
  id?: string,
  keyFields?: Record<string, string>,
): void
```

```typescript
import { usePluginClient, invalidateEntity } from '@tryvienna/sdk/react';

const client = usePluginClient();
// Invalidate by URI (Entity type uses 'uri' as keyField)
invalidateEntity(client, 'Entity', undefined, { uri });
```

### updateCachedEntity()

Update specific fields on a cached entity without a network request.

```typescript
function updateCachedEntity(
  client: ApolloClient<any>,
  typename: string,
  id: string,
  fields: Record<string, unknown>,
  keyFields?: Record<string, string>,
): void
```

```typescript
import { usePluginClient, updateCachedEntity } from '@tryvienna/sdk/react';

const client = usePluginClient();
// Optimistically update a cached entity's title
updateCachedEntity(client, 'GitHubPR', 'pr-123', {
  state: 'merged',
  title: 'Updated title',
});
```

### PluginDataProvider

Host app wraps plugin components with this provider to inject the Apollo client and host API. Plugins never use this directly.

```tsx
// Host app usage:
import { PluginDataProvider } from '@tryvienna/sdk/react';

<PluginDataProvider client={apolloClient} hostApi={hostApi}>
  {pluginContent}
</PluginDataProvider>
```

### gql

Re-exported from `graphql-tag` for convenience. Use to write inline GraphQL operations.

```typescript
import { gql } from '@tryvienna/sdk/react';

const GET_REPOS = gql`
  query GetRepos {
    repos { name url }
  }
`;
```

### useTheme()

```typescript
function useTheme(): ThemeInfo
```

Returns the current resolved theme. Re-renders when the theme changes.

**Returns:** `ThemeInfo`

| Property | Type | Description |
|----------|------|-------------|
| `resolvedTheme` | `'dark' \| 'light'` | The resolved theme — never `'system'` |

```tsx
import { useTheme } from '@tryvienna/sdk/react';

function MyComponent() {
  const { resolvedTheme } = useTheme();

  return (
    <div style={{ background: resolvedTheme === 'dark' ? '#1a1a1a' : '#ffffff' }}>
      Current theme: {resolvedTheme}
    </div>
  );
}
```

---

## Core Types

### BaseEntity

The minimal entity shape returned by all entity queries. Every entity in the system satisfies this interface.

```typescript
interface BaseEntity {
  id: string;
  type: string;
  uri: string;
  title: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
  metadata?: Record<string, unknown>;
}
```

### PluginIcon

Static icon asset for plugins, integrations, and entities.

```typescript
type PluginIcon =
  | { svg: string }    // Inline SVG markup
  | { png: string }    // Base64-encoded PNG
  | { path: string }   // Relative path to icon file
```

### SecureStorage

Scoped secure storage interface for integrations.
Provides encrypted key-value storage scoped to a specific integration.
Structurally identical to ScopedStorage from @vienna/secure-storage.

**Methods**

- `get(key: string): Promise&lt;string | null&gt;` — *No description*
- `set(key: string, value: string): Promise&lt;void&gt;` — *No description*
- `delete(key: string): Promise&lt;void&gt;` — *No description*
- `has(key: string): Promise&lt;boolean&gt;` — *No description*

### PluginLogger

Structured logger interface provided to integrations and entities at runtime.
Every plugin gets a logger pre-scoped with `{ plugin: pluginId }`.
Integration and entity handlers get further scoped loggers
(e.g., `{ plugin: 'github', integration: 'github' }` or
`{ plugin: 'github', entity: 'github_pr' }`).
Call `child()` to create sub-loggers with additional bindings.

**Methods**

- `debug(msg: string, ctx?: Record&lt;string, unknown&gt;): void` — *No description*
- `info(msg: string, ctx?: Record&lt;string, unknown&gt;): void` — *No description*
- `warn(msg: string, ctx?: Record&lt;string, unknown&gt;): void` — *No description*
- `error(msg: string, ctx?: Record&lt;string, unknown&gt;): void` — *No description*
- `child(bindings: Record&lt;string, unknown&gt;): PluginLogger` — Create a child logger with additional bindings merged into every log entry.

### AuthContext

Context injected into integration's createClient and method handlers.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `storage` | `SecureStorage` | Yes |  |
| `logger` | `PluginLogger` | Yes |  |
| `oauth` | `OAuthAccessor` | No |  |

### EntityContext&lt;TIntegrations&gt;

Context provided to entity resolve/search/action handlers. Integration clients are pre-resolved and typed via the integrations map.

```typescript
type EntityContext<TIntegrations> = {
  storage: SecureStorage;
  logger: PluginLogger;
  integrations: {
    [K in keyof TIntegrations]: IntegrationAccessor<ClientOf<TIntegrations[K]>>;
  };
}
```

### IntegrationAccessor&lt;TClient = unknown&gt;

Accessor for a single integration's client and methods within an entity context.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `client` | `TClient \| null` | Yes |  |

### SearchQuery

Search query passed to entity search handlers.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `query` | `string` | No |  |
| `limit` | `number` | No |  |
| `offset` | `number` | No |  |
| `filters` | `Record&lt;string, unknown&gt;` | No |  |

### ClientOf&lt;T&gt;

Infer the client type from an `IntegrationDefinition`.

```typescript
type ClientOf<T> = T extends IntegrationDefinition<infer C> ? C : never
```

### OAuth Types

#### OAuthConfig

OAuth configuration for an integration.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `providers` | `OAuthProviderConfig[]` | Yes |  |

#### OAuthProviderConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `providerId` | `string` | Yes |  |
| `displayName` | `string` | Yes |  |
| `icon` | `string` | No |  |
| `flow` | `OAuthFlowConfig` | Yes |  |
| `refreshBufferSeconds` | `number` | No |  |
| `required` | `boolean` | No |  |

#### OAuthFlowConfig

Union of the three supported grant types:

```typescript
type OAuthFlowConfig =
  | OAuthAuthorizationCodeConfig
  | OAuthDeviceCodeConfig
  | OAuthManualCodeConfig
```

#### OAuthAuthorizationCodeConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `grantType` | `'authorization_code'` | Yes |  |
| `clientId` | `string` | Yes |  |
| `clientSecret` | `string` | No |  |
| `clientIdKey` | `string` | No |  |
| `clientSecretKey` | `string` | No |  |
| `authorizationUrl` | `string` | Yes |  |
| `tokenUrl` | `string` | Yes |  |
| `scopes` | `string[]` | Yes |  |
| `pkce` | `{ enabled: boolean; method?: 'S256' \| 'plain' }` | No |  |
| `extraAuthParams` | `Record&lt;string, string&gt;` | No |  |
| `refreshUrl` | `string` | No |  |
| `redirectPath` | `string` | No |  |
| `redirectPort` | `number` | No |  |
| `scopeSeparator` | `string` | No |  |

#### OAuthDeviceCodeConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `grantType` | `'device_code'` | Yes |  |
| `clientId` | `string` | Yes |  |
| `clientSecret` | `string` | No |  |
| `clientIdKey` | `string` | No |  |
| `clientSecretKey` | `string` | No |  |
| `deviceAuthorizationUrl` | `string` | Yes |  |
| `tokenUrl` | `string` | Yes |  |
| `scopes` | `string[]` | Yes |  |
| `pollingInterval` | `number` | No |  |
| `refreshUrl` | `string` | No |  |

#### OAuthManualCodeConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `grantType` | `'manual_code'` | Yes |  |
| `clientId` | `string` | Yes |  |
| `clientSecret` | `string` | No |  |
| `clientIdKey` | `string` | No |  |
| `clientSecretKey` | `string` | No |  |
| `authorizationUrl` | `string` | Yes |  |
| `tokenUrl` | `string` | Yes |  |
| `scopes` | `string[]` | Yes |  |
| `instructions` | `string` | Yes |  |
| `refreshUrl` | `string` | No |  |

#### OAuthTokenData

Token data stored after successful OAuth flow.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `accessToken` | `string` | Yes |  |
| `refreshToken` | `string` | No |  |
| `expiresAt` | `number` | No |  |
| `scopes` | `string[]` | No |  |
| `tokenType` | `string` | No |  |
| `obtainedAt` | `number` | No |  |
| `extra` | `Record&lt;string, unknown&gt;` | No |  |

#### OAuthAccessor

OAuth accessor provided to integration's createClient.

**Methods**

- `getAccessToken(providerId: string): Promise&lt;string | null&gt;` — *No description*
- `getTokenData(providerId: string): Promise&lt;OAuthTokenData | null&gt;` — *No description*
- `isAuthenticated(providerId: string): Promise&lt;boolean&gt;` — *No description*

### EntitySource

```typescript
type EntitySource = 'builtin' | 'integration'
```

### EntityDisplayMetadata

Display metadata for automatic entity styling in the UI.

```typescript
interface EntityDisplayMetadata {
  emoji: string;
  colors: EntityDisplayColors;
  description?: string;
  filterDescriptions?: FilterDescription[];
  outputFields?: OutputField[];
}

interface EntityDisplayColors {
  bg: string;    // Background CSS color
  text: string;  // Text CSS color
  border: string; // Border CSS color
}

interface FilterDescription {
  name: string;
  type: string;
  description: string;
}

interface OutputField {
  key: string;
  label: string;
  metadataPath: string;
  format?: string;
}
```

---

## Canvas Types

Plugins contribute UI to four canvas slots. Each canvas type has a config interface (what plugins provide) and a props interface (what the host injects at render time).

### CanvasType

```typescript
type CanvasType = 'nav-sidebar' | 'drawer' | 'menu-bar' | 'feed'
```

### CanvasLogger

A stripped-down logger for canvas components. Same as `PluginLogger` but without `child()`.

```typescript
type CanvasLogger = Omit<PluginLogger, 'child'>
```

### PluginHostApi

**Methods**

- `getCredentialStatus(integrationId: string): Promise&lt;CredentialStatusEntry[]&gt;` — Check which credentials are configured for an integration.
- `setCredential(integrationId: string, key: string, value: string): Promise&lt;void&gt;` — Set a credential for an integration (stored in OS-level encrypted storage).
- `removeCredential(integrationId: string, key: string): Promise&lt;void&gt;` — Remove a credential for an integration.
- `startOAuthFlow(integrationId: string, providerId: string): Promise&lt;{ success: boolean; error?: string }&gt;` — Start an OAuth authorization flow (opens browser for user to authorize).
- `getOAuthStatus(integrationId: string): Promise&lt;OAuthProviderStatusEntry[]&gt;` — Get OAuth provider status for an integration.
- `revokeOAuthToken(integrationId: string, providerId: string): Promise&lt;{ success: boolean }&gt;` — Revoke an OAuth token for a provider.
- `fetch(url: string, options?: PluginFetchOptions): Promise&lt;PluginFetchResult&gt;` — Fetch an external URL via the main process (bypasses renderer CSP).
Only domains declared in the plugin's `allowedDomains` are permitted.

#### CredentialStatusEntry

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | `string` | Yes |  |
| `isSet` | `boolean` | Yes |  |

#### OAuthProviderStatusEntry

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `providerId` | `string` | Yes |  |
| `displayName` | `string` | No |  |
| `connected` | `boolean` | Yes |  |
| `expiresAt` | `number` | No |  |
| `scopes` | `string[]` | No |  |
| `flowStatus` | `string` | No |  |
| `required` | `boolean` | No |  |

```tsx
import { useHostApi } from '@tryvienna/sdk/react';

function GitHubSettings({ integrationId }: { integrationId: string }) {
  const hostApi = useHostApi();

  const handleConnect = async () => {
    const result = await hostApi.startOAuthFlow(integrationId, 'github');
    if (!result.success) console.error(result.error);
  };

  const handleSetToken = async (token: string) => {
    await hostApi.setCredential(integrationId, 'personal_access_token', token);
  };

  return <button onClick={handleConnect}>Connect GitHub</button>;
}
```

### Nav Sidebar

#### NavSidebarCanvasConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `component` | `ComponentType&lt;NavSidebarCanvasProps&gt;` | Yes |  |
| `label` | `string` | Yes |  |
| `icon` | `string` | No |  |
| `priority` | `number` | No |  |

#### NavSidebarCanvasProps&lt;TPayload extends Record&lt;string, unknown&gt; = Record&lt;string, unknown&gt;&gt;

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `pluginId` | `string` | Yes |  |
| `openPluginDrawer` | `(payload: TPayload) =&gt; void` | Yes |  |
| `openEntityDrawer` | `(uri: string) =&gt; void` | Yes |  |
| `hostApi` | `PluginHostApi` | Yes |  |
| `logger` | `CanvasLogger` | Yes |  |

```tsx
// Nav sidebar component — renders in the left sidebar
function GitHubSidebar({ pluginId, openEntityDrawer, hostApi, logger }: NavSidebarCanvasProps) {
  const { entities, loading } = useEntities({ type: 'github_pr', limit: 10 });

  return (
    <div>
      {entities.map((pr) => (
        <button key={pr.uri} onClick={() => openEntityDrawer(pr.uri)}>
          {pr.title}
        </button>
      ))}
    </div>
  );
}
```

### Drawer

#### DrawerCanvasConfig&lt;TPayload extends Record&lt;string, unknown&gt; = Record&lt;string, unknown&gt;&gt;

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `component` | `ComponentType&lt;PluginDrawerCanvasProps&lt;TPayload&gt;&gt;` | Yes |  |
| `footer` | `ComponentType&lt;PluginDrawerCanvasProps&lt;TPayload&gt;&gt;` | No | Optional footer component rendered pinned at the bottom of the drawer (outside scroll). |
| `label` | `string` | Yes |  |
| `icon` | `string` | No |  |

#### PluginDrawerCanvasProps&lt;TPayload extends Record&lt;string, unknown&gt; = Record&lt;string, unknown&gt;&gt;

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `pluginId` | `string` | Yes |  |
| `payload` | `TPayload` | Yes |  |
| `drawer` | `PluginDrawerActions` | Yes |  |
| `openEntityDrawer` | `(uri: string) =&gt; void` | Yes |  |
| `hostApi` | `PluginHostApi` | Yes |  |
| `logger` | `CanvasLogger` | Yes |  |

#### PluginDrawerActions&lt;TPayload extends Record&lt;string, unknown&gt; = Record&lt;string, unknown&gt;&gt;

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `close` | `() =&gt; void` | Yes |  |
| `open` | `(payload: TPayload) =&gt; void` | Yes |  |
| `push` | `(payload: TPayload) =&gt; void` | Yes |  |
| `pop` | `() =&gt; void` | Yes |  |
| `canPop` | `boolean` | Yes |  |

```tsx
// Drawer component — plugin-level settings/detail panel
function GitHubDrawer({ pluginId, payload, drawer, hostApi }: PluginDrawerCanvasProps) {
  return (
    <div>
      <h2>GitHub Settings</h2>
      <button onClick={() => drawer.push({ view: 'tokens' })}>
        Manage Tokens
      </button>
      {drawer.canPop && (
        <button onClick={drawer.pop}>Back</button>
      )}
    </div>
  );
}
```

### Menu Bar

#### MenuBarCanvasConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `icon` | `ComponentType&lt;MenuBarIconProps&gt;` | Yes |  |
| `component` | `ComponentType&lt;MenuBarCanvasProps&gt;` | Yes |  |
| `label` | `string` | Yes |  |
| `priority` | `number` | No |  |

#### MenuBarCanvasProps&lt;TPayload extends Record&lt;string, unknown&gt; = Record&lt;string, unknown&gt;&gt;

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `pluginId` | `string` | Yes |  |
| `onClose` | `() =&gt; void` | Yes |  |
| `openPluginDrawer` | `(payload: TPayload) =&gt; void` | Yes |  |
| `hostApi` | `PluginHostApi` | Yes |  |
| `logger` | `CanvasLogger` | Yes |  |

#### MenuBarIconProps

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `pluginId` | `string` | Yes |  |
| `hostApi` | `PluginHostApi` | Yes |  |
| `logger` | `CanvasLogger` | Yes |  |

```tsx
// Menu bar icon — renders in the top-right icon bar
function WeatherIcon({ pluginId }: MenuBarIconProps) {
  return <span>🌤</span>;
}

// Menu bar popover — shown when the icon is clicked
function WeatherPopover({ pluginId, onClose }: MenuBarCanvasProps) {
  return (
    <div>
      <h3>Weather</h3>
      <p>72°F — Sunny</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### Feed Canvas {#feed-canvas}

#### FeedCanvasConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `component` | `ComponentType<FeedCanvasProps>` | Yes | React component rendered on the home feed. |
| `label` | `string` | Yes | Human-readable name (used as component key in AI catalog and `feed.md` references). |
| `description` | `string` | No | Optional description hint for the AI (when to use this component). |
| `priority` | `number` | No | Ordering priority in the catalog (higher = first, default 50). |

#### FeedCanvasProps

| Property | Type | Description |
|----------|------|-------------|
| `pluginId` | `string` | The plugin's registered ID. |
| `data` | `Record<string, unknown>` | Props passed from `feed.md` query params or AI-generated spec data. |
| `hostApi` | `PluginHostApi` | Host API for credential management, OAuth, and proxied fetch. |
| `logger` | `CanvasLogger` | Logger scoped to this canvas. |
| `onNavigate` | `(uri: string) => void` | Navigate to a `@vienna//` entity URI or external URL. Optional. |

::: tip
Feed canvases do **not** receive `openPluginDrawer`. To direct users to configure the plugin, show inline instructions pointing them to the sidebar settings drawer.
:::

```tsx
// Feed canvas — renders as a card on the home feed
function LinearFeed({ hostApi, data, onNavigate }: FeedCanvasProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    hostApi.getCredentialStatus('linear').then((creds) => {
      setIsAuthenticated(creds.some((c) => c.isSet));
    });
  }, [hostApi]);

  if (isAuthenticated === false) {
    return <div>Connect Linear in the sidebar settings to see issues here.</div>;
  }

  return <div>Your Linear issues...</div>;
}
```

### PluginCanvases

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `'nav-sidebar'` | `NavSidebarCanvasConfig` | No |  |
| `drawer` | `DrawerCanvasConfig` | No |  |
| `'menu-bar'` | `MenuBarCanvasConfig` | No |  |
| `feed` | `FeedCanvasConfig` | No |  |

### PluginFetchOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `method` | `string` | No |  |
| `headers` | `Record&lt;string, string&gt;` | No |  |
| `body` | `string` | No |  |

### PluginFetchResult

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `ok` | `boolean` | Yes |  |
| `status` | `number` | Yes |  |
| `statusText` | `string` | Yes |  |
| `headers` | `Record&lt;string, string&gt;` | Yes |  |
| `body` | `string` | Yes |  |

```tsx
// Fetch external API via the host (bypasses renderer CSP)
const hostApi = useHostApi();
const result = await hostApi.fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-74.0', {
  method: 'GET',
  headers: { 'Accept': 'application/json' },
});
if (result.ok) {
  const data = JSON.parse(result.body);
}
```

---

## Schema Builder

The `SchemaBuilder` interface provides a typed subset of the Pothos API for plugins to extend the GraphQL schema. Plugins receive it in their integration's `schema` callback — no direct Pothos dependency needed.

### SchemaBuilder

Typed subset of the Pothos SchemaBuilder API for plugin schema extensions.
Plugins import this type from @tryvienna/sdk and use it in their
`schema: (builder: SchemaBuilder) => void` callbacks. The real Pothos
builder is a superset that satisfies this interface.

**Methods**

- `objectRef&lt;Shape = unknown&gt;(name: string): ObjectRef&lt;Shape&gt;` — Create a named reference to an object type (for use before type definition).
- `objectType&lt;Shape&gt;( ref: ObjectRef&lt;Shape&gt;, config: { description?: string; fields: (t: ObjectFieldBuilder) =&gt; Record&lt;string, unknown&gt;; }, ): void` — Register an object type with its fields.
- `queryFields( fields: (t: RootFieldBuilder) =&gt; Record&lt;string, unknown&gt;, ): void` — Register query fields.
- `mutationFields( fields: (t: RootFieldBuilder) =&gt; Record&lt;string, unknown&gt;, ): void` — Register mutation fields.
- `inputType( name: string, config: { description?: string; fields: (t: InputFieldBuilder) =&gt; Record&lt;string, unknown&gt;; }, ): InputRef` — Define an input type.
- `enumType&lt;Values extends readonly string[]&gt;( name: string, config: { description?: string; values: Values; }, ): EnumRef&lt;Values[number]&gt;` — Define an enum type.
- `entityObjectType&lt;TData&gt;( entityDef: EntityDefinition, config: EntityObjectTypeConfig&lt;TData&gt;, ): ObjectRef&lt;TData&gt;` — Create an entity-backed GraphQL object type with auto-generated base queries.
This is the primary way plugins expose entities via GraphQL. It:
1. Creates a Pothos object type with base entity fields + custom fields
2. Auto-generates `{camelType}(uri: String!)` and `{camelType}s(query, limit)` queries
3. Registers resolve/search/resolveContext handlers in the EntityRegistry
- `registerEntityHandlers&lt;TData&gt;( entityDef: EntityDefinition, config: EntityHandlerConfig&lt;TData&gt;, ): void` — Register entity handlers (resolve/search/resolveContext) WITHOUT creating a new Pothos type.
Use this when you've already defined the Pothos type manually but still need
the EntityRegistry to know how to resolve/search this entity for MCP tools.
- `entityPayload&lt;TData&gt;( name: string, entityRef: ObjectRef&lt;TData&gt;, entityFieldName: string, ): ObjectRef&lt;EntityPayloadShape&lt;TData&gt;&gt;` — Create a standard mutation payload type for entity mutations.
Creates `{name}Payload` with fields:
- `success: Boolean!`
- `message: String`
- `[entityFieldName]: EntityType` (typed, for cache invalidation)
- `data: JSON`

### EntityObjectTypeConfig&lt;TData&gt;

Configuration for `entityObjectType()`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `integrations` | `Record&lt;string, IntegrationDefinition&lt;any&gt;&gt;` | No | Integration dependencies — keys become typed accessors on `ctx.integrations`. |
| `description` | `string` | No | Optional description override (defaults to entity name). |
| `fields` | `(t: ObjectFieldBuilder) =&gt; Record&lt;string, unknown&gt;` | Yes | Custom fields beyond the base entity fields (id, type, uri, title, etc.). |
| `resolve` | `(id: Record&lt;string, string&gt;, ctx: EntityContext) =&gt; Promise&lt;TData \| null&gt;` | No | Resolve a single entity by its URI ID segments. |
| `search` | `(query: SearchQuery, ctx: EntityContext) =&gt; Promise&lt;TData[]&gt;` | No | Search/list entities. |
| `resolveContext` | `(entity: TData, ctx: EntityContext) =&gt; Promise&lt;string&gt;` | No | Generate context markdown for AI/MCP consumption. |

### EntityHandlerConfig&lt;TData&gt;

Configuration for `registerEntityHandlers()` — handler-only registration.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `integrations` | `Record&lt;string, IntegrationDefinition&lt;any&gt;&gt;` | No | Integration dependencies — keys become typed accessors on `ctx.integrations`. |
| `resolve` | `(id: Record&lt;string, string&gt;, ctx: EntityContext) =&gt; Promise&lt;TData \| null&gt;` | No | Resolve a single entity by its URI ID segments. |
| `search` | `(query: SearchQuery, ctx: EntityContext) =&gt; Promise&lt;TData[]&gt;` | No | Search/list entities. |
| `resolveContext` | `(entity: TData, ctx: EntityContext) =&gt; Promise&lt;string&gt;` | No | Generate context markdown for AI/MCP consumption. |

### EntityPayloadShape&lt;_TData = unknown&gt;

Shape of an entity mutation payload.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `success` | `boolean` | Yes |  |
| `message` | `string \| null` | No |  |
| `entity` | `_TData \| null` | No |  |
| `data` | `unknown` | No |  |

**Example — extending the schema**

```typescript
import type { SchemaBuilder } from '@tryvienna/sdk';
import { githubPrEntity } from './entities';
import { githubIntegration } from './integration';

export function registerGitHubSchema(b: SchemaBuilder): void {
  // Create entity-backed type with auto-generated queries
  const GitHubPR = b.entityObjectType<PRData>(githubPrEntity, {
    integrations: { github: githubIntegration },
    fields: (t) => ({
      number: t.exposeInt('number'),
      state: t.exposeString('state'),
      author: t.exposeString('author'),
      additions: t.exposeInt('additions'),
      deletions: t.exposeInt('deletions'),
    }),
    resolve: async (id, ctx) => {
      const client = ctx.integrations.github.client;
      if (!client) return null;
      return client.getPR(id.owner, id.repo, Number(id.number));
    },
    search: async (query, ctx) => {
      const client = ctx.integrations.github.client;
      if (!client) return [];
      return client.searchPRs(query.query ?? '', query.limit);
    },
  });

  // Mutation payload
  const MergePayload = b.entityPayload('MergeGitHubPr', GitHubPR, 'pr');

  b.mutationFields((t) => ({
    mergeGitHubPr: t.field({
      type: MergePayload,
      args: { uri: t.arg.string({ required: true }) },
      resolve: async (_, args, ctx) => {
        // ... merge logic
        return { success: true, entity: mergedPR };
      },
    }),
  }));
}
```

---

## Registries

Runtime registries that hold definitions and route operations. Most plugins use `PluginSystem` (the unified registry); the lower-level `EntityRegistry` and `IntegrationRegistry` are used internally by `@vienna/graphql`.

### PluginSystem

**Methods**

| Method | Returns | Description |
|--------|---------|-------------|
| `registerPlugin(plugin: PluginDefinition): void` | `void` |  |
| `unregisterPlugin(id: string): boolean` | `boolean` |  |
| `getPlugin(id: string): PluginDefinition \| undefined` | `PluginDefinition \| undefined` |  |
| `getPlugins(): PluginDefinition[]` | `PluginDefinition[]` |  |
| `getPluginIds(): string[]` | `string[]` |  |
| `getIntegration(id: string): IntegrationDefinition \| undefined` | `IntegrationDefinition \| undefined` |  |
| `getAllIntegrations(): IntegrationDefinition[]` | `IntegrationDefinition[]` |  |
| `getPluginForIntegration(integrationId: string): string \| undefined` | `string \| undefined` | Get the plugin ID that registered a given integration. |
| `getEntity(type: string): EntityDefinition \| undefined` | `EntityDefinition \| undefined` |  |
| `getEntityTypes(): string[]` | `string[]` |  |
| `getAllEntities(): EntityDefinition[]` | `EntityDefinition[]` |  |
| `registerEntityHandlers(type: string, handlers: EntityHandlers&lt;TData&gt;): void` | `void` | Register resolve/search/resolveContext handlers for an entity type. |
| `getEntityHandlers(type: string): EntityHandlers \| undefined` | `EntityHandlers \| undefined` |  |
| `resolveEntity(uri: string, ctx: EntityContext): Promise&lt;BaseEntity \| null&gt;` | `Promise&lt;BaseEntity \| null&gt;` |  |
| `searchEntities(query: string, ctx: EntityContext, types?: string[], limit?: number): Promise&lt;BaseEntity[]&gt;` | `Promise&lt;BaseEntity[]&gt;` |  |
| `resolveEntityContext(uri: string, ctx: EntityContext): Promise&lt;string \| null&gt;` | `Promise&lt;string \| null&gt;` |  |
| `getEntityTypeSummaries(): EntityTypeSummary[]` | `EntityTypeSummary[]` |  |
| `getNavCanvases(): ResolvedNavSidebar[]` | `ResolvedNavSidebar[]` |  |
| `getDrawerCanvas(pluginId: string): ResolvedDrawer \| undefined` | `ResolvedDrawer \| undefined` |  |
| `getMenuBarItems(): ResolvedMenuBar[]` | `ResolvedMenuBar[]` |  |
| `getEntityDrawer(type: string): ResolvedEntityDrawer \| undefined` | `ResolvedEntityDrawer \| undefined` |  |
| `getEntityDrawers(): ResolvedEntityDrawer[]` | `ResolvedEntityDrawer[]` |  |

### EntityHandlers&lt;TData = BaseEntity&gt;

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `resolve` | `(id: Record&lt;string, string&gt;, ctx: EntityContext) =&gt; Promise&lt;TData \| null&gt;` | No | Resolve a single entity by its URI ID segments. |
| `search` | `(query: SearchQuery, ctx: EntityContext) =&gt; Promise&lt;TData[]&gt;` | No | Search/list entities. |
| `resolveContext` | `(entity: TData, ctx: EntityContext) =&gt; Promise&lt;string&gt;` | No | Generate context markdown for AI/MCP consumption. |
| `integrationDeps` | `Record&lt;string, string&gt;` | No | Integration dependencies — maps local names to integration IDs. |

### EntityRegistry

**Methods**

| Method | Returns | Description |
|--------|---------|-------------|
| `register(definition: EntityDefinition): void` | `void` | Register an entity definition. Throws if the type is already registered. |
| `registerHandlers(type: string, entityHandlers: EntityHandlers&lt;TData&gt;): void` | `void` | Register resolve/search/resolveContext handlers for an entity type.
Called by `entityObjectType()` in the schema builder wrapper.
The entity definition must already be registered. |
| `unregister(type: string): boolean` | `boolean` | Unregister an entity type and its handlers. Returns true if it existed. |
| `getDefinition(type: string): EntityDefinition \| undefined` | `EntityDefinition \| undefined` | Get the definition for a type. |
| `getHandlers(type: string): EntityHandlers \| undefined` | `EntityHandlers \| undefined` | Get the handlers for a type. |
| `getTypes(): string[]` | `string[]` | Get all registered type names. |
| `getAllDefinitions(): EntityDefinition[]` | `EntityDefinition[]` | Get all definitions. |
| `getTypeSummaries(): EntityTypeSummary[]` | `EntityTypeSummary[]` | Get type summaries for discovery (entityTypes query, MCP entity_types tool). |
| `getByURI(uri: string, ctx: EntityContext): Promise&lt;BaseEntity \| null&gt;` | `Promise&lt;BaseEntity \| null&gt;` | Resolve a single entity by URI. |
| `search(query: string, ctx: EntityContext, types?: string[], limit?: number): Promise&lt;BaseEntity[]&gt;` | `Promise&lt;BaseEntity[]&gt;` | Search across entity types. |
| `resolveContext(uri: string, ctx: EntityContext): Promise&lt;string \| null&gt;` | `Promise&lt;string \| null&gt;` | Resolve context markdown for an entity (used by MCP/AI). |

### IntegrationRegistry

**Methods**

| Method | Returns | Description |
|--------|---------|-------------|
| `register(definition: IntegrationDefinition): void` | `void` | Register an integration definition. Throws if the ID is already registered. |
| `unregister(id: string): boolean` | `boolean` | Unregister an integration. Returns true if it existed. |
| `getDefinition(id: string): IntegrationDefinition \| undefined` | `IntegrationDefinition \| undefined` | Get a specific integration definition. |
| `getAllDefinitions(): IntegrationDefinition[]` | `IntegrationDefinition[]` | Get all registered integration definitions. |

### Resolved Canvas Types

Returned by `PluginSystem` canvas query methods. Pairs the canvas config with the owning plugin ID.

#### ResolvedNavSidebar

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `pluginId` | `string` | Yes |  |
| `config` | `NavSidebarCanvasConfig` | Yes |  |

#### ResolvedDrawer

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `pluginId` | `string` | Yes |  |
| `config` | `DrawerCanvasConfig` | Yes |  |

#### ResolvedMenuBar

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `pluginId` | `string` | Yes |  |
| `config` | `MenuBarCanvasConfig` | Yes |  |

#### ResolvedFeed

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `pluginId` | `string` | Yes |  |
| `config` | `FeedCanvasConfig` | Yes |  |

#### ResolvedEntityDrawer

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `entityType` | `string` | Yes |  |
| `pluginId` | `string` | Yes |  |
| `component` | `ComponentType&lt;EntityDrawerProps&gt;` | Yes |  |
| `card` | `ComponentType&lt;EntityCardProps&gt;` | No |  |

---

## Cache

### EntityCache&lt;V&gt;

**Constructor**

| Parameter | Type | Required |
|-----------|------|----------|
| `config` | `EntityCacheConfig` | Yes |

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `size` | `number` | Number of live (non-expired) entries. Prunes expired entries first. |

**Methods**

| Method | Returns | Description |
|--------|---------|-------------|
| `get(key: string): V \| undefined` | `V \| undefined` | Get a value, returning undefined if expired or missing. |
| `set(key: string, value: V): void` | `void` | Set a value, evicting the oldest entry if at capacity. |
| `invalidate(key: string): void` | `void` | Remove a specific entry. |
| `prune(): number` | `number` | Remove all expired entries. Returns the number of entries removed. |
| `clear(): void` | `void` | Clear all entries. |

```typescript
import { EntityCache } from '@tryvienna/sdk';

const cache = new EntityCache<PRData>({ ttl: 30_000, maxSize: 200 });

cache.set('key', prData);
const hit = cache.get('key');     // PRData | undefined
cache.invalidate('key');          // Remove specific entry
const pruned = cache.prune();     // Remove expired, returns count
cache.clear();                    // Remove all
```

---

## Errors

### EntityURIError

Error thrown when URI parsing or building fails.

**Constructor**

| Parameter | Type | Required |
|-----------|------|----------|
| `code` | `EntityURIErrorCode` | Yes |
| `message` | `string` | Yes |
| `uri` | `string` | No |

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `name` | `"EntityURIError"` |  |

**Error codes:** `INVALID_FORMAT` · `MISSING_ENTITY_TYPE` · `MISSING_PATH` · `INVALID_ENTITY_TYPE` · `INVALID_PATH_SEGMENT` · `INVALID_LABEL_ENCODING` · `SEGMENT_COUNT_MISMATCH`

### EntityDefinitionError

Error thrown by defineEntity/defineIntegration for invalid configuration.

**Constructor**

| Parameter | Type | Required |
|-----------|------|----------|
| `entityType` | `string` | Yes |
| `field` | `string` | Yes |
| `message` | `string` | Yes |

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `name` | `"EntityDefinitionError"` |  |

### Type Guards

```typescript
function isEntityURIError(error: unknown): error is EntityURIError
function isEntityDefinitionError(error: unknown): error is EntityDefinitionError
```

```typescript
import { parseEntityURI, isEntityURIError } from '@tryvienna/sdk';

try {
  parseEntityURI('bad-uri');
} catch (err) {
  if (isEntityURIError(err)) {
    console.log(err.code); // 'INVALID_FORMAT'
    console.log(err.uri);  // 'bad-uri'
  }
}
```

---

## Testing Utilities

In-memory mocks and a structured test harness. Import from `@tryvienna/sdk`.

### LogEntry

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `level` | `string` | Yes |  |
| `msg` | `string` | Yes |  |
| `ctx` | `Record&lt;string, unknown&gt;` | No |  |

### MockSecureStorage

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `size` | `number` |  |

**Methods**

| Method | Returns | Description |
|--------|---------|-------------|
| `get(key: string): Promise&lt;string \| null&gt;` | `Promise&lt;string \| null&gt;` |  |
| `set(key: string, value: string): Promise&lt;void&gt;` | `Promise&lt;void&gt;` |  |
| `delete(key: string): Promise&lt;void&gt;` | `Promise&lt;void&gt;` |  |
| `has(key: string): Promise&lt;boolean&gt;` | `Promise&lt;boolean&gt;` |  |
| `clear(): void` | `void` |  |

### MockPluginLogger

**Constructor**

| Parameter | Type | Required |
|-----------|------|----------|
| `bindings` | `Record&lt;string, unknown&gt;` | No |

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `entries` | `LogEntry[]` |  |

**Methods**

| Method | Returns | Description |
|--------|---------|-------------|
| `debug(msg: string, ctx?: Record&lt;string, unknown&gt;): void` | `void` |  |
| `info(msg: string, ctx?: Record&lt;string, unknown&gt;): void` | `void` |  |
| `warn(msg: string, ctx?: Record&lt;string, unknown&gt;): void` | `void` |  |
| `error(msg: string, ctx?: Record&lt;string, unknown&gt;): void` | `void` |  |
| `child(childBindings: Record&lt;string, unknown&gt;): MockPluginLogger` | `MockPluginLogger` |  |
| `clear(): void` | `void` |  |

### MockOAuthAccessor

**Methods**

| Method | Returns | Description |
|--------|---------|-------------|
| `getAccessToken(providerId: string): Promise&lt;string \| null&gt;` | `Promise&lt;string \| null&gt;` |  |
| `getTokenData(providerId: string): Promise&lt;OAuthTokenData \| null&gt;` | `Promise&lt;OAuthTokenData \| null&gt;` |  |
| `isAuthenticated(providerId: string): Promise&lt;boolean&gt;` | `Promise&lt;boolean&gt;` |  |
| `setToken(providerId: string, token: OAuthTokenData): void` | `void` |  |
| `removeToken(providerId: string): void` | `void` |  |
| `clear(): void` | `void` |  |

### MockIntegrationAccessor&lt;TClient = unknown&gt;

**Constructor**

| Parameter | Type | Required |
|-----------|------|----------|
| `client` | `TClient \| null` | No |

**Properties**

| Property | Type | Description |
|----------|------|-------------|
| `client` | `TClient \| null` |  |

**Methods**

| Method | Returns | Description |
|--------|---------|-------------|
| `clear(): void` | `void` |  |

### createMockEntityContext()

Create a mock EntityContext for testing.
Pass integration accessors keyed by local name matching the entity's integrations config.

```typescript
function createMockEntityContext(
  integrations: Record<string, IntegrationAccessor> = {},
): {
  ctx: EntityContext;
  storage: MockSecureStorage;
  logger: MockPluginLogger;
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `integrations` | `Record&lt;string, IntegrationAccessor&gt;` | No |  |

**Returns:** `{ ctx: EntityContext; storage: MockSecureStorage; logger: MockPluginLogger; }`

### createTestHarness()

Create a test harness for an entity definition.
Provides mock storage, logger, and context for testing.
Since EntityDefinition is metadata-only, the harness just provides
the mock context and delegates createURI/parseURI.

```typescript
function createTestHarness(
  definition: EntityDefinition,
  integrations: Record<string, IntegrationAccessor> = {},
): EntityTestHarness
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definition` | `EntityDefinition` | Yes |  |
| `integrations` | `Record&lt;string, IntegrationAccessor&gt;` | No |  |

**Returns:** `EntityTestHarness`

### EntityTestHarness

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `storage` | `MockSecureStorage` | Yes |  |
| `logger` | `MockPluginLogger` | Yes |  |
| `ctx` | `EntityContext` | Yes |  |
| `definition` | `EntityDefinition` | Yes |  |

**Methods**

- `createURI(id: Record&lt;string, string&gt;): string` — *No description*
- `parseURI(uri: string): { type: string; id: Record&lt;string, string&gt; }` — *No description*

**Example**

```typescript
import { describe, it, expect } from 'vitest';
import { createTestHarness, MockIntegrationAccessor } from '@tryvienna/sdk';
import { githubPrEntity } from './entities';

describe('GitHub PR Entity', () => {
  it('creates and parses URIs', () => {
    const harness = createTestHarness(githubPrEntity);

    const uri = harness.createURI({ owner: 'acme', repo: 'app', number: '42' });
    expect(uri).toBe('@vienna//github_pr/acme/app/42');

    const { id } = harness.parseURI(uri);
    expect(id.owner).toBe('acme');
    expect(id.number).toBe('42');
  });

  it('provides mock context for handler tests', () => {
    const mockGitHub = new MockIntegrationAccessor(mockGitHubClient);
    const harness = createTestHarness(githubPrEntity, { github: mockGitHub });

    // harness.ctx can be passed to resolve/search handlers
    expect(harness.ctx.integrations.github.client).toBe(mockGitHubClient);
    expect(harness.logger.entries).toEqual([]);
  });
});
```

---

## Codegen

Import from `@tryvienna/sdk/codegen`. Creates a standard `@graphql-codegen/client-preset` configuration for plugins.

### createPluginCodegenConfig()

```typescript
function createPluginCodegenConfig(options?: PluginCodegenOptions): CodegenConfig
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `schemaPath` | `string` | `'../graphql/schema.graphql'` | Path to the shared schema |
| `documentsGlob` | `string` | `'src/client/operations.ts'` | Glob for operation documents |
| `outputDir` | `string` | `'./src/client/generated/'` | Output directory for types |

```typescript
// In your plugin's codegen.ts:
import { createPluginCodegenConfig } from '@tryvienna/sdk/codegen';

export default createPluginCodegenConfig();
// Or with custom paths:
export default createPluginCodegenConfig({
  schemaPath: '../../packages/graphql/schema.graphql',
  documentsGlob: 'src/**/*.graphql',
});
```

---

## Zod Schemas

All TypeScript types in the SDK derive from Zod schemas via `z.infer<>`. These are the validation source of truth — use them for runtime validation at system boundaries.

| Schema | Description |
|--------|-------------|
| `EntityTypeSchema` | Entity type ID: lowercase alphanumeric + underscore, 1-64 chars, starts with letter. |
| `PathSegmentSchema` | URI path segment: non-empty, max 256 chars, no control characters. |
| `EntityURIPathSchema` | URI path config: `{ segments: readonly string[] }` with at least one segment. |
| `BaseEntitySchema` | Minimal entity: `{ id, type, uri, title, description?, createdAt?, updatedAt?, metadata? }`. |
| `EntitySourceSchema` | Enum: `'builtin' | 'integration'`. |
| `EntityDisplayColorsSchema` | Color triplet: `{ bg, text, border }` as CSS color strings. |
| `EntityDisplayMetadataSchema` | Full display config: `{ emoji, colors, description?, filterDescriptions?, outputFields? }`. |
| `PaletteFilterSpecSchema` | Filter spec for the command palette: `{ key, label, aliases?, values[] }`. |
| `EntityCacheConfigSchema` | Cache config: `{ ttl: number, maxSize?: number }`. |
| `EntityTypeSummarySchema` | Discovery summary: `{ type, displayName, icon, source, uriExample, display? }`. |
| `PluginIconSchema` | Union: `{ svg } | { png } | { path }`. |
| `IntegrationSummarySchema` | Integration discovery: `{ id, name, icon, description?, hasOAuth, status, credentials? }`. |

```typescript
import { EntityTypeSchema, BaseEntitySchema } from '@tryvienna/sdk';

// Validate at runtime
const result = EntityTypeSchema.safeParse('github_pr');
if (result.success) {
  // result.data is a validated EntityType
}

// Infer TypeScript types
type EntityType = z.infer<typeof EntityTypeSchema>;
type BaseEntity = z.infer<typeof BaseEntitySchema>;
```

---

## GraphQL Operations (`@tryvienna/sdk/graphql`)

Pre-built GraphQL operations for common Vienna platform actions. Use these with `usePluginClient()` from `@tryvienna/sdk/react` — no need to write raw GraphQL queries.

```typescript
import { usePluginClient } from '@tryvienna/sdk/react';
import {
  GET_PROJECTS,
  CREATE_WORKSTREAM,
  SEND_WORKSTREAM_MESSAGE,
  SET_WORKSTREAM_IN_FOCUS,
} from '@tryvienna/sdk/graphql';
import type {
  GetProjectsResult,
  CreateWorkstreamResult,
  CreateWorkstreamVariables,
  SendWorkstreamMessageResult,
  SendWorkstreamMessageVariables,
  SetWorkstreamInFocusResult,
  SetWorkstreamInFocusVariables,
} from '@tryvienna/sdk/graphql';
```

### GET_PROJECTS

Fetch all projects in the current Vienna instance.

```typescript
const client = usePluginClient();
const { data } = await client.query<GetProjectsResult>({ query: GET_PROJECTS });
// data.projects → Array<{ id, name, createdAt, updatedAt }>
```

### CREATE_WORKSTREAM

Create a new workstream in a project. Use `groupName` to auto-create or reuse a scope (group).

```typescript
const { data } = await client.mutate<CreateWorkstreamResult, CreateWorkstreamVariables>({
  mutation: CREATE_WORKSTREAM,
  variables: {
    input: {
      projectId: '...',
      title: 'Fix login bug',
      groupName: 'Sprint Tasks',  // auto-creates scope if it doesn't exist
    },
  },
});
// data.createWorkstream.workstream → { id, title, status, ... }
```

#### CreateWorkstreamInput

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | `string` | Yes | Project to create the workstream in. |
| `title` | `string` | Yes | Workstream title. |
| `groupId` | `string` | No | Scope ID to add the workstream to. |
| `groupName` | `string` | No | Scope name — auto-creates if it doesn't exist, reuses if it does. |
| `model` | `string` | No | Model override for this workstream. |
| `createWorktrees` | `boolean` | No | Create git worktrees for isolated branches. |
| `branchName` | `string` | No | Git branch name for the workstream. |
| `baseBranch` | `string` | No | Base branch to branch from. |

### SEND_WORKSTREAM_MESSAGE

Send a text message to a workstream, auto-starting the agent if needed.

```typescript
await client.mutate<SendWorkstreamMessageResult, SendWorkstreamMessageVariables>({
  mutation: SEND_WORKSTREAM_MESSAGE,
  variables: { workstreamId: '...', text: 'Work on this task' },
});
```

### SET_WORKSTREAM_IN_FOCUS

Set which workstream is currently in focus (visible in the main panel). Pass `null` to clear focus.

```typescript
await client.mutate<SetWorkstreamInFocusResult, SetWorkstreamInFocusVariables>({
  mutation: SET_WORKSTREAM_IN_FOCUS,
  variables: { id: workstreamId },
});
```

### Launching workstreams from a feed canvas

A common pattern in feed canvases: let users select items and launch a batch of workstreams. Here's the typical flow:

```typescript
import { usePluginClient } from '@tryvienna/sdk/react';
import { GET_PROJECTS, CREATE_WORKSTREAM, SEND_WORKSTREAM_MESSAGE } from '@tryvienna/sdk/graphql';

async function handleLaunchAgents(selectedItems: Item[]) {
  const client = usePluginClient();

  // 1. Get the first project
  const { data: projectsData } = await client.query({ query: GET_PROJECTS });
  const projectId = projectsData.projects[0].id;

  // 2. Create workstreams in parallel
  await Promise.all(selectedItems.map(async (item) => {
    const { data } = await client.mutate({
      mutation: CREATE_WORKSTREAM,
      variables: {
        input: {
          projectId,
          title: item.title,
          groupName: 'My Plugin Tasks', // reuses scope if it exists
        },
      },
    });

    const workstreamId = data.createWorkstream.workstream.id;

    // 3. Send initial message to start the agent
    await client.mutate({
      mutation: SEND_WORKSTREAM_MESSAGE,
      variables: { workstreamId, text: `Work on: ${item.title}` },
    });
  }));
}
```
