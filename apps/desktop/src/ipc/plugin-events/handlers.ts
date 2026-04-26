/**
 * Plugin Events IPC Handlers — Main process implementation
 *
 * Wires the Event Monitor's IPC methods to the PluginSystem and
 * a file-based saved-events store.
 */

import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { ApiHandlers } from '@vienna/ipc';
import type { PluginSystem } from '@tryvienna/sdk';
import type { pluginEventsApi, CapturedEvent, SavedEvent } from './contract';

/** The emitter shape for plugin events (main → renderer). */
type PluginEventsEmitter = {
  pluginEvents: {
    onEventEmitted: (payload: CapturedEvent) => void;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────

export interface PluginEventsHandlerDeps {
  pluginSystem: PluginSystem;
  /** Directory for persisting saved events (e.g., `<profile>/plugin-events/`). */
  dataDir: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Saved Events Store (file-based)
// ─────────────────────────────────────────────────────────────────────────────

class SavedEventsStore {
  private filePath: string;
  private events: SavedEvent[] = [];
  private loaded = false;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, 'saved-events.json');
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      this.events = JSON.parse(raw) as SavedEvent[];
    } catch {
      this.events = [];
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.events, null, 2), 'utf-8');
  }

  async getAll(): Promise<SavedEvent[]> {
    await this.load();
    return [...this.events];
  }

  async save(event: CapturedEvent, label?: string): Promise<void> {
    await this.load();
    const saved: SavedEvent = {
      ...event,
      label,
      savedAt: new Date().toISOString(),
    };
    this.events.push(saved);
    await this.persist();
  }

  async delete(id: string): Promise<boolean> {
    await this.load();
    const before = this.events.length;
    this.events = this.events.filter((e) => e.id !== id);
    if (this.events.length < before) {
      await this.persist();
      return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    this.events = [];
    await this.persist();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC forwarding setup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wire PluginSystem.onEmit to forward events to the renderer as IPC events.
 * Call this once during main process initialization.
 * Returns an unsubscribe function.
 */
export function startEventForwarding(
  pluginSystem: PluginSystem,
  emitter: PluginEventsEmitter,
): () => void {
  return pluginSystem.onEmit((eventName: string, payload: unknown, listenerCount: number) => {
    const captured: CapturedEvent = {
      id: randomUUID(),
      eventName,
      payload,
      timestamp: new Date().toISOString(),
      listenerCount,
    };
    emitter.pluginEvents.onEventEmitted(captured);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler factory
// ─────────────────────────────────────────────────────────────────────────────

export function createPluginEventsHandlers(
  deps: PluginEventsHandlerDeps,
): ApiHandlers<typeof pluginEventsApi> {
  const store = new SavedEventsStore(deps.dataDir);

  return {
    pluginEvents: {
      getRegisteredEvents: async () => ({
        events: deps.pluginSystem.getEventSummaries(),
      }),

      replayEvent: async ({ eventName, payload }: { eventName: string; payload: unknown }) => {
        try {
          // Find the event owner so we can emit on their behalf
          const owner = deps.pluginSystem.getEventSummaries()
            .find((s: { qualifiedName: string }) => s.qualifiedName === eventName)?.ownerPluginId;

          if (!owner) {
            return { success: false, error: `Unknown event: ${eventName}` };
          }

          deps.pluginSystem.emit(owner, eventName, payload);
          const summary = deps.pluginSystem.getEventSummaries()
            .find((s: { qualifiedName: string }) => s.qualifiedName === eventName);
          return { success: true, listenerCount: summary?.listenerCount ?? 0 };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },

      saveEvent: async ({ event, label }: { event: CapturedEvent; label?: string }) => {
        await store.save(event, label);
        return { success: true };
      },

      getSavedEvents: async () => ({
        events: await store.getAll(),
      }),

      deleteSavedEvent: async ({ id }: { id: string }) => ({
        success: await store.delete(id),
      }),

      clearSavedEvents: async () => {
        await store.clear();
        return { success: true };
      },
    },
  };
}
