/**
 * usePluginStorage — Persistent plugin storage hook with cross-component sync.
 *
 * Replaces the boilerplate pattern of localStorage + CustomEvent that every
 * plugin currently copies. Provides typed, persistent key-value storage
 * that automatically syncs across all components using the same key.
 *
 * Usage:
 * ```ts
 * interface MySettings { apiKey: string; theme: 'light' | 'dark' }
 * const defaults: MySettings = { apiKey: '', theme: 'light' };
 *
 * function MyComponent() {
 *   const { data, update, reset } = usePluginStorage<MySettings>('my-plugin-settings', defaults);
 *   // data.theme is typed as 'light' | 'dark'
 *   // update({ theme: 'dark' }) merges and persists
 *   // reset() restores defaults
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Use globalThis to access browser APIs without requiring DOM lib in tsconfig.
// This hook only runs in the renderer process where these APIs are available.
const win = globalThis as unknown as {
  localStorage: { getItem(k: string): string | null; setItem(k: string, v: string): void };
  addEventListener(type: string, handler: () => void): void;
  removeEventListener(type: string, handler: () => void): void;
  dispatchEvent(event: unknown): void;
  CustomEvent: new (type: string) => unknown;
};

const STORAGE_EVENT_PREFIX = 'vienna-plugin-storage:';

function loadFromStorage<T>(key: string, defaults: T): T {
  try {
    const raw = win.localStorage.getItem(key);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    // Corrupted data — fall back to defaults
  }
  return defaults;
}

function saveToStorage<T>(key: string, value: T): void {
  win.localStorage.setItem(key, JSON.stringify(value));
  win.dispatchEvent(new win.CustomEvent(STORAGE_EVENT_PREFIX + key));
}

export interface UsePluginStorageResult<T> {
  /** Current stored data, merged with defaults. */
  data: T;
  /** Merge a partial update into storage. Persists immediately and syncs across components. */
  update: (patch: Partial<T>) => void;
  /** Reset storage to defaults. */
  reset: () => void;
}

/**
 * Persistent plugin storage with automatic cross-component synchronization.
 *
 * @param key — Unique storage key (namespaced per plugin, e.g. 'weather-settings')
 * @param defaults — Default values (used on first load and for reset)
 * @returns { data, update, reset }
 */
export function usePluginStorage<T extends Record<string, unknown>>(
  key: string,
  defaults: T,
): UsePluginStorageResult<T> {
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const [data, setData] = useState<T>(() => loadFromStorage(key, defaults));

  // Sync across components via CustomEvent
  useEffect(() => {
    const eventName = STORAGE_EVENT_PREFIX + key;
    const handler = () => setData(loadFromStorage(key, defaultsRef.current));
    win.addEventListener(eventName, handler);
    return () => win.removeEventListener(eventName, handler);
  }, [key]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setData((prev) => {
        const next = { ...prev, ...patch } as T;
        saveToStorage(key, next);
        return next;
      });
    },
    [key],
  );

  const reset = useCallback(() => {
    const fresh = defaultsRef.current;
    setData(fresh);
    saveToStorage(key, fresh);
  }, [key]);

  return { data, update, reset };
}
