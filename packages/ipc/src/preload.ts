/**
 * Preload script IPC exposure.
 *
 * Provides `expose()` for safely bridging IPC APIs to the renderer process
 * via Electron's contextBridge.
 */

import type {
  ApiDefinition,
  ChannelResolver,
  EventChannelResolver,
  EventDescriptor,
  EventsDefinition,
  IpcResult,
  MethodDescriptor,
} from './define';
import { resolveChannel, resolveEventChannel } from './define';
import { IpcMethodError } from './errors';
import type { IpcError } from './errors';

// ---------------------------------------------------------------------------
// Electron type stubs
// ---------------------------------------------------------------------------

/** Minimal ContextBridge interface matching Electron's contextBridge. */
export interface ContextBridgeLike {
  exposeInMainWorld(apiKey: string, api: Record<string, unknown>): void;
}

/** Minimal IpcRenderer interface matching Electron's ipcRenderer. */
export interface IpcRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (...args: unknown[]) => void): void;
}

// ---------------------------------------------------------------------------
// expose()
// ---------------------------------------------------------------------------

export interface ExposeOptions {
  /** Validate inputs before IPC round-trip (fail fast). Default: false */
  validateInput?: boolean;
  /** Window key for exposed API methods. Default: 'api' */
  apiKey?: string;
  /** Window key for exposed event subscriptions. Default: 'events' */
  eventsKey?: string;
  /** Log IPC calls. Default: false */
  verbose?: boolean;
  /** Custom channel resolver for methods. */
  channelResolver?: ChannelResolver;
  /** Custom channel resolver for events. */
  eventChannelResolver?: EventChannelResolver;
}

/**
 * Expose an IPC API to the renderer process via contextBridge.
 *
 * Methods are exposed on `window[apiKey]` (default: `window.api`).
 * Events are exposed on `window[eventsKey]` (default: `window.events`).
 *
 * @example
 * ```ts
 * import { contextBridge, ipcRenderer } from 'electron';
 * import { expose } from '@vienna/ipc/preload';
 * import { api, events } from './contract';
 *
 * expose(contextBridge, ipcRenderer, api, events);
 * // window.api.users.create({...})
 * // window.events.users.onCreated(cb)
 * ```
 */
export function expose<TApi extends ApiDefinition, TEvents extends EventsDefinition>(
  contextBridge: ContextBridgeLike,
  ipcRenderer: IpcRendererLike,
  api: TApi,
  events?: TEvents,
  options: ExposeOptions = {}
): void {
  const {
    validateInput = false,
    apiKey = 'api',
    eventsKey = 'events',
    verbose = false,
    channelResolver,
    eventChannelResolver,
  } = options;

  // --- Build method wrappers ---

  const exposedApi: Record<string, Record<string, unknown>> = {};

  for (const groupName of Object.keys(api)) {
    const group = api[groupName];
    if (!group) {
      throw new Error(
        `[IPC Preload] No group found in API for: "${groupName}". ` +
          `Available groups: ${Object.keys(api).join(', ')}`
      );
    }

    const groupApi: Record<string, unknown> = {};

    for (const methodName of Object.keys(group)) {
      const descriptor = group[methodName] as MethodDescriptor<unknown, unknown>;
      const channel = resolveChannel(groupName, methodName, channelResolver);

      groupApi[methodName] = async (rawInput: unknown): Promise<unknown> => {
        if (verbose) {
          console.log(`[IPC Preload] Calling ${groupName}.${methodName}`, rawInput);
        }

        // Optional: validate input in preload (fail fast)
        if (validateInput) {
          const inputResult = descriptor.input.safeParse(rawInput);
          if (!inputResult.success) {
            const error: IpcError = {
              type: 'validation',
              message: `Invalid input to ${groupName}.${methodName}`,
              field: inputResult.error.errors[0]?.path.join('.'),
              details: inputResult.error.flatten(),
            };

            if (verbose) {
              console.error(`[IPC Preload] Validation failed:`, error);
            }

            throw new IpcMethodError(error, groupName, methodName);
          }
        }

        // Invoke main process handler
        const result = (await ipcRenderer.invoke(channel, rawInput)) as IpcResult<unknown>;

        // Unwrap result — proper discriminated union narrowing, no `as any`
        if (!result.success) {
          const err = new IpcMethodError(result.error, groupName, methodName);

          if (verbose) {
            console.error(`[IPC Preload] Method failed:`, err);
          }

          throw err;
        }

        if (verbose) {
          console.log(`[IPC Preload] Success ${groupName}.${methodName}`, result.data);
        }

        return result.data;
      };
    }

    exposedApi[groupName] = groupApi;
  }

  contextBridge.exposeInMainWorld(apiKey, exposedApi);

  // --- Build event subscription wrappers ---

  if (events) {
    const exposedEvents: Record<string, Record<string, unknown>> = {};

    for (const groupName of Object.keys(events)) {
      const group = events[groupName];
      if (!group) {
        throw new Error(
          `[IPC Preload] No group found in events for: "${groupName}". ` +
            `Available groups: ${Object.keys(events).join(', ')}`
        );
      }

      const groupEvents: Record<string, unknown> = {};

      for (const eventName of Object.keys(group)) {
        const descriptor = group[eventName] as EventDescriptor<unknown>;
        const channel = resolveEventChannel(groupName, eventName, eventChannelResolver);

        groupEvents[eventName] = (callback: (payload: unknown) => void): (() => void) => {
          if (verbose) {
            console.log(`[IPC Preload] Subscribing to ${groupName}.${eventName}`);
          }

          const wrappedCallback = (_event: unknown, payload: unknown) => {
            if (verbose) {
              console.log(`[IPC Preload] Event ${groupName}.${eventName}`, payload);
            }

            // Optionally validate payload
            if (validateInput) {
              const payloadResult = descriptor.payload.safeParse(payload);
              if (!payloadResult.success) {
                console.error(
                  `[IPC Preload] Invalid event payload for ${groupName}.${eventName}:`,
                  payloadResult.error.format()
                );
                return;
              }
            }

            callback(payload);
          };

          ipcRenderer.on(channel, wrappedCallback);

          // Return unsubscribe function
          return () => {
            if (verbose) {
              console.log(`[IPC Preload] Unsubscribing from ${groupName}.${eventName}`);
            }
            ipcRenderer.removeListener(channel, wrappedCallback);
          };
        };
      }

      exposedEvents[groupName] = groupEvents;
    }

    contextBridge.exposeInMainWorld(eventsKey, exposedEvents);
  }

  if (verbose) {
    console.log(`[IPC Preload] Exposed API on window.${apiKey}`);
    if (events) {
      console.log(`[IPC Preload] Exposed events on window.${eventsKey}`);
    }
  }
}
