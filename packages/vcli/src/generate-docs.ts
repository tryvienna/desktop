/**
 * Auto-generate comprehensive CLI reference documentation.
 *
 * Introspects the Commander program tree and augments it with rich metadata
 * (extended descriptions, examples, concept explanations) to produce
 * customer-facing markdown documentation.
 *
 * Usage:
 *   node --experimental-strip-types --experimental-transform-types src/generate-docs.ts [--out <path>]
 *
 * Defaults to writing docs/cli-reference.md relative to the vcli package root.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Command, Option } from 'commander';
import { createProgram } from './program.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');

// ── Rich metadata keyed by full command path (e.g. "vcli plugin scaffold") ──

interface CommandMeta {
  /** Long-form description shown below the command heading. */
  longDescription?: string;
  /** Usage examples rendered in a fenced code block. */
  examples?: string[];
  /** Additional notes rendered after the options table. */
  notes?: string[];
  /** Mapping of option long-flag to extended help text. */
  optionDetails?: Record<string, string>;
}

/**
 * Extended metadata that cannot be expressed in Commander alone.
 * Add entries here when new commands are registered.
 */
const COMMAND_META: Record<string, CommandMeta> = {
  vcli: {
    longDescription:
      'The Vienna CLI (`vcli`) is the official command-line tool for Vienna plugin development. ' +
      'It provides scaffolding, code generation, and developer utilities to help you build, ' +
      'test, and ship plugins for the Vienna platform.',
  },
  'vcli plugin': {
    longDescription:
      'Parent command for all plugin development workflows — scaffolding new plugins, ' +
      'validating configuration, and more.',
  },
  'vcli plugin scaffold': {
    longDescription:
      'Generate a complete, ready-to-develop Vienna plugin from a single command. ' +
      'The scaffold produces a fully-typed TypeScript project with the plugin definition, ' +
      'integration hooks, UI components, entity definitions, GraphQL operations, and ' +
      'all necessary configuration files.\n\n' +
      'The generated code follows Vienna plugin conventions and is immediately ' +
      'type-checkable with `pnpm typecheck`.',
    examples: [
      '# Create a minimal plugin with default sidebar + drawer canvases\nvcli plugin scaffold --name=my-plugin',
      '# Full-featured OAuth plugin with entities and all canvas types\nvcli plugin scaffold \\\n  --name=acme \\\n  --canvas=sidebar,drawer,menu-bar \\\n  --entity=task,comment \\\n  --auth=oauth \\\n  --description="Acme project management integration"',
      '# API-key authenticated plugin with a single entity\nvcli plugin scaffold \\\n  --name=weather \\\n  --canvas=menu-bar \\\n  --auth=api-key \\\n  --entity=forecast',
      '# PAT-authenticated sidebar plugin\nvcli plugin scaffold \\\n  --name=tracker \\\n  --canvas=sidebar \\\n  --entity=issue \\\n  --auth=pat',
      '# Preview generated files without writing to disk\nvcli plugin scaffold --name=preview-test --dry-run',
      '# Specify a custom output directory\nvcli plugin scaffold --name=my-plugin --output=/path/to/projects',
    ],
    notes: [
      'When `--output` is not specified, the CLI auto-detects the nearest Vienna registry ' +
        '(by looking for `registry.json` in parent directories) and places the plugin under ' +
        '`plugins/<name>`. If no registry is found, the plugin is created in the current directory.',
      'The `--canvas` option `drawer` is automatically included whenever `sidebar` or ' +
        '`menu-bar` is selected, because those canvases depend on drawer infrastructure.',
      'If the target directory already exists, the command will exit with an error to ' +
        'prevent accidentally overwriting existing work.',
    ],
    optionDetails: {
      '--name':
        'Must be kebab-case: lowercase letters, numbers, and hyphens, starting with a letter. ' +
        'This name is used as the plugin identifier and to derive all other naming variants ' +
        '(PascalCase for components, snake_case for IDs, etc.).',
      '--canvas':
        'Controls which UI surfaces your plugin will render into.\n' +
        '  - **`sidebar`** — Adds a navigation section in the left sidebar.\n' +
        '  - **`drawer`** — Adds a detail drawer, settings drawer, and settings hook.\n' +
        '  - **`menu-bar`** — Adds a menu bar icon and popover content area.\n\n' +
        '  Selecting `sidebar` or `menu-bar` automatically includes `drawer`.',
      '--entity':
        'Comma-separated list of entity type names in kebab-case. For each entity the scaffold generates:\n' +
        '  - An entity definition file (`src/entities/<plugin>-<entity>.ts`)\n' +
        '  - A URI resolver (`src/entities/uri.ts`)\n' +
        '  - GraphQL operations stub (`src/client/operations.ts`)\n' +
        '  - An entity drawer component (when drawer canvas is active)',
      '--auth':
        'Determines the authentication pattern wired into the integration file.\n' +
        '  - **`oauth`** — Full OAuth 2.0 with PKCE flow, client ID/secret key definitions.\n' +
        '  - **`pat`** — Personal access token authentication.\n' +
        '  - **`api-key`** — Simple API key authentication.\n' +
        '  - **`none`** — No authentication (public APIs or internal services).',
      '--dry-run':
        'Lists all files that would be generated and their paths, but does not ' +
        'create any files or directories. Useful for previewing the scaffold output.',
      '--output':
        'Absolute or relative path to the parent directory where the plugin folder will be created. ' +
        'The plugin name is appended automatically (e.g. `--output=/tmp` with `--name=foo` creates `/tmp/foo/`).',
      '--auto-load':
        'When set, the scaffolded plugin is automatically registered in Vienna\'s ' +
        '`.local-plugins.json` manifest so it loads on the next app start. ' +
        'Requires Vienna to have been run at least once (so that the profile directory exists).',
    },
  },
};

// ── Generated file structure documentation ──────────────────────────────────

const GENERATED_FILES_SECTION = `
## Generated Plugin Structure

When you scaffold a plugin, the following files are generated based on your options.
Files marked with a condition are only generated when the corresponding option is active.

### Configuration Files

| File | Description |
|------|-------------|
| \`package.json\` | Package manifest with plugin dependencies (auth-aware) |
| \`tsconfig.json\` | TypeScript configuration (strict mode) |
| \`codegen.ts\` | GraphQL code generation configuration |

### Core Source Files

| File | Description |
|------|-------------|
| \`src/index.ts\` | Plugin definition — registers canvases, entities, and integration |
| \`src/integration.ts\` | Integration hooks — authentication and API client setup |
| \`src/schema.ts\` | GraphQL schema registration for plugin entities |
| \`src/api.ts\` | API client with typed method stubs |

### Entity Files (when \`--entity\` is specified)

| File | Description |
|------|-------------|
| \`src/entities/index.ts\` | Entity barrel export |
| \`src/entities/uri.ts\` | URI resolver for entity deep-linking |
| \`src/entities/<plugin>-<entity>.ts\` | Entity definition (one per entity type) |
| \`src/client/operations.ts\` | GraphQL query/mutation stubs for entities |

### UI Files (conditional by canvas)

| File | Condition | Description |
|------|-----------|-------------|
| \`src/ui/index.ts\` | Any canvas | UI barrel export |
| \`src/ui/<Pascal>NavSection.tsx\` | \`sidebar\` | Sidebar navigation section component |
| \`src/ui/<Pascal>PluginDrawer.tsx\` | \`drawer\` | Main plugin detail drawer |
| \`src/ui/<Pascal>SettingsDrawer.tsx\` | \`drawer\` | Plugin settings drawer |
| \`src/ui/use<Pascal>Settings.ts\` | \`drawer\` | Settings state management hook |
| \`src/ui/<Pascal>MenuBarIcon.tsx\` | \`menu-bar\` | Menu bar icon component |
| \`src/ui/<Pascal>MenuBarContent.tsx\` | \`menu-bar\` | Menu bar popover content |
| \`src/ui/<Pascal><Entity>EntityDrawer.tsx\` | \`drawer\` + entity | Per-entity detail drawer |

> **Note:** \`<Pascal>\` is the PascalCase form of your plugin name (e.g. \`my-plugin\` becomes \`MyPlugin\`).
> \`<Entity>\` is the PascalCase form of each entity name.
`;

// ── Concepts / reference appendix ───────────────────────────────────────────

const CONCEPTS_SECTION = `
## Concepts

### Canvas Types

Vienna plugins can render UI into one or more **canvas** surfaces:

| Canvas | Description |
|--------|-------------|
| \`sidebar\` | A persistent navigation section in the application's left sidebar. Useful for top-level plugin entry points and navigation items. |
| \`drawer\` | A slide-over detail panel. Used for settings, entity details, and plugin configuration. Automatically included when \`sidebar\` or \`menu-bar\` is selected. |
| \`menu-bar\` | An icon in the application's top menu bar with a popover content area. Ideal for quick-access widgets, status indicators, or compact plugin UIs. |

### Authentication Patterns

The \`--auth\` option determines how your plugin authenticates with its backing service:

| Auth Type | Description |
|-----------|-------------|
| \`oauth\` | Full OAuth 2.0 authorization code flow with PKCE. Generates client ID/secret key definitions and token exchange logic. Best for third-party services that support OAuth. |
| \`pat\` | Personal Access Token. Users provide a long-lived token that is stored securely. Simpler than OAuth — good for services that issue PATs (e.g. GitHub, Linear). |
| \`api-key\` | A single API key credential. Suitable for services with key-based auth or internal APIs. |
| \`none\` | No authentication required. Use for public APIs or plugins that don't call external services. |

### Entity System

Entities represent domain objects from external services (e.g. issues, tasks, documents).
When you declare entities via \`--entity\`, the scaffold generates:

- **Type definitions** — typed entity shapes with Vienna's entity protocol
- **URI resolvers** — enable deep-linking and cross-referencing entities within Vienna
- **GraphQL operations** — query/mutation stubs for fetching and mutating entity data
- **Entity drawers** — UI components for displaying entity details (when drawer canvas is active)

Entity names must be kebab-case (e.g. \`linear-issue\`, \`github-pr\`, \`task\`).

### Naming Conventions

All names you provide in kebab-case are automatically converted into the appropriate casing for each context:

| Input (kebab) | snake_case | PascalCase | camelCase | Title Case |
|---------------|-----------|------------|-----------|------------|
| \`my-plugin\` | \`my_plugin\` | \`MyPlugin\` | \`myPlugin\` | \`My Plugin\` |
| \`linear-issue\` | \`linear_issue\` | \`LinearIssue\` | \`linearIssue\` | \`Linear Issue\` |
`;

// ── Generator logic ─────────────────────────────────────────────────────────

function getFullCommandPath(cmd: Command): string {
  const parts: string[] = [];
  let current: Command | null = cmd;
  while (current) {
    const name = current.name();
    if (name) parts.unshift(name);
    current = current.parent as Command | null;
  }
  return parts.join(' ');
}

function getCommandDepth(cmd: Command): number {
  let depth = 0;
  let current: Command | null = cmd.parent as Command | null;
  while (current) {
    depth++;
    current = current.parent as Command | null;
  }
  return depth;
}

function formatOptionFlags(opt: Option): string {
  return opt.flags;
}

function isRequired(opt: Option): boolean {
  // Commander marks options with .requiredOption() — check the mandatory flag.
  // Options with defaults or boolean flags are never truly required from the user's perspective.
  return opt.mandatory === true;
}

function renderOptionRow(opt: Option): string {
  const flags = `\`${formatOptionFlags(opt)}\``;
  const req = isRequired(opt) ? 'Yes' : 'No';
  const def = opt.defaultValue !== undefined && opt.defaultValue !== false
    ? `\`${String(opt.defaultValue)}\``
    : '—';
  const desc = opt.description || '';
  return `| ${flags} | ${desc} | ${req} | ${def} |`;
}

function renderCommand(cmd: Command, lines: string[]): void {
  const fullPath = getFullCommandPath(cmd);
  const depth = getCommandDepth(cmd);
  const heading = '#'.repeat(Math.min(depth + 2, 6)); // h2 for top-level, h3 for sub, etc.
  const meta = COMMAND_META[fullPath];

  // Skip the root program — handled separately in the preamble
  if (depth === 0) {
    // Render children
    for (const sub of cmd.commands as Command[]) {
      renderCommand(sub, lines);
    }
    return;
  }

  lines.push(`${heading} \`${fullPath}\``);
  lines.push('');

  // Short description from Commander
  const desc = cmd.description();
  if (desc) {
    lines.push(`> ${desc}`);
    lines.push('');
  }

  // Long description from metadata
  if (meta?.longDescription) {
    lines.push(meta.longDescription);
    lines.push('');
  }

  // Usage
  const args = cmd.registeredArguments || [];
  const argStr = args.map((a: any) => a.required ? `<${a.name()}>` : `[${a.name()}]`).join(' ');
  const usage = argStr ? `${fullPath} ${argStr} [options]` : `${fullPath} [options]`;
  lines.push('**Usage:**');
  lines.push('');
  lines.push('```bash');
  lines.push(usage);
  lines.push('```');
  lines.push('');

  // Options table
  const options = (cmd.options as Option[]).filter(
    (o) => !o.hidden && o.flags !== '-V, --version',
  );

  if (options.length > 0) {
    lines.push('**Options:**');
    lines.push('');
    lines.push('| Flag | Description | Required | Default |');
    lines.push('|------|-------------|----------|---------|');
    for (const opt of options) {
      lines.push(renderOptionRow(opt));
    }
    lines.push('');

    // Extended option details from metadata
    if (meta?.optionDetails) {
      lines.push('**Option Details:**');
      lines.push('');
      for (const opt of options) {
        const longFlag = opt.long || opt.flags;
        const detail = meta.optionDetails[longFlag];
        if (detail) {
          lines.push(`#### \`${opt.flags}\``);
          lines.push('');
          lines.push(detail);
          lines.push('');
        }
      }
    }
  }

  // Notes
  if (meta?.notes && meta.notes.length > 0) {
    lines.push('**Notes:**');
    lines.push('');
    for (const note of meta.notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  // Examples
  if (meta?.examples && meta.examples.length > 0) {
    lines.push('**Examples:**');
    lines.push('');
    for (const example of meta.examples) {
      lines.push('```bash');
      lines.push(example);
      lines.push('```');
      lines.push('');
    }
  }

  // Subcommands list
  const subs = cmd.commands as Command[];
  if (subs.length > 0) {
    lines.push('**Subcommands:**');
    lines.push('');
    lines.push('| Command | Description |');
    lines.push('|---------|-------------|');
    for (const sub of subs) {
      const subPath = getFullCommandPath(sub);
      const anchor = subPath.replace(/\s+/g, '-').toLowerCase();
      lines.push(`| [\`${sub.name()}\`](#${anchor}) | ${sub.description() || ''} |`);
    }
    lines.push('');
  }

  // Recurse into subcommands
  for (const sub of subs) {
    renderCommand(sub, lines);
  }
}

function generate(): string {
  const program = createProgram();
  const meta = COMMAND_META['vcli'];
  const version = program.version() || '0.0.1';
  const lines: string[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  lines.push('# Vienna CLI Reference');
  lines.push('');
  lines.push(`> **Version:** ${version}`);
  lines.push('>');
  lines.push('> *This documentation is auto-generated from the CLI source. Do not edit manually.*');
  lines.push('');

  // ── Overview ──────────────────────────────────────────────────────────────
  lines.push('## Overview');
  lines.push('');
  if (meta?.longDescription) {
    lines.push(meta.longDescription);
    lines.push('');
  }

  // ── Installation ──────────────────────────────────────────────────────────
  lines.push('## Installation');
  lines.push('');
  lines.push('```bash');
  lines.push('# From within the Vienna registry repository');
  lines.push('pnpm install');
  lines.push('');
  lines.push('# Run directly');
  lines.push('npx vcli --help');
  lines.push('');
  lines.push('# Or via the bin entry');
  lines.push('./packages/vcli/bin/vcli.mjs --help');
  lines.push('```');
  lines.push('');

  // ── Global options ────────────────────────────────────────────────────────
  lines.push('## Global Options');
  lines.push('');
  lines.push('| Flag | Description |');
  lines.push('|------|-------------|');
  lines.push('| `-V, --version` | Display the current version |');
  lines.push('| `-h, --help` | Display help for any command |');
  lines.push('');
  lines.push('Help is available for every command and subcommand:');
  lines.push('');
  lines.push('```bash');
  lines.push('vcli --help');
  lines.push('vcli plugin --help');
  lines.push('vcli plugin scaffold --help');
  lines.push('```');
  lines.push('');

  // ── Table of contents ─────────────────────────────────────────────────────
  lines.push('## Commands');
  lines.push('');
  const allCommands = collectCommands(program);
  for (const cmd of allCommands) {
    const fullPath = getFullCommandPath(cmd);
    const depth = getCommandDepth(cmd);
    if (depth === 0) continue;
    const indent = '  '.repeat(depth - 1);
    const anchor = fullPath.replace(/\s+/g, '-').toLowerCase();
    lines.push(`${indent}- [\`${fullPath}\`](#${anchor}) — ${cmd.description() || ''}`);
  }
  lines.push('');

  // ── Command reference ─────────────────────────────────────────────────────
  renderCommand(program, lines);

  // ── Generated files section ───────────────────────────────────────────────
  lines.push(GENERATED_FILES_SECTION.trim());
  lines.push('');

  // ── Concepts section ──────────────────────────────────────────────────────
  lines.push(CONCEPTS_SECTION.trim());
  lines.push('');

  return lines.join('\n');
}

function collectCommands(cmd: Command): Command[] {
  const result: Command[] = [cmd];
  for (const sub of cmd.commands as Command[]) {
    result.push(...collectCommands(sub));
  }
  return result;
}

// ── CLI entry point ─────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-docs.ts')) {
  const args = process.argv.slice(2);
  let outPath: string;

  const outIdx = args.indexOf('--out');
  if (outIdx !== -1 && args[outIdx + 1]) {
    outPath = path.resolve(args[outIdx + 1]);
  } else {
    outPath = path.join(PACKAGE_ROOT, 'docs', 'cli-reference.md');
  }

  const markdown = generate();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown, 'utf-8');
  console.log(`Docs written to ${outPath} (${markdown.split('\n').length} lines)`);
}
