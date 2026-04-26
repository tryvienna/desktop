/**
 * Test utilities for @vienna/ipc.
 *
 * Provides mock implementations of Electron's IPC primitives and a
 * `createTestHarness()` that wires the full define→implement→expose→consume
 * pipeline in memory — no Electron required.
 *
 * All mocks are pure TypeScript with zero test-framework dependencies.
 *
 * @example
 * ```ts
 * import { createTestHarness } from '@vienna/ipc/testing';
 * import { api, events } from './contract';
 *
 * const harness = createTestHarness(api, {
 *   users: { create: async (input) => ({ id: '1', ...input }) },
 * }, events);
 *
 * // Call methods as if you were in the renderer:
 * const user = await harness.api.users.create({ name: 'John', email: 'j@test.com' });
 *
 * // Emit events as if you were in the main process:
 * harness.emitter.users.onCreated({ userId: '1', name: 'John' });
 *
 * harness.cleanup();
 * ```
 */

import type {
  ApiDefinition,
  ApiHandlers,
  ApiToClient,
  EventsDefinition,
  EventsToSubscriptions,
} from './define';
import { implement, createEmitter } from './main';
import type {
  IpcMainLike,
  WebContentsLike,
  EventEmitter,
  ImplementOptions,
  EmitterOptions,
} from './main';
import { expose } from './preload';
import type { ContextBridgeLike, IpcRendererLike, ExposeOptions } from './preload';
import { getApi, getEvents } from './renderer';

// ---------------------------------------------------------------------------
// Mock interfaces (extend the "Like" interfaces with test helpers)
// ---------------------------------------------------------------------------

export interface MockIpcMain extends IpcMainLike {
  /** Invoke a registered handler directly (simulates ipcRenderer.invoke). */
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  /** Check if a handler is registered for a channel. */
  hasHandler(channel: string): boolean;
}

export interface MockIpcRenderer extends IpcRendererLike {
  /** Simulate receiving an event from the main process. */
  simulateEvent(channel: string, ...args: unknown[]): void;
}

export interface MockContextBridge extends ContextBridgeLike {
  /** Retrieve what was exposed for a given key. */
  getExposed(key: string): unknown;
}

export interface MockWebContents extends WebContentsLike {
  /** Get all messages sent via this webContents. */
  getSentMessages(): Array<{ channel: string; args: unknown[] }>;
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

export function createMockIpcMain(): MockIpcMain {
  const handlers = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >();

  return {
    handle(channel, listener) {
      handlers.set(channel, listener);
    },
    removeHandler(channel) {
      handlers.delete(channel);
    },
    async invoke(channel, ...args) {
      const handler = handlers.get(channel);
      if (!handler) {
        throw new Error(`[MockIpcMain] No handler registered for channel: "${channel}"`);
      }
      return handler(null, ...args);
    },
    hasHandler(channel) {
      return handlers.has(channel);
    },
  };
}

export function createMockIpcRenderer(ipcMain?: MockIpcMain): MockIpcRenderer {
  const listeners = new Map<string, Set<(event: unknown, ...args: unknown[]) => void>>();

  return {
    async invoke(channel, ...args) {
      if (!ipcMain) {
        throw new Error(
          '[MockIpcRenderer] Not connected to a MockIpcMain. ' +
            'Pass ipcMain to createMockIpcRenderer() to enable invoke().'
        );
      }
      return ipcMain.invoke(channel, ...args);
    },
    on(channel, listener) {
      let set = listeners.get(channel);
      if (!set) {
        set = new Set();
        listeners.set(channel, set);
      }
      set.add(listener);
    },
    removeListener(channel, listener) {
      listeners.get(channel)?.delete(listener as (event: unknown, ...args: unknown[]) => void);
    },
    simulateEvent(channel, ...args) {
      const cbs = listeners.get(channel);
      if (cbs) {
        for (const cb of cbs) {
          cb(null, ...args);
        }
      }
    },
  };
}

export function createMockContextBridge(): MockContextBridge {
  const exposed = new Map<string, unknown>();

  return {
    exposeInMainWorld(apiKey, api) {
      exposed.set(apiKey, api);
      // Also set on globalThis so getApi/getEvents work in tests
      (globalThis as Record<string, unknown>)[apiKey] = api;
    },
    getExposed(key) {
      return exposed.get(key);
    },
  };
}

export function createMockWebContents(): MockWebContents {
  const messages: Array<{ channel: string; args: unknown[] }> = [];

  return {
    send(channel, ...args) {
      messages.push({ channel, args });
    },
    isDestroyed() {
      return false;
    },
    getSentMessages() {
      return messages;
    },
  };
}

// ---------------------------------------------------------------------------
// createTestHarness()
// ---------------------------------------------------------------------------

export interface TestHarnessOptions {
  implementOptions?: ImplementOptions;
  exposeOptions?: ExposeOptions;
  emitterOptions?: EmitterOptions;
}

export interface TestHarness<
  TApi extends ApiDefinition,
  TEvents extends EventsDefinition | undefined = undefined,
> {
  /** Mock IPC main — inspect registered handlers. */
  ipcMain: MockIpcMain;
  /** Mock IPC renderer — simulate events. */
  ipcRenderer: MockIpcRenderer;
  /** Mock context bridge — inspect exposed APIs. */
  contextBridge: MockContextBridge;
  /** Mock webContents — inspect sent messages. */
  webContents: MockWebContents;
  /** Typed API client (what renderer code uses). */
  api: ApiToClient<TApi>;
  /** Typed event subscriptions (if events were provided). */
  events: TEvents extends EventsDefinition ? EventsToSubscriptions<TEvents> : undefined;
  /** Typed event emitter (if events were provided). */
  emitter: TEvents extends EventsDefinition ? EventEmitter<TEvents> : undefined;
  /** Cleanup — removes handlers and cleans up globalThis. */
  cleanup: () => void;
}

/**
 * Wire the full IPC pipeline in memory for testing.
 *
 * Creates mocks, registers handlers, exposes the API, and returns
 * a typed client + emitter ready for assertions.
 */
export function createTestHarness<
  TApi extends ApiDefinition,
  TEvents extends EventsDefinition | undefined = undefined,
>(
  api: TApi,
  handlers: ApiHandlers<TApi>,
  events?: TEvents,
  options: TestHarnessOptions = {}
): TestHarness<TApi, TEvents> {
  const ipcMain = createMockIpcMain();
  const ipcRenderer = createMockIpcRenderer(ipcMain);
  const contextBridge = createMockContextBridge();
  const webContents = createMockWebContents();

  // Wire webContents.send to also deliver events to ipcRenderer listeners
  const originalSend = webContents.send.bind(webContents);
  webContents.send = (channel: string, ...args: unknown[]) => {
    originalSend(channel, ...args);
    ipcRenderer.simulateEvent(channel, ...args);
  };

  // 1. Implement handlers (main process side)
  const cleanupImpl = implement(ipcMain, api, handlers, options.implementOptions);

  // 2. Expose via contextBridge (preload side)
  expose(
    contextBridge,
    ipcRenderer,
    api,
    events as EventsDefinition | undefined,
    options.exposeOptions
  );

  // 3. Get client references (renderer side)
  const apiKey = options.exposeOptions?.apiKey ?? 'api';
  const eventsKey = options.exposeOptions?.eventsKey ?? 'events';
  const clientApi = getApi(api, apiKey);

  const clientEvents = events ? getEvents(events as EventsDefinition, eventsKey) : undefined;

  // 4. Create emitter (main process side)
  const emitter = events
    ? createEmitter(
        events as EventsDefinition,
        { webContents: [webContents] },
        options.emitterOptions
      )
    : undefined;

  const cleanup = () => {
    cleanupImpl();
    delete (globalThis as Record<string, unknown>)[apiKey];
    if (events) {
      delete (globalThis as Record<string, unknown>)[eventsKey];
    }
  };

  return {
    ipcMain,
    ipcRenderer,
    contextBridge,
    webContents,
    api: clientApi,
    events: clientEvents as TestHarness<TApi, TEvents>['events'],
    emitter: emitter as TestHarness<TApi, TEvents>['emitter'],
    cleanup,
  };
}
