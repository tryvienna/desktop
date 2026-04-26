import type { TemplateContext } from '../types.ts';

export function renderUiIndex(ctx: TemplateContext): string {
  const { naming, entities, canvases } = ctx;
  const pascal = naming.pascalName;
  const lines: string[] = [];

  if (canvases.has('sidebar')) {
    lines.push(`export { ${pascal}NavSection } from './${pascal}NavSection';`);
  }

  if (canvases.has('drawer')) {
    lines.push(`export { ${pascal}PluginDrawer } from './${pascal}PluginDrawer';`);
    lines.push(`export { ${pascal}SettingsDrawer } from './${pascal}SettingsDrawer';`);
  }

  if (canvases.has('menu-bar')) {
    lines.push(`export { ${pascal}MenuBarIcon } from './${pascal}MenuBarIcon';`);
    lines.push(`export { ${pascal}MenuBarContent } from './${pascal}MenuBarContent';`);
  }

  if (canvases.has('feed')) {
    lines.push(`export { ${pascal}FeedComponent } from './${pascal}FeedComponent';`);
  }

  for (const entity of entities) {
    if (canvases.has('drawer')) {
      lines.push(
        `export { ${pascal}${entity.entityPascal}EntityDrawer } from './${pascal}${entity.entityPascal}EntityDrawer';`,
      );
    }
  }

  return lines.join('\n') + '\n';
}
