# Vienna CLI Reference

> **Version:** 0.0.1
>
> *This documentation is auto-generated from the CLI source. Do not edit manually.*

## Overview

The Vienna CLI (`vcli`) is the official command-line tool for Vienna plugin development. It provides scaffolding, code generation, and developer utilities to help you build, test, and ship plugins for the Vienna platform.

## Installation

```bash
# From within the Vienna registry repository
pnpm install

# Run directly
npx vcli --help

# Or via the bin entry
./packages/vcli/bin/vcli.mjs --help
```

## Global Options

| Flag | Description |
|------|-------------|
| `-V, --version` | Display the current version |
| `-h, --help` | Display help for any command |

Help is available for every command and subcommand:

```bash
vcli --help
vcli plugin --help
vcli plugin scaffold --help
```

## Commands

- [`vcli plugin`](#vcli-plugin) — Plugin development commands
  - [`vcli plugin scaffold`](#vcli-plugin-scaffold) — Scaffold a new Vienna plugin

### `vcli plugin`

> Plugin development commands

Parent command for all plugin development workflows — scaffolding new plugins, validating configuration, and more.

**Usage:**

```bash
vcli plugin [options]
```

**Subcommands:**

| Command | Description |
|---------|-------------|
| [`scaffold`](#vcli-plugin-scaffold) | Scaffold a new Vienna plugin |

#### `vcli plugin scaffold`

> Scaffold a new Vienna plugin

Generate a complete, ready-to-develop Vienna plugin from a single command. The scaffold produces a fully-typed TypeScript project with the plugin definition, integration hooks, UI components, entity definitions, GraphQL operations, and all necessary configuration files.

The generated code follows Vienna plugin conventions and is immediately type-checkable with `pnpm typecheck`.

**Usage:**

```bash
vcli plugin scaffold [options]
```

**Options:**

| Flag | Description | Required | Default |
|------|-------------|----------|---------|
| `--name <name>` | Plugin name (kebab-case) | Yes | — |
| `--canvas <canvases>` | Canvases to include (comma-separated: sidebar,drawer,menu-bar) | No | `sidebar,drawer` |
| `--entity <entities>` | Entity types to scaffold (comma-separated, kebab-case) | No | `` |
| `--auth <type>` | Authentication pattern (oauth, pat, api-key, none) | No | `none` |
| `--description <desc>` | Plugin description | No | `A Vienna plugin` |
| `--dry-run` | Preview files without writing | No | — |
| `--output <dir>` | Output directory (default: auto-detect registry or cwd) | No | — |
| `--auto-load` | Register plugin for automatic loading on next app start | No | — |

**Option Details:**

#### `--name <name>`

Must be kebab-case: lowercase letters, numbers, and hyphens, starting with a letter. This name is used as the plugin identifier and to derive all other naming variants (PascalCase for components, snake_case for IDs, etc.).

#### `--canvas <canvases>`

Controls which UI surfaces your plugin will render into.
  - **`sidebar`** — Adds a navigation section in the left sidebar.
  - **`drawer`** — Adds a detail drawer, settings drawer, and settings hook.
  - **`menu-bar`** — Adds a menu bar icon and popover content area.

  Selecting `sidebar` or `menu-bar` automatically includes `drawer`.

#### `--entity <entities>`

Comma-separated list of entity type names in kebab-case. For each entity the scaffold generates:
  - An entity definition file (`src/entities/<plugin>-<entity>.ts`)
  - A URI resolver (`src/entities/uri.ts`)
  - GraphQL operations stub (`src/client/operations.ts`)
  - An entity drawer component (when drawer canvas is active)

#### `--auth <type>`

Determines the authentication pattern wired into the integration file.
  - **`oauth`** — Full OAuth 2.0 with PKCE flow, client ID/secret key definitions.
  - **`pat`** — Personal access token authentication.
  - **`api-key`** — Simple API key authentication.
  - **`none`** — No authentication (public APIs or internal services).

#### `--dry-run`

Lists all files that would be generated and their paths, but does not create any files or directories. Useful for previewing the scaffold output.

#### `--output <dir>`

Absolute or relative path to the parent directory where the plugin folder will be created. The plugin name is appended automatically (e.g. `--output=/tmp` with `--name=foo` creates `/tmp/foo/`).

#### `--auto-load`

When set, the scaffolded plugin is automatically registered in Vienna's `.local-plugins.json` manifest so it loads on the next app start. Requires Vienna to have been run at least once (so that the profile directory exists).

**Notes:**

- When `--output` is not specified, the CLI auto-detects the nearest Vienna registry (by looking for `registry.json` in parent directories) and places the plugin under `plugins/<name>`. If no registry is found, the plugin is created in the current directory.
- The `--canvas` option `drawer` is automatically included whenever `sidebar` or `menu-bar` is selected, because those canvases depend on drawer infrastructure.
- If the target directory already exists, the command will exit with an error to prevent accidentally overwriting existing work.

**Examples:**

```bash
# Create a minimal plugin with default sidebar + drawer canvases
vcli plugin scaffold --name=my-plugin
```

```bash
# Full-featured OAuth plugin with entities and all canvas types
vcli plugin scaffold \
  --name=acme \
  --canvas=sidebar,drawer,menu-bar \
  --entity=task,comment \
  --auth=oauth \
  --description="Acme project management integration"
```

```bash
# API-key authenticated plugin with a single entity
vcli plugin scaffold \
  --name=weather \
  --canvas=menu-bar \
  --auth=api-key \
  --entity=forecast
```

```bash
# PAT-authenticated sidebar plugin
vcli plugin scaffold \
  --name=tracker \
  --canvas=sidebar \
  --entity=issue \
  --auth=pat
```

```bash
# Preview generated files without writing to disk
vcli plugin scaffold --name=preview-test --dry-run
```

```bash
# Specify a custom output directory
vcli plugin scaffold --name=my-plugin --output=/path/to/projects
```

## Generated Plugin Structure

When you scaffold a plugin, the following files are generated based on your options.
Files marked with a condition are only generated when the corresponding option is active.

### Configuration Files

| File | Description |
|------|-------------|
| `package.json` | Package manifest with plugin dependencies (auth-aware) |
| `tsconfig.json` | TypeScript configuration (strict mode) |
| `codegen.ts` | GraphQL code generation configuration |

### Core Source Files

| File | Description |
|------|-------------|
| `src/index.ts` | Plugin definition — registers canvases, entities, and integration |
| `src/integration.ts` | Integration hooks — authentication and API client setup |
| `src/schema.ts` | GraphQL schema registration for plugin entities |
| `src/api.ts` | API client with typed method stubs |

### Entity Files (when `--entity` is specified)

| File | Description |
|------|-------------|
| `src/entities/index.ts` | Entity barrel export |
| `src/entities/uri.ts` | URI resolver for entity deep-linking |
| `src/entities/<plugin>-<entity>.ts` | Entity definition (one per entity type) |
| `src/client/operations.ts` | GraphQL query/mutation stubs for entities |

### UI Files (conditional by canvas)

| File | Condition | Description |
|------|-----------|-------------|
| `src/ui/index.ts` | Any canvas | UI barrel export |
| `src/ui/<Pascal>NavSection.tsx` | `sidebar` | Sidebar navigation section component |
| `src/ui/<Pascal>PluginDrawer.tsx` | `drawer` | Main plugin detail drawer |
| `src/ui/<Pascal>SettingsDrawer.tsx` | `drawer` | Plugin settings drawer |
| `src/ui/use<Pascal>Settings.ts` | `drawer` | Settings state management hook |
| `src/ui/<Pascal>MenuBarIcon.tsx` | `menu-bar` | Menu bar icon component |
| `src/ui/<Pascal>MenuBarContent.tsx` | `menu-bar` | Menu bar popover content |
| `src/ui/<Pascal><Entity>EntityDrawer.tsx` | `drawer` + entity | Per-entity detail drawer |

> **Note:** `<Pascal>` is the PascalCase form of your plugin name (e.g. `my-plugin` becomes `MyPlugin`).
> `<Entity>` is the PascalCase form of each entity name.

## Concepts

### Canvas Types

Vienna plugins can render UI into one or more **canvas** surfaces:

| Canvas | Description |
|--------|-------------|
| `sidebar` | A persistent navigation section in the application's left sidebar. Useful for top-level plugin entry points and navigation items. |
| `drawer` | A slide-over detail panel. Used for settings, entity details, and plugin configuration. Automatically included when `sidebar` or `menu-bar` is selected. |
| `menu-bar` | An icon in the application's top menu bar with a popover content area. Ideal for quick-access widgets, status indicators, or compact plugin UIs. |

### Authentication Patterns

The `--auth` option determines how your plugin authenticates with its backing service:

| Auth Type | Description |
|-----------|-------------|
| `oauth` | Full OAuth 2.0 authorization code flow with PKCE. Generates client ID/secret key definitions and token exchange logic. Best for third-party services that support OAuth. |
| `pat` | Personal Access Token. Users provide a long-lived token that is stored securely. Simpler than OAuth — good for services that issue PATs (e.g. GitHub, Linear). |
| `api-key` | A single API key credential. Suitable for services with key-based auth or internal APIs. |
| `none` | No authentication required. Use for public APIs or plugins that don't call external services. |

### Entity System

Entities represent domain objects from external services (e.g. issues, tasks, documents).
When you declare entities via `--entity`, the scaffold generates:

- **Type definitions** — typed entity shapes with Vienna's entity protocol
- **URI resolvers** — enable deep-linking and cross-referencing entities within Vienna
- **GraphQL operations** — query/mutation stubs for fetching and mutating entity data
- **Entity drawers** — UI components for displaying entity details (when drawer canvas is active)

Entity names must be kebab-case (e.g. `linear-issue`, `github-pr`, `task`).

### Naming Conventions

All names you provide in kebab-case are automatically converted into the appropriate casing for each context:

| Input (kebab) | snake_case | PascalCase | camelCase | Title Case |
|---------------|-----------|------------|-----------|------------|
| `my-plugin` | `my_plugin` | `MyPlugin` | `myPlugin` | `My Plugin` |
| `linear-issue` | `linear_issue` | `LinearIssue` | `linearIssue` | `Linear Issue` |
