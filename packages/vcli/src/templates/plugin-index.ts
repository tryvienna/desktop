import type { TemplateContext } from '../types.ts';

export function renderPluginIndex(ctx: TemplateContext): string {
  const { naming, entities, canvases, auth } = ctx;
  const pascal = naming.pascalName;
  const id = naming.pluginId;

  // ── Imports ────────────────────────────────────────────────────────────
  const imports: string[] = [
    `import { definePlugin } from '@tryvienna/sdk';`,
    `import { ${naming.camelName}Integration } from './integration';`,
  ];

  if (entities.length > 0) {
    const entityImports = entities
      .map((e) => `${naming.camelName}${e.entityPascal}Entity`)
      .join(', ');
    imports.push(`import { ${entityImports} } from './entities';`);
  }

  // Canvas component imports
  if (canvases.has('sidebar')) {
    imports.push(`import { ${pascal}NavSection } from './ui/${pascal}NavSection';`);
  }
  if (canvases.has('drawer')) {
    imports.push(`import { ${pascal}PluginDrawer } from './ui/${pascal}PluginDrawer';`);
  }
  if (canvases.has('menu-bar')) {
    imports.push(`import { ${pascal}MenuBarIcon } from './ui/${pascal}MenuBarIcon';`);
    imports.push(`import { ${pascal}MenuBarContent } from './ui/${pascal}MenuBarContent';`);
  }
  if (canvases.has('feed')) {
    imports.push(`import { ${pascal}FeedComponent } from './ui/${pascal}FeedComponent';`);
  }

  // ── Icon ───────────────────────────────────────────────────────────────
  const iconBlock = `
// TODO: Replace with your plugin's SVG icon
const PLUGIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';`;

  // ── Entities array ─────────────────────────────────────────────────────
  const entitiesArray = entities.length > 0
    ? `[${entities.map((e) => `${naming.camelName}${e.entityPascal}Entity`).join(', ')}]`
    : '[]';

  // ── Canvases object ────────────────────────────────────────────────────
  const canvasLines: string[] = [];

  if (canvases.has('sidebar')) {
    canvasLines.push(`    'nav-sidebar': {
      component: ${pascal}NavSection,
      label: '${naming.displayName}',
      priority: 50,
    },`);
  }

  if (canvases.has('drawer')) {
    canvasLines.push(`    drawer: {
      component: ${pascal}PluginDrawer,
      label: '${naming.displayName}',
    },`);
  }

  if (canvases.has('menu-bar')) {
    canvasLines.push(`    'menu-bar': {
      icon: ${pascal}MenuBarIcon,
      component: ${pascal}MenuBarContent,
      label: '${naming.displayName}',
      priority: 30,
    },`);
  }

  if (canvases.has('feed')) {
    canvasLines.push(`    feed: {
      component: ${pascal}FeedComponent,
      label: '${naming.displayName}',
      description: '${ctx.description}',
      priority: 50,
    },`);
  }

  const canvasesBlock = canvasLines.length > 0
    ? `\n  canvases: {\n${canvasLines.join('\n')}\n  },`
    : '';

  // ── Re-exports ─────────────────────────────────────────────────────────
  const reExports: string[] = [
    `export { ${naming.camelName}Integration } from './integration';`,
  ];
  if (entities.length > 0) {
    const entityExports = entities
      .map((e) => `${naming.camelName}${e.entityPascal}Entity`)
      .join(', ');
    reExports.push(`export { ${entityExports} } from './entities';`);
  }
  reExports.push(`export { register${pascal}Schema } from './schema';`);

  return `/**
 * @vienna/plugin-${naming.pluginName} — ${ctx.description}
 *
 * Self-contained plugin package containing:
 * - Integration definition${auth !== 'none' ? ` (${auth} authentication)` : ''}
 * - Entity definitions (${entities.length > 0 ? entities.map((e) => e.entityDisplayName).join(', ') : 'none'})
 * - GraphQL schema extension
 */

${imports.join('\n')}
${iconBlock}

// ── Plugin Definition ────────────────────────────────────────────────────────

export const ${naming.camelName}Plugin = definePlugin({
  id: '${id}',
  name: '${naming.displayName}',
  description: '${ctx.description}',
  icon: { svg: PLUGIN_SVG },

  integrations: [${naming.camelName}Integration],
  entities: ${entitiesArray},
${canvasesBlock}
});

// ── Re-exports for direct access ─────────────────────────────────────────────

${reExports.join('\n')}
`;
}
