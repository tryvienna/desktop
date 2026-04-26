/**
 * KeybindingsProvider — React context for keyboard shortcut state.
 *
 * @ai-context
 * Loads keybindings via IPC on mount and subscribes to onChanged events
 * from the main process for push updates. Provides the merged keybindings,
 * defaults, mutation actions, and platform detection to the entire app.
 *
 * @module providers/KeybindingsProvider
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { api, events } from '../ipc';
import type { KeyboardShortcut, KeybindingsMap } from '../keybindings/schemas';
import { findConflicts as findConflictsPure } from '../keybindings/utils';
import type { Platform } from '../keybindings/utils';

interface KeybindingsContextValue {
  /** Current keybindings (merged defaults + user overrides). */
  keybindings: KeybindingsMap | null;
  /** Factory default keybindings. */
  defaults: KeybindingsMap | null;
  /** Loading state. */
  isLoading: boolean;
  /** Error state. */
  error: Error | null;
  /** Platform for formatting ('mac' | 'other'). */
  platform: Platform;
  /** Update a single keybinding. */
  updateKeybinding: (commandId: string, shortcut: KeyboardShortcut) => Promise<void>;
  /** Reset a single keybinding to its default. */
  resetKeybinding: (commandId: string) => Promise<void>;
  /** Reset all keybindings to defaults. */
  resetAllKeybindings: () => Promise<void>;
  /** Get the shortcut for a specific command. */
  getShortcut: (commandId: string) => KeyboardShortcut | undefined;
  /** Find command IDs that conflict with a given shortcut. */
  findConflicts: (shortcut: KeyboardShortcut, excludeCommandId?: string) => string[];
}

const KeybindingsContext = createContext<KeybindingsContextValue | null>(null);

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform;
  const platform = ua ?? navigator.platform;
  return /mac/i.test(platform) ? 'mac' : 'other';
}

export function KeybindingsProvider({ children }: { children: ReactNode }) {
  const [keybindings, setKeybindings] = useState<KeybindingsMap | null>(null);
  const [defaults, setDefaults] = useState<KeybindingsMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const platform = useMemo(detectPlatform, []);

  // Load initial state and subscribe to changes
  useEffect(() => {
    const client = getApi(api);

    Promise.all([
      client.keybindings.get({}),
      client.keybindings.getDefaults({}),
    ])
      .then(([current, defs]) => {
        setKeybindings(current.keybindings);
        setDefaults(defs.keybindings);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    // Subscribe to push updates from main process
    const eventBus = getEvents(events);
    const unsubscribe = eventBus.keybindings.onChanged((payload) => {
      setKeybindings(payload.keybindings);
    });

    return unsubscribe;
  }, []);

  const updateKeybinding = useCallback(
    async (commandId: string, shortcut: KeyboardShortcut) => {
      const client = getApi(api);
      await client.keybindings.update({ commandId, shortcut });
    },
    []
  );

  const resetKeybinding = useCallback(async (commandId: string) => {
    const client = getApi(api);
    await client.keybindings.resetOne({ commandId });
  }, []);

  const resetAllKeybindings = useCallback(async () => {
    const client = getApi(api);
    await client.keybindings.resetAll({});
  }, []);

  const getShortcut = useCallback(
    (commandId: string) => keybindings?.[commandId],
    [keybindings]
  );

  const findConflicts = useCallback(
    (shortcut: KeyboardShortcut, excludeCommandId?: string) => {
      if (!keybindings) return [];
      return findConflictsPure(shortcut, keybindings, excludeCommandId);
    },
    [keybindings]
  );

  const value = useMemo<KeybindingsContextValue>(
    () => ({
      keybindings,
      defaults,
      isLoading,
      error,
      platform,
      updateKeybinding,
      resetKeybinding,
      resetAllKeybindings,
      getShortcut,
      findConflicts,
    }),
    [
      keybindings,
      defaults,
      isLoading,
      error,
      platform,
      updateKeybinding,
      resetKeybinding,
      resetAllKeybindings,
      getShortcut,
      findConflicts,
    ]
  );

  return (
    <KeybindingsContext.Provider value={value}>
      {children}
    </KeybindingsContext.Provider>
  );
}

/** Use keybindings context. Must be within KeybindingsProvider. */
export function useKeybindings(): KeybindingsContextValue {
  const context = useContext(KeybindingsContext);
  if (!context) {
    throw new Error('useKeybindings must be used within a KeybindingsProvider');
  }
  return context;
}
