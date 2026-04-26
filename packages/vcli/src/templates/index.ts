import type { TemplateContext } from '../types.ts';
import { renderPackageJson } from './package-json.ts';
import { renderTsconfig } from './tsconfig.ts';
import { renderCodegen } from './codegen.ts';
import { renderLicense } from './license.ts';
import { renderReadme } from './readme.ts';
import { renderContributing } from './contributing.ts';
import { renderPluginIndex } from './plugin-index.ts';
import { renderIntegration } from './integration.ts';
import { renderSchema } from './schema.ts';
import { renderApi } from './api.ts';
import { renderEntity } from './entity.ts';
import { renderEntityIndex } from './entity-index.ts';
import { renderEntityUri } from './entity-uri.ts';
import { renderOperations } from './operations.ts';
import { renderNavSection } from './nav-section.ts';
import { renderPluginDrawer } from './plugin-drawer.ts';
import { renderSettingsDrawer } from './settings-drawer.ts';
import { renderEntityDrawer } from './entity-drawer.ts';
import { renderMenuBarIcon } from './menu-bar-icon.ts';
import { renderMenuBarContent } from './menu-bar-content.ts';
import { renderUseSettings } from './use-settings.ts';
import { renderFeedComponent } from './feed-component.ts';
import { renderUiIndex } from './ui-index.ts';

/**
 * Build the complete file map for a scaffolded plugin.
 *
 * Returns Map<relativePath, fileContent> — no I/O performed.
 */
export function buildFileMap(ctx: TemplateContext): Map<string, string> {
  const files = new Map<string, string>();
  const { naming, entities, canvases } = ctx;
  const pascal = naming.pascalName;

  // ── Config files ─────────────────────────────────────────────────────────
  files.set('package.json', renderPackageJson(ctx));
  files.set('tsconfig.json', renderTsconfig());
  files.set('codegen.ts', renderCodegen());

  // ── OSS boilerplate ──────────────────────────────────────────────────────
  files.set('LICENSE', renderLicense());
  files.set('README.md', renderReadme(ctx));
  files.set('CONTRIBUTING.md', renderContributing());

  // ── Core source files ────────────────────────────────────────────────────
  files.set('src/index.ts', renderPluginIndex(ctx));
  files.set('src/integration.ts', renderIntegration(ctx));
  files.set('src/schema.ts', renderSchema(ctx));
  files.set('src/api.ts', renderApi(ctx));

  // ── Entity files ─────────────────────────────────────────────────────────
  if (entities.length > 0) {
    files.set('src/entities/index.ts', renderEntityIndex(ctx));
    files.set('src/entities/uri.ts', renderEntityUri(ctx));

    for (const entity of entities) {
      files.set(
        `src/entities/${naming.pluginName}-${entity.entityName}.ts`,
        renderEntity(ctx, entity),
      );
    }
  }

  // ── Client operations ────────────────────────────────────────────────────
  if (entities.length > 0) {
    files.set('src/client/operations.ts', renderOperations(ctx));
  }

  // ── UI files ─────────────────────────────────────────────────────────────
  const hasAnyCanvas = canvases.has('sidebar') || canvases.has('drawer') || canvases.has('menu-bar') || canvases.has('feed');

  if (hasAnyCanvas) {
    files.set('src/ui/index.ts', renderUiIndex(ctx));
  }

  if (canvases.has('sidebar')) {
    files.set(`src/ui/${pascal}NavSection.tsx`, renderNavSection(ctx));
  }

  if (canvases.has('drawer')) {
    files.set(`src/ui/${pascal}PluginDrawer.tsx`, renderPluginDrawer(ctx));
    files.set(`src/ui/${pascal}SettingsDrawer.tsx`, renderSettingsDrawer(ctx));
    files.set(`src/ui/use${pascal}Settings.ts`, renderUseSettings(ctx));
  }

  if (canvases.has('menu-bar')) {
    files.set(`src/ui/${pascal}MenuBarIcon.tsx`, renderMenuBarIcon(ctx));
    files.set(`src/ui/${pascal}MenuBarContent.tsx`, renderMenuBarContent(ctx));
  }

  if (canvases.has('feed')) {
    files.set(`src/ui/${pascal}FeedComponent.tsx`, renderFeedComponent(ctx));
  }

  // ── Entity drawers ───────────────────────────────────────────────────────
  if (canvases.has('drawer') && entities.length > 0) {
    for (const entity of entities) {
      files.set(
        `src/ui/${pascal}${entity.entityPascal}EntityDrawer.tsx`,
        renderEntityDrawer(ctx, entity),
      );
    }
  }

  return files;
}
