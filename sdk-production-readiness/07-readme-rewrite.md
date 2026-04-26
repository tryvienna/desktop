# 07: Complete README Rewrite

## Priority: HIGH

## Summary

The current README is **significantly outdated** — it documents interfaces (`EntityResolver`, `EntityTypeRegistration`, `EntityActionRegistration`, `IntegrationTypeRegistration`, `IntegrationMethodRegistration`) that **no longer exist in the codebase**. The actual API uses `defineEntity()`, `defineIntegration()`, `definePlugin()` factories with a `PluginSystem` and `SchemaBuilder`.

The README needs a complete rewrite targeting **external third-party plugin developers using AI coding assistants**. This means it must be comprehensive enough that an AI can read it and build a working plugin from scratch.

## Target Audience

- External developers who want to build Vienna plugins
- AI coding assistants (Claude, Cursor, etc.) that will read the README to understand how to generate plugin code
- Developers ranging from junior to senior, with varying familiarity with GraphQL, React, and TypeScript

## Proposed Structure

### 1. Header and Badges
- Package name, version badge, license badge
- One-line description
- Link to Plugin Developer docs (placeholder URL)

### 2. Quick Start (most important section)
- Install command: `npm install @tryvienna/sdk`
- Minimal complete plugin example (20-30 lines) showing:
  - `defineIntegration()` with a simple API client
  - `defineEntity()` with URI segments
  - `definePlugin()` combining them
- "That's it — this plugin is ready to be loaded by Vienna"

### 3. Core Concepts
- **Plugins** — top-level unit, bundles integrations + entities + UI
- **Integrations** — external API connections with auth
- **Entities** — data types with URI-based identification
- **Canvases** — UI surfaces (nav-sidebar, drawer, menu-bar)
- Diagram showing the plugin architecture

### 4. API Reference

#### definePlugin(config)
- Full config interface with descriptions
- Example with all options
- Validation rules (what throws EntityDefinitionError)

#### defineIntegration(config)
- Config interface
- OAuth configuration (all three flow types with examples)
- Credential-based auth example
- createClient pattern

#### defineEntity(config)
- Config interface
- URI segments explained
- Display metadata
- Cache configuration
- UI components (drawer, card)

#### Schema Extension (SchemaBuilder)
- How to use `integration.schema` callback
- `entityObjectType()` helper with full example
- `entityPayload()` for mutation payloads
- Custom queries and mutations
- Working example of a complete schema extension

### 5. React Hooks (for Plugin UI)
- `useEntity(uri)` — fetch single entity
- `useEntities({ type, query, limit })` — fetch entity list
- `usePluginQuery(document)` — custom GraphQL queries
- `usePluginMutation(document)` — custom GraphQL mutations
- `useHostApi()` — access host app capabilities
- `invalidateEntity()` / `updateCachedEntity()` — cache management
- Note about `PluginDataProvider` (set up by host, not plugins)

### 6. Canvas UI Surfaces
- Nav Sidebar: props, config, example
- Drawer: props, navigation stack (push/pop), example
- Menu Bar: icon + popover, props, example
- `PluginHostApi` — what the host provides (credentials, OAuth, fetch)

### 7. URI System
- Format: `@vienna//<type>/<segments>`
- Building and parsing URIs
- Labels (optional display text)
- Utility functions

### 8. Testing
- `createTestHarness(definition)` — complete test setup
- `createMockEntityContext()` — for handler testing
- Mock implementations: `MockSecureStorage`, `MockPluginLogger`, `MockOAuthAccessor`
- Example test file

### 9. GraphQL Codegen
- `createPluginCodegenConfig()` — setup
- How to generate TypedDocumentNode types
- Integration with `usePluginQuery`/`usePluginMutation`

### 10. Error Handling
- `EntityURIError` — URI parsing/building failures
- `EntityDefinitionError` — invalid configuration
- Type guards: `isEntityURIError()`, `isEntityDefinitionError()`

### 11. Reference Plugin Examples
- Link to `packages/plugin-github/` — full-featured (4 entities, OAuth, schema extension)
- Link to `packages/plugin-weather/` — simple (1 integration, fetch-based)

### 12. License
- Apache 2.0
- Note about Plugin Developer Agreement (coming soon)

## Key Principles for the Rewrite

1. **Every code example must be copy-pasteable** — no pseudo-code, no "..."  abbreviations in examples
2. **Show the happy path first** — full working example before edge cases
3. **Type signatures in examples** — show what TypeScript infers
4. **Error messages in examples** — show what happens when validation fails
5. **Cross-link between sections** — "See [Schema Extension](#schema-extension) for adding GraphQL fields"

## What to Remove

- ALL references to `EntityResolver`, `EntityTypeRegistration`, `EntityActionRegistration`
- ALL references to `IntegrationTypeRegistration`, `IntegrationMethodRegistration`
- The old "Registering Built-in Entities" section (internal implementation detail)
- The old "Integration with @vienna/graphql" section (internal wiring)
- The old architecture diagram (replace with plugin-focused one)

## Verification

1. Read the README as if you're an AI assistant trying to build a plugin — can you write working code from it?
2. All code examples should typecheck if pasted into a file with the right imports
3. No references to internal Vienna packages except where plugin developers would actually interact with them
