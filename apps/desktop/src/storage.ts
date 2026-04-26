import { z } from 'zod';
import { useState, useCallback, useEffect } from 'react';

// ── Registry ──────────────────────────────────────────────────────────
// Every localStorage key used by the desktop app is declared here.
// Adding a new key = adding one entry. Types and defaults are co-located.

const storageRegistry = {
  sidebarWidth: {
    key: 'vienna:sidebar:width',
    schema: z.number().int().positive(),
    default: 256,
  },
  panelWidth: {
    key: 'vienna:panel:width',
    schema: z.number().int().positive(),
    default: 400,
  },
  sidebarCollapsed: {
    key: 'vienna:sidebar:collapsed',
    schema: z.boolean(),
    default: false,
  },
  drawerWidth: {
    key: 'vienna:drawer:width',
    schema: z.number().int().positive(),
    default: 400,
  },
  activeProjectId: {
    key: 'vienna:activeProjectId',
    schema: z.string().nullable(),
    default: null as string | null,
  },
  routineFormDisabledSteps: {
    key: 'vienna:action-form:new-routine:disabled-steps',
    schema: z.array(z.string()),
    default: [] as string[],
  },
  taskFormDisabledSteps: {
    key: 'vienna:action-form:new-task:disabled-steps',
    schema: z.array(z.string()),
    default: [] as string[],
  },
  taskDisplaySettings: {
    key: 'vienna:tasks:display-settings',
    schema: z.object({
      statusTypes: z.array(z.string()),
      groupBy: z.enum(['none', 'status', 'priority', 'label', 'assignee']),
      sortBy: z.enum(['created', 'updated', 'priority', 'due_date']),
      limit: z.number().int().positive(),
    }),
    default: {
      statusTypes: ['backlog', 'todo', 'in_progress'],
      groupBy: 'none' as const,
      sortBy: 'created' as const,
      limit: 50,
    },
  },
  pluginFormDisabledSteps: {
    key: 'vienna:action-form:new-plugin:disabled-steps',
    schema: z.array(z.string()),
    default: [] as string[],
  },
  pluginInstallState: {
    key: 'vienna:pluginInstallState',
    schema: z.record(z.string(), z.boolean()),
    default: {} as Record<string, boolean>,
  },
  trayEmoji: {
    key: 'vienna:tray:emoji',
    schema: z.string(),
    default: '😊',
  },
  feedEnabled: {
    key: 'vienna:feed:enabled',
    schema: z.boolean(),
    default: true,
  },
  sidebarExpansionState: {
    key: 'vienna:sidebar:expansionState',
    schema: z.object({
      sections: z.array(z.string()),
      items: z.array(z.string()),
      collapsedSections: z.array(z.string()).optional(),
    }),
    default: { sections: [], items: [], collapsedSections: [] } as {
      sections: string[];
      items: string[];
      collapsedSections?: string[];
    },
  },
} satisfies Record<string, { key: string; schema: z.ZodType; default: unknown }>;

type StorageRegistry = typeof storageRegistry;
type StorageKey = keyof StorageRegistry;
type StorageValue<K extends StorageKey> = z.infer<StorageRegistry[K]['schema']>;

// ── Scoped entries ───────────────────────────────────────────────────
// Keys that include a dynamic scope (e.g. userId). Not usable with usePersistedState
// since the scope is determined at runtime.

const scopedRegistry = {
  activeWorkstreamId: {
    key: (userId: string) => `vienna:${userId}:activeWorkstreamId`,
    schema: z.string(),
  },
} satisfies Record<string, { key: (scope: string) => string; schema: z.ZodType }>;

type ScopedRegistry = typeof scopedRegistry;
type ScopedKey = keyof ScopedRegistry;
type ScopedValue<K extends ScopedKey> = z.infer<ScopedRegistry[K]['schema']>;

export function readScoped<K extends ScopedKey>(name: K, scope: string): ScopedValue<K> | null {
  const entry = scopedRegistry[name];
  try {
    const raw = localStorage.getItem(entry.key(scope));
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    const result = entry.schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function writeScoped<K extends ScopedKey>(name: K, scope: string, value: ScopedValue<K> | null): void {
  const entry = scopedRegistry[name];
  try {
    if (value !== null) {
      localStorage.setItem(entry.key(scope), JSON.stringify(value));
    } else {
      localStorage.removeItem(entry.key(scope));
    }
  } catch { /* ignore */ }
}

// ── Hook ──────────────────────────────────────────────────────────────

// ── Cross-instance sync event ────────────────────────────────────────
// When one hook instance updates a key, other instances of the same key
// need to re-read. We use a custom DOM event since all instances are
// in the same renderer window.

const SYNC_EVENT = 'vienna:storage-sync';

function emitStorageSync(storageKey: string): void {
  // eslint-disable-next-line no-restricted-properties
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key: storageKey } }));
}

export function usePersistedState<K extends StorageKey>(
  name: K
): [StorageValue<K>, (value: StorageValue<K> | ((prev: StorageValue<K>) => StorageValue<K>)) => void] {
  const entry = storageRegistry[name];

  const readFromStorage = useCallback((): StorageValue<K> => {
    try {
      // eslint-disable-next-line no-restricted-properties
      const raw = window.localStorage.getItem(entry.key);
      if (raw === null) return entry.default as StorageValue<K>;
      const parsed = JSON.parse(raw);
      const result = entry.schema.safeParse(parsed);
      return result.success ? result.data : (entry.default as StorageValue<K>);
    } catch {
      return entry.default as StorageValue<K>;
    }
  }, [entry]);

  const [value, setValue] = useState<StorageValue<K>>(readFromStorage);

  // Listen for sync events from other hook instances using the same key
  useEffect(() => {
    const handler = (e: Event) => {
      const { key } = (e as CustomEvent<{ key: string }>).detail;
      if (key === entry.key) {
        setValue(readFromStorage());
      }
    };
    // eslint-disable-next-line no-restricted-properties
    window.addEventListener(SYNC_EVENT, handler);
    // eslint-disable-next-line no-restricted-properties
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, [entry.key, readFromStorage]);

  const update = useCallback(
    (v: StorageValue<K> | ((prev: StorageValue<K>) => StorageValue<K>)) => {
      setValue((prev) => {
        const next = typeof v === 'function'
          ? (v as (prev: StorageValue<K>) => StorageValue<K>)(prev)
          : v;
        try {
          // eslint-disable-next-line no-restricted-properties
          window.localStorage.setItem(entry.key, JSON.stringify(next));
        } catch {
          /* quota exceeded, SSR, etc. */
        }
        // Notify other hook instances
        emitStorageSync(entry.key);
        return next;
      });
    },
    [entry]
  );

  return [value, update];
}
