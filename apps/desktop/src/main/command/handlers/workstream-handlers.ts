/**
 * Workstream Command Handlers
 *
 * @ai-context
 * Handlers for workstream management commands. Most workstream commands
 * are handled in the renderer (via flows or direct UI) so these return
 * 'none' actions. Future: add server-side workstream ops here.
 *
 * @module main/command/handlers/workstream-handlers
 */

import type { CommandHandler } from '../CommandRegistry';

/**
 * Create workstream command handlers.
 */
export function createWorkstreamHandlers(): Record<string, CommandHandler> {
  return {
    // Renderer-handled commands (palette flows, direct UI actions)
    'app:new-workstream': async () => ({ type: 'none' }),
    'workstream:browse': async () => ({ type: 'none' }),
    'workstream:settings': async () => ({ type: 'none' }),
    'workstream:recall-message': async () => ({ type: 'none' }),
    'workstream:archive': async () => ({ type: 'none' }),
    'workstream:delete': async () => ({ type: 'none' }),
    'workstream:unarchive': async () => ({ type: 'none' }),
    'workstream:pin': async () => ({ type: 'none' }),
    'workstream:unpin': async () => ({ type: 'none' }),
    'workstream:mark-needs-verification': async () => ({ type: 'none' }),
    'workstream:toggle-previous': async () => ({ type: 'none' }),
    'workstream:open-changes': async () => ({ type: 'none' }),

    // Group commands (renderer-handled via palette flows)
    'group:create': async () => ({ type: 'none' }),
    'group:rename': async () => ({ type: 'none' }),
    'group:pin': async () => ({ type: 'none' }),
    'group:unpin': async () => ({ type: 'none' }),
    'group:archive': async () => ({ type: 'none' }),
    'group:delete': async () => ({ type: 'none' }),
  };
}
