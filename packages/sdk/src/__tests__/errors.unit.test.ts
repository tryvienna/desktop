import { describe, expect, it } from 'vitest';

import {
  EntityDefinitionError,
  EntityURIError,
  isEntityDefinitionError,
  isEntityURIError,
} from '../errors';

describe('EntityURIError', () => {
  it('sets name, code, message, and optional uri', () => {
    const withUri = new EntityURIError('INVALID_FORMAT', 'bad uri', '@vienna//foo');
    expect(withUri.name).toBe('EntityURIError');
    expect(withUri.code).toBe('INVALID_FORMAT');
    expect(withUri.message).toBe('bad uri');
    expect(withUri.uri).toBe('@vienna//foo');

    const withoutUri = new EntityURIError('MISSING_PATH', 'no path');
    expect(withoutUri.uri).toBeUndefined();
  });

  it('is an instanceof Error', () => {
    const err = new EntityURIError('MISSING_ENTITY_TYPE', 'missing type');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(EntityURIError);
  });
});

describe('EntityDefinitionError', () => {
  it('sets name, entityType, field, and message', () => {
    const err = new EntityDefinitionError('github_pr', 'title', 'title is required');
    expect(err.name).toBe('EntityDefinitionError');
    expect(err.entityType).toBe('github_pr');
    expect(err.field).toBe('title');
    expect(err.message).toBe('title is required');
  });

  it('is an instanceof Error', () => {
    const err = new EntityDefinitionError('slack_message', 'channel', 'invalid channel');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(EntityDefinitionError);
  });
});

describe('isEntityURIError', () => {
  it('returns true for EntityURIError and false for plain Error and non-errors', () => {
    expect(isEntityURIError(new EntityURIError('INVALID_FORMAT', 'bad'))).toBe(true);
    expect(isEntityURIError(new Error('plain'))).toBe(false);
    expect(isEntityURIError('not an error')).toBe(false);
    expect(isEntityURIError(null)).toBe(false);
    expect(isEntityURIError(undefined)).toBe(false);
  });
});

describe('isEntityDefinitionError', () => {
  it('returns true for EntityDefinitionError and false for plain Error and non-errors', () => {
    expect(isEntityDefinitionError(new EntityDefinitionError('t', 'f', 'msg'))).toBe(true);
    expect(isEntityDefinitionError(new Error('plain'))).toBe(false);
    expect(isEntityDefinitionError('not an error')).toBe(false);
    expect(isEntityDefinitionError(null)).toBe(false);
    expect(isEntityDefinitionError(undefined)).toBe(false);
  });
});
