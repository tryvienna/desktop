import type { TemplateContext } from '../types.ts';

export function renderPluginDrawer(ctx: TemplateContext): string {
  const { naming } = ctx;
  const pascal = naming.pascalName;

  return `/**
 * ${pascal}PluginDrawer — Plugin-level drawer for the ${naming.displayName} plugin.
 *
 * Routes between views based on \`payload.view\`:
 * - 'settings' \u2192 ${pascal}SettingsDrawer
 * - default \u2192 Settings redirect
 *
 * The host app wraps this in DrawerContainer (providing title, close button, etc.),
 * so this component only renders content \u2014 no drawer chrome needed.
 */

import { DrawerBody } from '@tryvienna/ui';
import type { PluginDrawerCanvasProps } from '@tryvienna/sdk';
import { ${pascal}SettingsDrawer } from './${pascal}SettingsDrawer';

export function ${pascal}PluginDrawer({
  payload,
  drawer,
  hostApi,
  logger,
}: PluginDrawerCanvasProps) {
  const view = (payload.view as string) ?? 'default';

  switch (view) {
    case 'settings':
      return (
        <DrawerBody>
          <${pascal}SettingsDrawer hostApi={hostApi} logger={logger} />
        </DrawerBody>
      );

    default:
      return (
        <DrawerBody>
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              className="text-xs text-primary bg-transparent border-none cursor-pointer hover:underline"
              onClick={() => drawer.open({ view: 'settings' })}
            >
              Open Settings
            </button>
          </div>
        </DrawerBody>
      );
  }
}
`;
}
