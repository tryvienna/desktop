import type { TemplateContext, EntityNaming } from '../types.ts';

export function renderEntity(ctx: TemplateContext, entity: EntityNaming): string {
  const { naming } = ctx;
  const hasDrawer = ctx.canvases.has('drawer');

  const drawerImport = hasDrawer
    ? `import { ${naming.pascalName}${entity.entityPascal}EntityDrawer } from '../ui/${naming.pascalName}${entity.entityPascal}EntityDrawer';\n`
    : '';

  const uiProp = hasDrawer
    ? `\n  ui: { drawer: ${naming.pascalName}${entity.entityPascal}EntityDrawer },`
    : '';

  return `/**
 * ${entity.entityDisplayName} Entity — metadata-only definition.
 *
 * URI: @drift//${entity.entityType}/{id}
 */

import { defineEntity } from '@tryvienna/sdk';
import { ${naming.pluginId.toUpperCase()}_URI_SEGMENTS } from './uri';
${drawerImport}
export const ${naming.camelName}${entity.entityPascal}Entity = defineEntity({
  type: '${entity.entityType}',
  name: '${entity.entityDisplayName}',
  description: 'A ${entity.entityDisplayName.toLowerCase()} from ${naming.displayName}',
  icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>' },
  source: 'integration',
  uri: [...${naming.pluginId.toUpperCase()}_URI_SEGMENTS],

  display: {
    emoji: '📋',
    colors: { bg: '#3B82F6', text: '#FFFFFF', border: '#2563EB' },
    description: '${entity.entityDisplayName} items from ${naming.displayName}',
    outputFields: [
      { key: 'title', label: 'Title', metadataPath: 'title' },
      { key: 'status', label: 'Status', metadataPath: 'status' },
    ],
  },

  cache: { ttl: 30_000, maxSize: 200 },
${uiProp}
});
`;
}
