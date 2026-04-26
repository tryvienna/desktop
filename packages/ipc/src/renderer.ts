/**
 * Renderer process IPC client.
 *
 * Provides typed access to the IPC API exposed by the preload script.
 */

import type { ApiDefinition, ApiToClient, EventsDefinition, EventsToSubscriptions } from './define';

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function getWindowValue(key: string): unknown {
  return (globalThis as Record<string, unknown>)[key];
}

// ---------------------------------------------------------------------------
// getApi / getEvents
// ---------------------------------------------------------------------------

/**
 * Get the typed IPC API client.
 *
 * Retrieves the API exposed via contextBridge in the preload script.
 * The `_api` parameter is used for type inference only — it is not accessed at runtime.
 *
 * @example
 * ```ts
 * import { getApi } from '@vienna/ipc/renderer';
 * import { api } from './contract';
 *
 * const client = getApi(api);
 * const user = await client.users.create({ name: 'John', email: 'j@example.com' });
 * ```
 *
 * @throws Error if the API is not available on `window[windowKey]`.
 */
export function getApi<T extends ApiDefinition>(
  _api: T,
  windowKey: string = 'api'
): ApiToClient<T> {
  const value = getWindowValue(windowKey);
  if (!value) {
    throw new Error(
      `[IPC] window.${windowKey} is not available. ` +
        `Ensure the preload script calls expose() with apiKey: '${windowKey}'.`
    );
  }
  return value as ApiToClient<T>;
}

/**
 * Get typed event subscriptions.
 *
 * Retrieves the events exposed via contextBridge in the preload script.
 * The `_events` parameter is used for type inference only.
 *
 * @example
 * ```ts
 * import { getEvents } from '@vienna/ipc/renderer';
 * import { events } from './contract';
 *
 * const subscriptions = getEvents(events);
 * const unsub = subscriptions.users.onCreated((payload) => {
 *   console.log('User created:', payload.userId);
 * });
 * // Later: unsub();
 * ```
 *
 * @throws Error if events are not available on `window[windowKey]`.
 */
export function getEvents<T extends EventsDefinition>(
  _events: T,
  windowKey: string = 'events'
): EventsToSubscriptions<T> {
  const value = getWindowValue(windowKey);
  if (!value) {
    throw new Error(
      `[IPC] window.${windowKey} is not available. ` +
        `Ensure the preload script calls expose() with eventsKey: '${windowKey}'.`
    );
  }
  return value as EventsToSubscriptions<T>;
}

// ---------------------------------------------------------------------------
// Availability checks
// ---------------------------------------------------------------------------

/**
 * Check if the IPC API is available on `window`.
 */
export function isApiAvailable(windowKey: string = 'api'): boolean {
  return Boolean(getWindowValue(windowKey));
}

/**
 * Check if IPC events are available on `window`.
 */
export function areEventsAvailable(windowKey: string = 'events'): boolean {
  return Boolean(getWindowValue(windowKey));
}
