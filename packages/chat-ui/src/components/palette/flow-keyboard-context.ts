/**
 * FlowKeyboardContext — Keyboard event bridge for flow screen components
 *
 * @ai-context
 * - Allows FlowList/FlowConfirmation to register keyboard handlers with CommandPaletteWithFlows
 * - Parent forwards events through capture-phase document listener
 * - Returns null when no provider is mounted (standalone fallback mode)
 */

import { createContext } from 'react';

export interface FlowKeyboardContextValue {
  /** Register a keyboard handler. Returns true if the event was handled. */
  register: (handler: (e: KeyboardEvent) => boolean) => void;
  /** Unregister the keyboard handler. */
  unregister: () => void;
}

export const FlowKeyboardContext = createContext<FlowKeyboardContextValue | null>(null);
