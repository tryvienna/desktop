/**
 * @vienna/ipc — Type-safe IPC framework for Electron.
 *
 * @example
 * ```ts
 * // 1. Define (shared contract)
 * import { defineApi, method } from '@vienna/ipc';
 * const api = defineApi({
 *   users: { create: method({ input: CreateInput, output: CreateOutput }) },
 * });
 *
 * // 2. Implement (main process)
 * import { implement } from '@vienna/ipc/main';
 * implement(ipcMain, api, { users: { create: async (input) => ({ ... }) } });
 *
 * // 3. Expose (preload)
 * import { expose } from '@vienna/ipc/preload';
 * expose(contextBridge, ipcRenderer, api);
 *
 * // 4. Consume (renderer)
 * import { getApi } from '@vienna/ipc/renderer';
 * const client = getApi(api);
 * ```
 *
 * @packageDocumentation
 */

// Core definition utilities
export {
  method,
  event,
  defineApi,
  defineEvents,
  mergeApis,
  mergeAllApis,
  mergeEvents,
  mergeAllEvents,
  resolveChannel,
  resolveEventChannel,
  defaultChannelResolver,
  defaultEventChannelResolver,
  type MethodDescriptor,
  type EventDescriptor,
  type ApiGroup,
  type ApiDefinition,
  type EventGroup,
  type EventsDefinition,
  type InputOf,
  type OutputOf,
  type PayloadOf,
  type MethodToAsync,
  type GroupToAsync,
  type ApiToClient,
  type EventToCallback,
  type EventGroupToSubscriptions,
  type EventsToSubscriptions,
  type Handler,
  type GroupHandlers,
  type ApiHandlers,
  type ChannelResolver,
  type EventChannelResolver,
  type IpcResult,
} from './define';

// Error types and utilities
export {
  IpcErrorSchema,
  ValidationErrorSchema,
  NotFoundErrorSchema,
  PermissionDeniedErrorSchema,
  RateLimitedErrorSchema,
  InternalErrorSchema,
  TimeoutErrorSchema,
  NetworkErrorSchema,
  ConflictErrorSchema,
  IpcMethodError,
  isValidationError,
  isNotFoundError,
  isPermissionDeniedError,
  isRateLimitedError,
  isInternalError,
  isTimeoutError,
  isNetworkError,
  isConflictError,
  isIpcMethodError,
  createValidationError,
  createNotFoundError,
  createPermissionDeniedError,
  createRateLimitedError,
  createInternalError,
  createTimeoutError,
  createNetworkError,
  createConflictError,
  normalizeError,
  isRetryableError,
  getRetryDelay,
  type IpcError,
  type ValidationError,
  type NotFoundError,
  type PermissionDeniedError,
  type RateLimitedError,
  type InternalError,
  type TimeoutError,
  type NetworkError,
  type ConflictError,
  type NormalizeErrorOptions,
} from './errors';
