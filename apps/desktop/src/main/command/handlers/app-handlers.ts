/**
 * App Command Handlers
 *
 * @ai-context
 * Handlers for app-level commands (toggle-theme, toggle-devtools, reload).
 * Accepts BrowserWindow getter as DI to avoid direct Electron imports.
 *
 * @module main/command/handlers/app-handlers
 */

import type { CommandHandler } from '../CommandRegistry';

export interface AppHandlerDeps {
  /** Get the focused BrowserWindow (or first if none focused). */
  getFocusedWindow: () => { webContents: { toggleDevTools(): void }; reload(): void } | undefined;
}

/**
 * Create app-level command handlers.
 */
export function createAppHandlers(deps: AppHandlerDeps): Record<string, CommandHandler> {
  return {
    'app:toggle-devtools': async () => {
      deps.getFocusedWindow()?.webContents.toggleDevTools();
      return { type: 'none' };
    },
    'app:reload': async () => {
      deps.getFocusedWindow()?.reload();
      return { type: 'none' };
    },
    'app:toggle-theme': async () => ({
      type: 'navigate',
      path: '/settings?tab=appearance',
    }),
  };
}
