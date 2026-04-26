import { describe, it, expect } from 'vitest';
import {
  IpcErrorSchema,
  isValidationError,
  isNotFoundError,
  isPermissionDeniedError,
  isRateLimitedError,
  isInternalError,
  isTimeoutError,
  isNetworkError,
  isConflictError,
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
  IpcMethodError,
  isIpcMethodError,
} from '../errors';

describe('error factories', () => {
  it('createValidationError', () => {
    const err = createValidationError('bad input', { field: 'name', details: { x: 1 } });
    expect(err.type).toBe('validation');
    expect(err.message).toBe('bad input');
    expect(err.field).toBe('name');
    expect(IpcErrorSchema.parse(err)).toEqual(err);
  });

  it('createNotFoundError', () => {
    const err = createNotFoundError('user', { id: '42' });
    expect(err.type).toBe('not_found');
    expect(err.resource).toBe('user');
    expect(err.id).toBe('42');
    expect(err.message).toBe('user not found');
  });

  it('createNotFoundError with custom message', () => {
    const err = createNotFoundError('user', { message: 'gone' });
    expect(err.message).toBe('gone');
  });

  it('createPermissionDeniedError', () => {
    const err = createPermissionDeniedError('nope', { required: 'admin', action: 'delete' });
    expect(err.type).toBe('permission_denied');
    expect(IpcErrorSchema.parse(err)).toEqual(err);
  });

  it('createRateLimitedError', () => {
    const err = createRateLimitedError('slow down', { retryAfter: 5000, limit: 100 });
    expect(err.type).toBe('rate_limited');
    expect(err.retryAfter).toBe(5000);
  });

  it('createInternalError', () => {
    const err = createInternalError('oops', { code: 'ERR', stack: 'trace' });
    expect(err.type).toBe('internal');
    expect(err.code).toBe('ERR');
  });

  it('createTimeoutError', () => {
    const err = createTimeoutError('too slow', { timeoutMs: 3000 });
    expect(err.type).toBe('timeout');
    expect(err.timeoutMs).toBe(3000);
  });

  it('createNetworkError', () => {
    const err = createNetworkError('failed', { statusCode: 503, url: 'http://x' });
    expect(err.type).toBe('network');
    expect(err.statusCode).toBe(503);
  });

  it('createConflictError', () => {
    const err = createConflictError('conflict', { conflictingId: '1', reason: 'duplicate' });
    expect(err.type).toBe('conflict');
    expect(err.conflictingId).toBe('1');
  });
});

describe('type guards', () => {
  it('isValidationError', () => {
    expect(isValidationError(createValidationError('x'))).toBe(true);
    expect(isValidationError(createInternalError('x'))).toBe(false);
  });

  it('isNotFoundError', () => {
    expect(isNotFoundError(createNotFoundError('x'))).toBe(true);
    expect(isNotFoundError(createInternalError('x'))).toBe(false);
  });

  it('isPermissionDeniedError', () => {
    expect(isPermissionDeniedError(createPermissionDeniedError('x'))).toBe(true);
  });

  it('isRateLimitedError', () => {
    expect(isRateLimitedError(createRateLimitedError('x'))).toBe(true);
  });

  it('isInternalError', () => {
    expect(isInternalError(createInternalError('x'))).toBe(true);
  });

  it('isTimeoutError', () => {
    expect(isTimeoutError(createTimeoutError('x'))).toBe(true);
  });

  it('isNetworkError', () => {
    expect(isNetworkError(createNetworkError('x'))).toBe(true);
  });

  it('isConflictError', () => {
    expect(isConflictError(createConflictError('x'))).toBe(true);
  });
});

describe('normalizeError()', () => {
  it('passes through a valid IpcError', () => {
    const err = createNotFoundError('user', { id: '1' });
    expect(normalizeError(err)).toEqual(err);
  });

  it('converts a standard Error', () => {
    const err = new Error('something broke');
    const result = normalizeError(err);
    expect(result.type).toBe('internal');
    expect(result.message).toBe('something broke');
  });

  it('converts a ValidationError by name', () => {
    const err = new Error('bad');
    err.name = 'ValidationError';
    expect(normalizeError(err).type).toBe('validation');
  });

  it('converts a NotFoundError by name', () => {
    const err = new Error('missing');
    err.name = 'NotFoundError';
    expect(normalizeError(err).type).toBe('not_found');
  });

  it('converts a TimeoutError by name', () => {
    const err = new Error('timed out');
    err.name = 'TimeoutError';
    expect(normalizeError(err).type).toBe('timeout');
  });

  it('handles non-Error objects with message', () => {
    const result = normalizeError({ message: 'obj error' });
    expect(result.type).toBe('internal');
    expect(result.message).toBe('obj error');
  });

  it('handles non-Error objects without message', () => {
    const result = normalizeError({ foo: 'bar' });
    expect(result.type).toBe('internal');
    expect(result.message).toContain('foo');
  });

  it('handles primitive values', () => {
    expect(normalizeError('string error').message).toBe('string error');
    expect(normalizeError(42).message).toBe('42');
    expect(normalizeError(null).message).toBe('null');
  });

  it('includes stack by default', () => {
    const err = new Error('x');
    const result = normalizeError(err);
    expect(isInternalError(result) && result.stack).toBeTruthy();
  });

  it('excludes stack when includeStack is false', () => {
    const err = new Error('x');
    const result = normalizeError(err, { includeStack: false });
    expect(isInternalError(result) && result.stack).toBeUndefined();
  });

  it('uses defaultCode when provided', () => {
    const err = new Error('x');
    const result = normalizeError(err, { defaultCode: 'CUSTOM' });
    expect(isInternalError(result) && result.code).toBe('CUSTOM');
  });
});

describe('retry helpers', () => {
  it('isRetryableError returns true for rate_limited, timeout, network', () => {
    expect(isRetryableError(createRateLimitedError('x'))).toBe(true);
    expect(isRetryableError(createTimeoutError('x'))).toBe(true);
    expect(isRetryableError(createNetworkError('x'))).toBe(true);
  });

  it('isRetryableError returns false for other types', () => {
    expect(isRetryableError(createValidationError('x'))).toBe(false);
    expect(isRetryableError(createNotFoundError('x'))).toBe(false);
    expect(isRetryableError(createInternalError('x'))).toBe(false);
  });

  it('getRetryDelay returns retryAfter for rate_limited', () => {
    expect(getRetryDelay(createRateLimitedError('x', { retryAfter: 3000 }))).toBe(3000);
  });

  it('getRetryDelay returns 1000 for retryable without retryAfter', () => {
    expect(getRetryDelay(createTimeoutError('x'))).toBe(1000);
    expect(getRetryDelay(createNetworkError('x'))).toBe(1000);
  });

  it('getRetryDelay returns undefined for non-retryable', () => {
    expect(getRetryDelay(createValidationError('x'))).toBeUndefined();
  });
});

describe('IpcMethodError', () => {
  it('is an instance of Error', () => {
    const err = new IpcMethodError(createNotFoundError('user'), 'users', 'get');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('IpcMethodError');
    expect(err.message).toBe('user not found');
    expect(err.group).toBe('users');
    expect(err.method).toBe('get');
    expect(err.error.type).toBe('not_found');
  });

  it('isIpcMethodError type guard works', () => {
    const err = new IpcMethodError(createInternalError('x'), 'g', 'm');
    expect(isIpcMethodError(err)).toBe(true);
    expect(isIpcMethodError(new Error('x'))).toBe(false);
    expect(isIpcMethodError(null)).toBe(false);
  });
});
