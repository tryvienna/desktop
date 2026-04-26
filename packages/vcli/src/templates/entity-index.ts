import type { TemplateContext } from '../types.ts';

export function renderEntityIndex(ctx: TemplateContext): string {
  const { naming, entities } = ctx;

  const exports = entities
    .map(
      (e) =>
        `export { ${naming.camelName}${e.entityPascal}Entity } from './${naming.pluginName}-${e.entityName}';`,
    )
    .join('\n');

  return `${exports}
export { ${naming.pluginId.toUpperCase()}_URI_SEGMENTS } from './uri';
`;
}
