/**
 * Agent / Claude Command Handlers
 *
 * @ai-context
 * Handlers for Claude agent commands (switch-model, clear, compact, etc.).
 * Most agent commands are renderer-only (handled via palette flows) so they
 * return 'none' actions. Commands that need main-process interaction
 * delegate to the SessionManager.
 *
 * @module main/command/handlers/agent-handlers
 */

import type { CommandHandler } from '../CommandRegistry';

/**
 * Create agent command handlers.
 * Agent commands are primarily renderer-handled via flows.
 */
export function createAgentHandlers(): Record<string, CommandHandler> {
  return {
    // Flow-based commands — rendered in the palette overlay
    'claude:switch-model': async () => ({ type: 'none' }),
    'claude:clear-conversation': async () => ({ type: 'none' }),
    'claude:cost': async () => ({ type: 'none' }),
    'claude:permissions': async () => ({ type: 'none' }),
    'claude:todos': async () => ({ type: 'none' }),
    'claude:add-dir': async () => ({ type: 'none' }),

    // Direct commands
    'claude:compact': async () => ({ type: 'none' }),
    'claude:mcp': async () => ({
      type: 'navigate',
      path: '/settings?tab=mcp',
    }),
    'claude:memory': async () => ({ type: 'none' }),
  };
}
