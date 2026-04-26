/**
 * Keybindings IPC Handlers
 *
 * @ai-context
 * Factory function that creates typed IPC handlers for the keybindings API.
 * Thin delegation to KeybindingsManager — no business logic here.
 * Main process only.
 *
 * @module ipc/keybindings/handlers
 */

import type { ApiHandlers } from '@vienna/ipc';
import type { keybindingsApi } from './contract';
import type { KeybindingsManager } from '../../main/keybindings/KeybindingsManager';

export function createKeybindingsHandlers(
  manager: KeybindingsManager
): ApiHandlers<typeof keybindingsApi> {
  return {
    keybindings: {
      get: async () => ({
        keybindings: manager.getKeybindings(),
      }),
      getDefaults: async () => ({
        keybindings: manager.getDefaultKeybindings(),
      }),
      update: async ({ commandId, shortcut }) => {
        await manager.updateKeybinding(commandId, shortcut);
        return { success: true };
      },
      resetOne: async ({ commandId }) => {
        await manager.resetKeybinding(commandId);
        return { success: true };
      },
      resetAll: async () => {
        await manager.resetAllKeybindings();
        return { success: true };
      },
    },
  };
}
