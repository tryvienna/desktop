/**
 * Structured errors for the sdk.
 *
 * Uses named error classes with discriminating fields for pattern matching.
 */

import type { EntityURIErrorCode } from './schemas';

/**
 * Error thrown when URI parsing or building fails.
 */
export class EntityURIError extends Error {
  override readonly name = 'EntityURIError' as const;

  constructor(
    readonly code: EntityURIErrorCode,
    message: string,
    readonly uri?: string
  ) {
    super(message);
  }
}

/**
 * Error thrown by defineEntity/defineIntegration for invalid configuration.
 */
export class EntityDefinitionError extends Error {
  override readonly name = 'EntityDefinitionError' as const;

  constructor(
    readonly entityType: string,
    readonly field: string,
    message: string
  ) {
    super(message);
  }
}

/** Type guard for EntityURIError */
export function isEntityURIError(error: unknown): error is EntityURIError {
  return error instanceof EntityURIError;
}

/** Type guard for EntityDefinitionError */
export function isEntityDefinitionError(error: unknown): error is EntityDefinitionError {
  return error instanceof EntityDefinitionError;
}
