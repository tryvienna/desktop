/**
 * Structured error types for IPC communication.
 *
 * All errors are a discriminated union on the `type` field. They serialize
 * safely across the Electron IPC boundary (JSON-only, no classes/prototypes).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Error schemas
// ---------------------------------------------------------------------------

const BaseErrorSchema = z.object({
  message: z.string(),
});

/** Input/output failed Zod schema validation. */
export const ValidationErrorSchema = BaseErrorSchema.extend({
  type: z.literal('validation'),
  field: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

/** Requested resource does not exist. */
export const NotFoundErrorSchema = BaseErrorSchema.extend({
  type: z.literal('not_found'),
  resource: z.string(),
  id: z.string().optional(),
});

/** User lacks permission for the operation. */
export const PermissionDeniedErrorSchema = BaseErrorSchema.extend({
  type: z.literal('permission_denied'),
  required: z.string().optional(),
  action: z.string().optional(),
});

/** API rate limit exceeded. */
export const RateLimitedErrorSchema = BaseErrorSchema.extend({
  type: z.literal('rate_limited'),
  retryAfter: z.number().optional(),
  limit: z.number().optional(),
});

/** Unexpected server-side error. */
export const InternalErrorSchema = BaseErrorSchema.extend({
  type: z.literal('internal'),
  code: z.string().optional(),
  stack: z.string().optional(),
});

/** Operation exceeded its time limit. */
export const TimeoutErrorSchema = BaseErrorSchema.extend({
  type: z.literal('timeout'),
  timeoutMs: z.number().optional(),
});

/** Network communication failure. */
export const NetworkErrorSchema = BaseErrorSchema.extend({
  type: z.literal('network'),
  statusCode: z.number().optional(),
  url: z.string().optional(),
});

/** Operation conflicts with current state. */
export const ConflictErrorSchema = BaseErrorSchema.extend({
  type: z.literal('conflict'),
  conflictingId: z.string().optional(),
  reason: z.string().optional(),
});

/** Discriminated union of all IPC error types. */
export const IpcErrorSchema = z.discriminatedUnion('type', [
  ValidationErrorSchema,
  NotFoundErrorSchema,
  PermissionDeniedErrorSchema,
  RateLimitedErrorSchema,
  InternalErrorSchema,
  TimeoutErrorSchema,
  NetworkErrorSchema,
  ConflictErrorSchema,
]);

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export type IpcError = z.infer<typeof IpcErrorSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type NotFoundError = z.infer<typeof NotFoundErrorSchema>;
export type PermissionDeniedError = z.infer<typeof PermissionDeniedErrorSchema>;
export type RateLimitedError = z.infer<typeof RateLimitedErrorSchema>;
export type InternalError = z.infer<typeof InternalErrorSchema>;
export type TimeoutError = z.infer<typeof TimeoutErrorSchema>;
export type NetworkError = z.infer<typeof NetworkErrorSchema>;
export type ConflictError = z.infer<typeof ConflictErrorSchema>;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isValidationError(error: IpcError): error is ValidationError {
  return error.type === 'validation';
}

export function isNotFoundError(error: IpcError): error is NotFoundError {
  return error.type === 'not_found';
}

export function isPermissionDeniedError(error: IpcError): error is PermissionDeniedError {
  return error.type === 'permission_denied';
}

export function isRateLimitedError(error: IpcError): error is RateLimitedError {
  return error.type === 'rate_limited';
}

export function isInternalError(error: IpcError): error is InternalError {
  return error.type === 'internal';
}

export function isTimeoutError(error: IpcError): error is TimeoutError {
  return error.type === 'timeout';
}

export function isNetworkError(error: IpcError): error is NetworkError {
  return error.type === 'network';
}

export function isConflictError(error: IpcError): error is ConflictError {
  return error.type === 'conflict';
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function createValidationError(
  message: string,
  options?: { field?: string; details?: Record<string, unknown> }
): ValidationError {
  return { type: 'validation', message, field: options?.field, details: options?.details };
}

export function createNotFoundError(
  resource: string,
  options?: { id?: string; message?: string }
): NotFoundError {
  return {
    type: 'not_found',
    message: options?.message ?? `${resource} not found`,
    resource,
    id: options?.id,
  };
}

export function createPermissionDeniedError(
  message: string,
  options?: { required?: string; action?: string }
): PermissionDeniedError {
  return {
    type: 'permission_denied',
    message,
    required: options?.required,
    action: options?.action,
  };
}

export function createRateLimitedError(
  message: string,
  options?: { retryAfter?: number; limit?: number }
): RateLimitedError {
  return {
    type: 'rate_limited',
    message,
    retryAfter: options?.retryAfter,
    limit: options?.limit,
  };
}

export function createInternalError(
  message: string,
  options?: { code?: string; stack?: string }
): InternalError {
  return { type: 'internal', message, code: options?.code, stack: options?.stack };
}

export function createTimeoutError(
  message: string,
  options?: { timeoutMs?: number }
): TimeoutError {
  return { type: 'timeout', message, timeoutMs: options?.timeoutMs };
}

export function createNetworkError(
  message: string,
  options?: { statusCode?: number; url?: string }
): NetworkError {
  return { type: 'network', message, statusCode: options?.statusCode, url: options?.url };
}

export function createConflictError(
  message: string,
  options?: { conflictingId?: string; reason?: string }
): ConflictError {
  return {
    type: 'conflict',
    message,
    conflictingId: options?.conflictingId,
    reason: options?.reason,
  };
}

// ---------------------------------------------------------------------------
// Error normalization
// ---------------------------------------------------------------------------

export interface NormalizeErrorOptions {
  /** Include stack traces in internal errors. Default: true */
  includeStack?: boolean;
  /** Default error code for internal errors. */
  defaultCode?: string;
}

/**
 * Normalize any thrown value into a structured IpcError.
 *
 * This converts Error instances, IpcError objects, plain objects, and
 * primitive values into a well-typed IpcError that serializes safely
 * across the IPC boundary.
 */
export function normalizeError(error: unknown, options: NormalizeErrorOptions = {}): IpcError {
  const { includeStack = true, defaultCode } = options;

  // Already an IpcError — validate and return
  if (typeof error === 'object' && error !== null && 'type' in error) {
    const parseResult = IpcErrorSchema.safeParse(error);
    if (parseResult.success) {
      return parseResult.data;
    }
  }

  // Standard Error class
  if (error instanceof Error) {
    const message = error.message;
    const stack = includeStack ? error.stack : undefined;

    if (error.name === 'ValidationError') {
      return createValidationError(message);
    }
    if (error.name === 'NotFoundError') {
      return createNotFoundError('resource', { message });
    }
    if (error.name === 'PermissionDeniedError' || error.name === 'UnauthorizedError') {
      return createPermissionDeniedError(message);
    }
    if (error.name === 'TimeoutError') {
      return createTimeoutError(message);
    }

    return createInternalError(message, { code: defaultCode ?? error.name, stack });
  }

  // Non-Error object
  if (typeof error === 'object' && error !== null) {
    const message =
      'message' in error && typeof error.message === 'string'
        ? error.message
        : JSON.stringify(error);
    return createInternalError(message, { code: defaultCode });
  }

  // Primitive value
  return createInternalError(String(error), { code: defaultCode });
}

// ---------------------------------------------------------------------------
// Retry helpers
// ---------------------------------------------------------------------------

/**
 * Check if an error is retryable (rate_limited, timeout, or network).
 */
export function isRetryableError(error: IpcError): boolean {
  return error.type === 'rate_limited' || error.type === 'timeout' || error.type === 'network';
}

/**
 * Get the appropriate retry delay for a retryable error.
 * Returns `undefined` if the error is not retryable.
 */
export function getRetryDelay(error: IpcError): number | undefined {
  if (!isRetryableError(error)) return undefined;
  if (isRateLimitedError(error) && error.retryAfter) return error.retryAfter;
  return 1000; // default 1s backoff
}

// ---------------------------------------------------------------------------
// IpcMethodError — thrown by the preload bridge on method failure
// ---------------------------------------------------------------------------

/**
 * JavaScript Error wrapping a structured IpcError.
 * Thrown by the preload bridge when a main-process method fails.
 * Importable from `@vienna/ipc/errors` for use in error handling.
 */
export class IpcMethodError extends Error {
  override readonly name = 'IpcMethodError';

  constructor(
    public readonly error: IpcError,
    public readonly group: string,
    public readonly method: string
  ) {
    super(error.message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IpcMethodError);
    }
  }
}

/** Type guard for IpcMethodError. */
export function isIpcMethodError(value: unknown): value is IpcMethodError {
  return value instanceof IpcMethodError;
}
