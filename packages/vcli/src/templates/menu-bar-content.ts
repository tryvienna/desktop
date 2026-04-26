import type { TemplateContext } from '../types.ts';

export function renderMenuBarContent(ctx: TemplateContext): string {
  const { naming } = ctx;
  const pascal = naming.pascalName;

  return `/**
 * ${pascal}MenuBarContent — Menu bar popover content.
 */

import type { MenuBarCanvasProps } from '@tryvienna/sdk';

export function ${pascal}MenuBarContent({
  pluginId,
  onClose,
  openPluginDrawer,
  hostApi,
  logger,
}: MenuBarCanvasProps) {
  return (
    <div className="flex flex-col gap-2 p-3 w-72">
      <h3 className="text-sm font-medium">${naming.displayName}</h3>
      <p className="text-xs text-muted-foreground">
        Plugin content goes here.
      </p>
      <button
        type="button"
        className="text-xs text-primary bg-transparent border-none cursor-pointer hover:underline text-left"
        onClick={() => {
          openPluginDrawer({ view: 'settings' });
          onClose();
        }}
      >
        Settings
      </button>
    </div>
  );
}
`;
}
