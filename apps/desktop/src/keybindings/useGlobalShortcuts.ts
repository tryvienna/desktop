/**
 * useGlobalShortcuts — Central keyboard listener for registered shortcuts.
 *
 * @ai-context
 * Reads keybindings from context, matches keydown events, and dispatches
 * to registered handler functions. Uses a registry pattern (no hardcoded
 * switch) — adding a command is just adding an entry to the handlers object.
 *
 * Always active via capture phase — works even when focus is in input/textarea.
 *
 * @module keybindings/useGlobalShortcuts
 */

import { useEffect, useCallback, useRef } from 'react';
import { useKeybindings } from '../providers/KeybindingsProvider';
import { eventToShortcut, matchKeybinding } from './utils';

export type ShortcutHandler = () => void | Promise<void>;

/** Handler pair for push-to-hold shortcuts (e.g. hold to record, release to stop). */
export interface HoldHandler {
  onStart: () => void | Promise<void>;
  onEnd: () => void | Promise<void>;
}

/**
 * Register global keyboard shortcuts.
 *
 * @param handlers - Map of command ID → handler function (fires on keydown).
 * @param holdHandlers - Map of command ID → {onStart, onEnd} for push-to-hold
 *   shortcuts. `onStart` fires on keydown, `onEnd` fires when any key in the
 *   combo is released. A command should appear in either `handlers` or
 *   `holdHandlers`, not both.
 *
 * @example
 * ```tsx
 * useGlobalShortcuts(
 *   {
 *     'app:command-palette': () => setCommandPaletteOpen(true),
 *     'app:toggle-sidebar': () => toggleSidebar(),
 *   },
 *   {
 *     'input:voice': {
 *       onStart: () => startRecording(),
 *       onEnd: () => stopRecording(),
 *     },
 *   },
 * );
 * ```
 */
export function useGlobalShortcuts(
  handlers: Record<string, ShortcutHandler>,
  holdHandlers?: Record<string, HoldHandler>,
): void {
  const { keybindings } = useKeybindings();
  const handlersRef = useRef(handlers);
  const holdHandlersRef = useRef(holdHandlers);
  // Track which hold command is currently active and which keys are in the combo
  const activeHoldRef = useRef<string | null>(null);
  const activeHoldKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    handlersRef.current = handlers;
    holdHandlersRef.current = holdHandlers;
  });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!keybindings) return;

      const shortcut = eventToShortcut(event);
      if (!shortcut) return;

      const commandId = matchKeybinding(shortcut, keybindings);
      if (!commandId) return;

      // Check hold handlers first
      const holdHandler = holdHandlersRef.current?.[commandId];
      if (holdHandler) {
        event.preventDefault();
        event.stopPropagation();
        // Only fire onStart once (ignore key repeat)
        if (!activeHoldRef.current) {
          activeHoldRef.current = commandId;
          // Track the keys in this combo so keyup only fires for relevant releases.
          // For Alt+Space: track both 'Alt' and ' ' (space).
          const keys = new Set<string>();
          if (event.metaKey) keys.add('Meta');
          if (event.ctrlKey) keys.add('Control');
          if (event.altKey) keys.add('Alt');
          if (event.shiftKey) keys.add('Shift');
          keys.add(event.key);
          activeHoldKeysRef.current = keys;
          void holdHandler.onStart();
        }
        return;
      }

      const handler = handlersRef.current[commandId];
      if (!handler) return;

      event.preventDefault();
      event.stopPropagation();
      void handler();
    },
    [keybindings]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!activeHoldRef.current) return;

      const commandId = activeHoldRef.current;
      const holdHandler = holdHandlersRef.current?.[commandId];
      if (!holdHandler) return;

      // Only end the hold when a key that's part of the active combo is released.
      // Releasing unrelated keys (e.g. accidentally brushing another key) is ignored.
      if (activeHoldKeysRef.current.has(event.key)) {
        activeHoldRef.current = null;
        activeHoldKeysRef.current.clear();
        void holdHandler.onEnd();
      }
    },
    []
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keyup', handleKeyUp, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [handleKeyDown, handleKeyUp]);
}
