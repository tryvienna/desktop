/**
 * Navigation Command Handlers
 *
 * @ai-context
 * Handlers for navigation commands (app:nav-home, app:toggle-sidebar, etc.).
 * Each handler is a pure function returning a CommandResultAction — no
 * Electron imports, fully testable.
 *
 * @module main/command/handlers/navigation-handlers
 */

import type { CommandHandler } from '../CommandRegistry';

/**
 * Create navigation command handlers.
 * These return 'navigate' or 'none' actions for the renderer to process.
 */
export function createNavigationHandlers(): Record<string, CommandHandler> {
  return {
    'app:nav-home': async () => ({
      type: 'navigate',
      path: '/',
    }),
    'app:nav-settings': async () => ({
      type: 'navigate',
      path: '/settings',
    }),
    'tag:create': async () => ({
      type: 'navigate',
      path: '/settings?tab=tags',
    }),
    'tag:manage': async () => ({
      type: 'navigate',
      path: '/settings?tab=tags',
    }),
    // Commands handled entirely in the renderer (palette open, sidebar toggle, etc.)
    // return 'none' — the renderer handles them via useGlobalShortcuts callbacks
    'app:command-palette': async () => ({ type: 'none' }),
    'app:entity-browser': async () => ({ type: 'none' }),
    'app:toggle-sidebar': async () => ({ type: 'none' }),
    'app:toggle-drawer': async () => ({ type: 'none' }),
    'app:keyboard-shortcuts': async () => ({ type: 'none' }),
  };
}
