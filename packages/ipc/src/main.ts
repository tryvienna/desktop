/**
 * Main process IPC implementation.
 *
 * Provides `implement()` for registering IPC handlers and `createEmitter()`
 * for type-safe event broadcasting to renderer processes.
 */

import type {
  ApiDefinition,
  ApiHandlers,
  ChannelResolver,
  EventChannelResolver,
  EventDescriptor,
  EventsDefinition,
  IpcResult,
  MethodDescriptor,
} from './define';
import { resolveChannel, resolveEventChannel } from './define';
import { normalizeError } from './errors';
import type { IpcError, NormalizeErrorOptions } from './errors';

// ---------------------------------------------------------------------------
// Electron type stubs (import type only — no runtime dependency)
// ---------------------------------------------------------------------------

/** Minimal IpcMain interface matching Electron's ipcMain. */
export interface IpcMainLike {
  handle(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  ): void;
  removeHandler(channel: string): void;
}

/** Minimal WebContents interface matching Electron's webContents. */
export interface WebContentsLike {
  send(channel: string, ...args: unknown[]): void;
  isDestroyed(): boolean;
}

// ---------------------------------------------------------------------------
// implement()
// ---------------------------------------------------------------------------

export interface ImplementOptions {
  /** Validate incoming requests against input schema. Default: true */
  validateInput?: boolean;
  /** Validate handler responses against output schema. Default: false */
  validateOutput?: boolean;
  /** Error normalization options. */
  errorOptions?: NormalizeErrorOptions;
  /** Called when an error occurs during handler execution. */
  onError?: (error: IpcError, channel: string, input: unknown) => void;
  /** Log handler registration. Default: false */
  verbose?: boolean;
  /** Custom channel resolver. Default: "ipc:{group}:{method}" */
  channelResolver?: ChannelResolver;
}

/**
 * Register IPC handlers for an API definition.
 *
 * Iterates through all methods in the API, registers `ipcMain.handle()` for
 * each, validates inputs/outputs, wraps errors, and returns a cleanup function.
 *
 * @example
 * ```ts
 * import { ipcMain } from 'electron';
 * import { implement } from '@vienna/ipc/main';
 * import { api } from './contract';
 *
 * const cleanup = implement(ipcMain, api, {
 *   users: {
 *     create: async (input) => {
 *       const user = await db.users.create(input);
 *       return user;
 *     },
 *   },
 * });
 *
 * app.on('will-quit', cleanup);
 * ```
 *
 * @returns Cleanup function that removes all registered handlers.
 */
export function implement<T extends ApiDefinition>(
  ipcMain: IpcMainLike,
  api: T,
  handlers: ApiHandlers<T>,
  options: ImplementOptions = {}
): () => void {
  const {
    validateInput = true,
    validateOutput = false,
    errorOptions = {},
    onError,
    verbose = false,
    channelResolver,
  } = options;

  const registeredChannels: string[] = [];
  const apiGroups = Object.keys(api);

  for (const groupName of apiGroups) {
    const group = api[groupName];
    const groupHandlers = (handlers as Record<string, Record<string, unknown>>)[groupName];

    if (!group) {
      throw new Error(`[IPC] No group found in API for: "${groupName}"`);
    }

    if (!groupHandlers) {
      throw new Error(
        `[IPC] No handlers provided for group "${groupName}". ` +
          `Available groups: ${apiGroups.join(', ')}`
      );
    }

    const methodNames = Object.keys(group);

    for (const methodName of methodNames) {
      const descriptor = group[methodName] as MethodDescriptor<unknown, unknown>;
      const handler = groupHandlers[methodName] as
        | ((input: unknown) => Promise<unknown> | unknown)
        | undefined;

      if (!handler) {
        throw new Error(
          `[IPC] No handler provided for "${groupName}.${methodName}". ` +
            `Available methods in "${groupName}": ${methodNames.join(', ')}`
        );
      }

      const channel = resolveChannel(groupName, methodName, channelResolver);

      if (verbose) {
        console.log(`[IPC] Registering handler: ${channel}`);
      }

      ipcMain.handle(channel, async (_event, rawInput): Promise<IpcResult<unknown>> => {
        try {
          // 1. Validate input
          let validatedInput = rawInput;
          if (validateInput) {
            const inputResult = descriptor.input.safeParse(rawInput);
            if (!inputResult.success) {
              const error: IpcError = {
                type: 'validation',
                message: 'Invalid input',
                field: inputResult.error.errors[0]?.path.join('.'),
                details: inputResult.error.flatten(),
              };
              onError?.(error, channel, rawInput);
              return { success: false, error };
            }
            validatedInput = inputResult.data;
          }

          // 2. Execute handler
          const result = await handler(validatedInput);

          // 3. Validate output (opt-in)
          if (validateOutput) {
            const outputResult = descriptor.output.safeParse(result);
            if (!outputResult.success) {
              const error: IpcError = {
                type: 'internal',
                message: 'Handler returned invalid output',
                code: 'INVALID_OUTPUT',
                stack: outputResult.error.message,
              };
              console.error(
                `[IPC] Output validation failed for ${channel}:`,
                outputResult.error.format()
              );
              onError?.(error, channel, validatedInput);
              return { success: false, error };
            }
          }

          // 4. Return success
          return { success: true, data: result };
        } catch (err) {
          const error = normalizeError(err, errorOptions);
          onError?.(error, channel, rawInput);
          return { success: false, error };
        }
      });

      registeredChannels.push(channel);
    }
  }

  if (verbose) {
    console.log(`[IPC] Registered ${registeredChannels.length} handlers`);
  }

  return () => {
    for (const channel of registeredChannels) {
      ipcMain.removeHandler(channel);
      if (verbose) {
        console.log(`[IPC] Removed handler: ${channel}`);
      }
    }
  };
}

// ---------------------------------------------------------------------------
// createEmitter()
// ---------------------------------------------------------------------------

export interface EmitterOptions {
  /** Validate payloads against event schemas. Default: false */
  validate?: boolean;
  /** Log event emissions. Default: false */
  verbose?: boolean;
  /** Custom event channel resolver. */
  channelResolver?: EventChannelResolver;
}

/**
 * Targets for event emission. Provide either a static list or a lazy callback.
 */
export type EmitterTargets =
  | { webContents: WebContentsLike[] }
  | { getWebContents: () => WebContentsLike[] };

/** Typed event emitter — a mirror of the events definition where each event is a callable function. */
export type EventEmitter<T extends EventsDefinition> = {
  [G in keyof T]: {
    [E in keyof T[G]]: T[G][E] extends EventDescriptor<infer P> ? (payload: P) => void : never;
  };
};

/**
 * Create a type-safe event emitter for broadcasting events to renderer processes.
 *
 * @example
 * ```ts
 * import { BrowserWindow } from 'electron';
 * import { createEmitter } from '@vienna/ipc/main';
 * import { events } from './contract';
 *
 * const emitter = createEmitter(events, {
 *   getWebContents: () => BrowserWindow.getAllWindows().map(w => w.webContents),
 * });
 *
 * // Fully type-safe:
 * emitter.users.onCreated({ userId: '123', name: 'John' });
 * ```
 */
export function createEmitter<T extends EventsDefinition>(
  events: T,
  targets: EmitterTargets,
  options: EmitterOptions = {}
): EventEmitter<T> {
  const { validate = false, verbose = false, channelResolver } = options;

  const getTargets = (): WebContentsLike[] => {
    if ('webContents' in targets) return targets.webContents;
    return targets.getWebContents();
  };

  const result: Record<string, Record<string, (payload: unknown) => void>> = {};

  for (const groupName of Object.keys(events)) {
    const group = events[groupName];
    if (!group) continue;

    result[groupName] = {};

    for (const eventName of Object.keys(group)) {
      const descriptor = group[eventName] as EventDescriptor<unknown>;
      const channel = resolveEventChannel(groupName, eventName, channelResolver);

      result[groupName][eventName] = (payload: unknown): void => {
        if (validate) {
          const parsed = descriptor.payload.safeParse(payload);
          if (!parsed.success) {
            throw new Error(
              `[IPC] Invalid event payload for ${groupName}.${eventName}: ${parsed.error.message}`
            );
          }
        }

        if (verbose) {
          console.log(`[IPC] Emitting ${channel}`);
        }

        for (const wc of getTargets()) {
          if (!wc.isDestroyed()) {
            wc.send(channel, payload);
          }
        }
      };
    }
  }

  return result as EventEmitter<T>;
}
