---
outline: [2, 3]
---

# CLI Reference

The Vienna CLI (`vcli`) scaffolds fully-typed plugin projects from a single command. Instead of manually wiring up entity definitions, integration hooks, GraphQL schemas, and UI canvases, you describe what you want and `vcli` generates the entire project — ready for `pnpm typecheck` on the first run.

**What you can do today:**

- Scaffold a new plugin with any combination of canvases, auth patterns, and entity types
- Preview generated file trees before writing anything to disk
- Auto-detect your registry location so files land in the right place

[[toc]]

---

## Quick Start

The fastest way to create a plugin is the **New Plugin form** inside Vienna — click **+ Create → New Plugin** in the sidebar. It walks you through the options, runs the scaffold, and opens the generated code in the editor automatically.

If you prefer the CLI, three commands get you a working plugin:

```bash
# 1. Scaffold the plugin
vcli plugin scaffold --name=my-plugin --auth=oauth --entity=task

# 2. Install dependencies
cd plugins/my-plugin && pnpm install

# 3. Verify the generated code compiles
pnpm typecheck
```

That's it — you now have a complete plugin with an OAuth integration, a `task` entity, sidebar navigation, a detail drawer, and a settings panel.

::: tip JUST EXPLORING?
Add `--dry-run` to any scaffold command to preview the file tree without writing anything:

```bash
vcli plugin scaffold --name=my-plugin --dry-run
```
:::

---

## Installation

`vcli` is bundled with the Vienna desktop app. To use it from your terminal:

1. Open Vienna
2. Go to **Vienna → Install 'vcli' Command** in the menu bar (or use the command palette)
3. This creates a `vcli` symlink in `/usr/local/bin/` — available in any terminal session

```bash
# Verify the installation
vcli --version

# Get help
vcli --help
```

If you don't have the desktop app, you can also run vcli via npx:

```bash
npx @tryvienna/cli --help
```

### Global Options

Every command supports these flags:

| Flag | Description |
|------|-------------|
| `-V, --version` | Display the current CLI version |
| `-h, --help` | Show help for any command or subcommand |

Help is contextual — add `--help` at any level to see what's available:

```bash
vcli --help                  # Top-level commands
vcli plugin --help           # Plugin subcommands
vcli plugin scaffold --help  # Scaffold options
```

---

## Commands

### `vcli plugin`

Parent command for all plugin development workflows.

```bash
vcli plugin <subcommand>
```

| Subcommand | Description |
|------------|-------------|
| [`scaffold`](#vcli-plugin-scaffold) | Generate a new plugin project |

---

### `vcli plugin scaffold`

Generate a complete, ready-to-develop Vienna plugin from a single command.

The scaffold produces a fully-typed TypeScript project with the plugin definition, integration hooks, UI components, entity definitions, GraphQL operations, and all necessary configuration. The generated code follows Vienna plugin conventions and is immediately type-checkable.

```bash
vcli plugin scaffold [options]
```

#### Options

| Flag | Description | Required | Default |
|------|-------------|----------|---------|
| `--name <name>` | Plugin name in kebab-case | **Yes** | — |
| `--canvas <canvases>` | Comma-separated canvas types | No | `sidebar,drawer` |
| `--entity <entities>` | Comma-separated entity names | No | — |
| `--auth <type>` | Authentication pattern | No | `none` |
| `--description <desc>` | Plugin description text | No | `A Vienna plugin` |
| `--dry-run` | Preview files without writing | No | `false` |
| `--output <dir>` | Override the output directory | No | auto-detect |
| `--auto-load` | Register plugin for automatic loading on next app start | No | `false` |

---

#### `--name`

The plugin's identifier in kebab-case. This is the only required option — everything else has sensible defaults.

```bash
vcli plugin scaffold --name=github-issues
```

**Naming rules:**
- Must start with a letter
- Lowercase letters, numbers, and hyphens only
- No underscores, spaces, or uppercase

The name is automatically converted into every casing variant your plugin needs:

| You provide | Generated as | Used for |
|-------------|-------------|----------|
| `github-issues` | `github_issues` | Plugin ID, snake_case identifiers |
| | `GithubIssues` | Component names, PascalCase types |
| | `githubIssues` | Variable names, camelCase hooks |
| | `Github Issues` | Display labels, UI titles |

---

#### `--canvas`

Controls which UI surfaces your plugin renders into. Pass a comma-separated list.

```bash
vcli plugin scaffold --name=my-plugin --canvas=sidebar,menu-bar
```

| Canvas | What it adds |
|--------|-------------|
| `sidebar` | A navigation section in the left sidebar panel |
| `drawer` | Plugin detail drawer, settings drawer, and settings hook |
| `menu-bar` | An icon in the top menu bar with a popover content area |

::: info DRAWER IS AUTO-INCLUDED
Selecting `sidebar` or `menu-bar` automatically includes `drawer`, because those canvases depend on drawer infrastructure for settings and detail views. You don't need to specify it explicitly.
:::

**Default:** `sidebar,drawer`

---

#### `--entity`

Declare one or more entity types to scaffold. Each entity gets a full set of generated files.

```bash
vcli plugin scaffold --name=acme --entity=task,comment
```

Entity names follow the same kebab-case rules as the plugin name. For each entity, the scaffold generates:

- A typed entity definition (`src/entities/<plugin>-<entity>.ts`)
- A URI resolver for deep-linking (`src/entities/uri.ts`)
- GraphQL operation stubs (`src/client/operations.ts`)
- An entity detail drawer (when the `drawer` canvas is active)

**Default:** no entities

---

#### `--auth`

Determines the authentication pattern wired into the integration file.

```bash
vcli plugin scaffold --name=my-plugin --auth=oauth
```

| Value | What it generates |
|-------|------------------|
| `oauth` | Full OAuth 2.0 with PKCE — client ID/secret key definitions, token exchange logic, and credential UI in the settings drawer |
| `pat` | Personal Access Token — a stored token field with simpler credential management |
| `api-key` | Single API key credential — suitable for key-based auth or internal APIs |
| `none` | No authentication — for public APIs or plugins that don't call external services |

**Default:** `none`

::: tip CHOOSING AN AUTH PATTERN
- Use **`oauth`** for third-party services that support OAuth (GitHub, Linear, Slack)
- Use **`pat`** for services that issue personal access tokens
- Use **`api-key`** for services with simple key-based authentication
- Use **`none`** for public APIs or plugins that only consume local data
:::

---

#### `--dry-run`

Preview the complete file tree that would be generated, without writing anything to disk.

```bash
vcli plugin scaffold --name=my-plugin --entity=task --dry-run
```

Output shows every file path that would be created — useful for understanding what a particular combination of options produces before committing to it.

---

#### `--output`

Override where the plugin directory is created. The plugin name is appended automatically.

```bash
vcli plugin scaffold --name=my-plugin --output=/tmp
# Creates /tmp/my-plugin/
```

**Default behavior** (when `--output` is not specified):
1. Walk up from the current directory looking for `registry.json`
2. If found, place the plugin in `plugins/<name>/` within that registry
3. If no registry is found, create `<name>/` in the current directory

::: warning EXISTING DIRECTORIES
If the target directory already exists, the command exits with an error to prevent overwriting your work. Delete or rename the existing directory first.
:::

---

#### `--auto-load`

Register the scaffolded plugin for automatic loading the next time Vienna starts. This writes the plugin path to Vienna's `.local-plugins.json` configuration file.

```bash
vcli plugin scaffold --name=my-plugin --auto-load
```

When the app starts, it reads `.local-plugins.json` and loads any plugins listed there. This is useful when scaffolding outside the app — the plugin will appear in Vienna without manually loading it.

::: tip NOT NEEDED FROM THE APP
The **+ Create → New Plugin** form in Vienna automatically loads and registers plugins after scaffolding. You only need `--auto-load` when running `vcli` from the terminal.
:::

---

## Examples

### Minimal plugin

A plugin with the default sidebar and drawer canvases, no authentication, no entities:

```bash
vcli plugin scaffold --name=my-plugin
```

### Full-featured OAuth plugin

An OAuth-authenticated plugin with multiple entities and all canvas types:

```bash
vcli plugin scaffold \
  --name=acme \
  --canvas=sidebar,drawer,menu-bar \
  --entity=task,comment \
  --auth=oauth \
  --description="Acme project management integration"
```

### Menu-bar widget

A lightweight menu-bar plugin with API key auth and a single entity:

```bash
vcli plugin scaffold \
  --name=weather \
  --canvas=menu-bar \
  --auth=api-key \
  --entity=forecast
```

### PAT-authenticated sidebar plugin

```bash
vcli plugin scaffold \
  --name=tracker \
  --canvas=sidebar \
  --entity=issue \
  --auth=pat
```

---

## Generated File Structure

Every scaffolded plugin follows the same structure. Files are generated conditionally based on your `--canvas`, `--entity`, and `--auth` options.

### Always generated

| File | Purpose |
|------|---------|
| `package.json` | Package manifest with auth-aware dependencies |
| `tsconfig.json` | TypeScript configuration (strict mode) |
| `codegen.ts` | GraphQL code generation configuration |
| `src/index.ts` | Plugin definition — registers canvases, entities, and integration |
| `src/integration.ts` | Integration hooks — authentication and API client setup |
| `src/schema.ts` | GraphQL schema registration |
| `src/api.ts` | API client with typed method stubs |

### When `--entity` is specified

| File | Purpose |
|------|---------|
| `src/entities/index.ts` | Entity barrel export |
| `src/entities/uri.ts` | URI resolver for entity deep-linking |
| `src/entities/<plugin>-<entity>.ts` | Entity definition (one per entity type) |
| `src/client/operations.ts` | GraphQL query and mutation stubs |

### Canvas-conditional files

| File | Included when |
|------|--------------|
| `src/ui/index.ts` | Any canvas is selected |
| `src/ui/<P>NavSection.tsx` | `sidebar` |
| `src/ui/<P>PluginDrawer.tsx` | `drawer` |
| `src/ui/<P>SettingsDrawer.tsx` | `drawer` |
| `src/ui/use<P>Settings.ts` | `drawer` |
| `src/ui/<P>MenuBarIcon.tsx` | `menu-bar` |
| `src/ui/<P>MenuBarContent.tsx` | `menu-bar` |
| `src/ui/<P><E>EntityDrawer.tsx` | `drawer` + entity |

`<P>` = PascalCase plugin name, `<E>` = PascalCase entity name.

::: info EXAMPLE
For `--name=github-issues --entity=pull-request`, the PascalCase forms are `GithubIssues` and `PullRequest`, producing files like `GithubIssuesNavSection.tsx` and `GithubIssuesPullRequestEntityDrawer.tsx`.
:::

---

## Concepts

### Canvas Types

Vienna plugins render UI into **canvases** — named slots in the application shell. Each canvas type serves a different purpose in the user's workflow.

| Canvas | Renders in | Best for |
|--------|-----------|----------|
| `sidebar` | Left navigation panel | Top-level plugin entry points, navigation trees, entity lists |
| `drawer` | Right-side slide-over panel | Entity details, settings, configuration forms |
| `menu-bar` | Top-right toolbar (icon + popover) | Quick-access widgets, status indicators, compact UIs |

The `drawer` canvas is special — it provides the infrastructure that both `sidebar` and `menu-bar` plugins depend on for settings and detail views. That's why it's automatically included when you select either of the other canvas types.

### Authentication Patterns

The `--auth` flag wires a complete authentication flow into your integration file. Each pattern generates the appropriate key definitions, credential storage hooks, and settings UI.

| Pattern | Credential flow | When to use |
|---------|----------------|-------------|
| `oauth` | OAuth 2.0 + PKCE | Third-party services with OAuth support |
| `pat` | Stored personal access token | Services that issue long-lived tokens |
| `api-key` | Single API key | Key-based auth or internal services |
| `none` | No credentials | Public APIs, local-only plugins |

### Entity System

Entities represent domain objects from external services — issues, tasks, documents, pull requests, or any other data type your plugin works with. Each entity gets:

- **Type definitions** with Vienna's entity protocol
- **URI resolvers** for deep-linking and cross-referencing within Vienna
- **GraphQL stubs** for fetching and mutating data
- **Drawer components** for displaying entity details

Entity names must be kebab-case (e.g. `linear-issue`, `github-pr`, `task`). See the [Entity System documentation](/guide/plugin-development#baseentity) for the full entity lifecycle.

---

## What's Next

After scaffolding your plugin:

1. **Install dependencies** — `cd plugins/<name> && pnpm install`
2. **Verify types** — `pnpm typecheck` should pass immediately
3. **Start building** — open `src/index.ts` and follow the inline comments
4. **Learn the SDK** — read the [Plugin Development Guide](/guide/plugin-development) for the full API
5. **See a complete example** — the [Weather Plugin Tutorial](/guide/weather-plugin-tutorial) walks through a menu-bar plugin end-to-end
