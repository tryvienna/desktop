import type { TemplateContext } from '../types.ts';

/**
 * README.md for a scaffolded plugin. Includes placeholder sections the
 * author is expected to fill in before publishing.
 */
export function renderReadme(ctx: TemplateContext): string {
  const { naming } = ctx;
  return `# plugin-${naming.pluginName}

${ctx.description}

A plugin for [Vienna](https://github.com/tryvienna/desktop) — a local-first,
provider-agnostic desktop IDE for orchestrating AI coding agents.

## Install

From inside Vienna: open the plugins drawer and search for
\`plugin-${naming.pluginName}\`. Or install via \`vcli\`:

\`\`\`bash
vcli plugin install plugin-${naming.pluginName}
\`\`\`

## What it does

<!-- List the concrete capabilities this plugin adds. -->

-
-
-

## Permissions

<!-- Explain what the plugin asks to read/write. Users audit this
before installing. -->

-
-

## Configuration

<!-- Per-workstream or per-project settings, auth (OAuth vs token),
env vars, etc. Include a minimal example. -->

## Development

\`\`\`bash
pnpm install
pnpm typecheck
pnpm lint
\`\`\`

See [Vienna's plugin author guide][author-guide] for the full
development workflow, SDK reference, and contribution guidelines.

[author-guide]: https://github.com/tryvienna/desktop/blob/main/skills/plugin-dev/SKILL.md

## Contributing

Contributions welcome. Please read
[CONTRIBUTING.md](./CONTRIBUTING.md) first.

## License

[Apache 2.0](./LICENSE). Copyright 2026 Vienna Contributors.
`;
}
