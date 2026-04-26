/**
 * Input validation helpers for GraphQL resolvers.
 *
 * GraphQL schema validation only checks type and nullability. These helpers
 * enforce business constraints (length limits, non-empty strings) that were
 * previously handled by Zod schemas in the IPC layer.
 *
 * @module graphql/validation
 */

import { GraphQLError } from 'graphql';

/** Throw a BAD_USER_INPUT error if the string is empty or exceeds maxLength. */
export function validateString(
  value: string,
  fieldName: string,
  opts: { minLength?: number; maxLength?: number } = {}
): void {
  const { minLength = 0, maxLength } = opts;
  if (value.length < minLength) {
    throw new GraphQLError(`${fieldName} must be at least ${minLength} character(s)`, {
      extensions: { code: 'BAD_USER_INPUT', field: fieldName },
    });
  }
  if (maxLength !== undefined && value.length > maxLength) {
    throw new GraphQLError(`${fieldName} must be at most ${maxLength} characters`, {
      extensions: { code: 'BAD_USER_INPUT', field: fieldName },
    });
  }
}

/** Validate an optional string — skips if null/undefined. */
export function validateOptionalString(
  value: string | null | undefined,
  fieldName: string,
  opts: { minLength?: number; maxLength?: number } = {}
): void {
  if (value != null) {
    validateString(value, fieldName, opts);
  }
}

/** Validate a directory path is absolute and reasonable. */
export function validateDirectoryPath(value: string, fieldName: string): void {
  validateString(value, fieldName, { minLength: 1, maxLength: 4096 });
  if (!value.startsWith('/')) {
    throw new GraphQLError(`${fieldName} must be an absolute path`, {
      extensions: { code: 'BAD_USER_INPUT', field: fieldName },
    });
  }
}
