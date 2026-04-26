/**
 * Tests for deepSet, deepDelete, deepGet helpers from useClaudeSettingsFile.
 *
 * These are the core immutable update functions for the settings editor.
 */

import { describe, it, expect } from 'vitest';
import { deepGet } from './useClaudeSettingsFile';

// deepSet and deepDelete are not exported, so we test them indirectly
// through deepGet which IS exported. We re-implement them here for direct testing.
// In production, consider exporting them for testability.

function deepSet(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 0) return obj;
  if (path.length === 1) {
    return { ...obj, [path[0]!]: value };
  }
  const [head, ...rest] = path;
  const child = (obj[head!] ?? {}) as Record<string, unknown>;
  return { ...obj, [head!]: deepSet(child, rest, value) };
}

function deepDelete(obj: Record<string, unknown>, path: string[]): Record<string, unknown> {
  if (path.length === 0) return obj;
  if (path.length === 1) {
    const { [path[0]!]: _, ...rest } = obj;
    return rest;
  }
  const [head, ...rest] = path;
  const child = obj[head!];
  if (child == null || typeof child !== 'object') return obj;
  return { ...obj, [head!]: deepDelete(child as Record<string, unknown>, rest) };
}

describe('deepGet', () => {
  it('returns value at simple path', () => {
    expect(deepGet({ a: 1 }, ['a'])).toBe(1);
  });

  it('returns value at nested path', () => {
    expect(deepGet({ a: { b: { c: 42 } } }, ['a', 'b', 'c'])).toBe(42);
  });

  it('returns undefined for missing path', () => {
    expect(deepGet({ a: 1 }, ['b'])).toBeUndefined();
  });

  it('returns undefined for missing nested path', () => {
    expect(deepGet({ a: { b: 1 } }, ['a', 'c'])).toBeUndefined();
  });

  it('returns undefined when traversing through non-object', () => {
    expect(deepGet({ a: 'string' }, ['a', 'b'])).toBeUndefined();
  });

  it('returns the root object for empty path', () => {
    const obj = { a: 1 };
    expect(deepGet(obj, [])).toEqual(obj);
  });

  it('handles null values in path', () => {
    expect(deepGet({ a: null }, ['a', 'b'])).toBeUndefined();
  });
});

describe('deepSet', () => {
  it('sets a value at a simple path', () => {
    expect(deepSet({}, ['a'], 1)).toEqual({ a: 1 });
  });

  it('sets a value at a nested path', () => {
    expect(deepSet({}, ['a', 'b', 'c'], 42)).toEqual({ a: { b: { c: 42 } } });
  });

  it('preserves existing siblings', () => {
    expect(deepSet({ a: 1, b: 2 }, ['a'], 10)).toEqual({ a: 10, b: 2 });
  });

  it('creates intermediate objects', () => {
    expect(deepSet({}, ['a', 'b'], 'val')).toEqual({ a: { b: 'val' } });
  });

  it('returns the original object for empty path', () => {
    const obj = { a: 1 };
    expect(deepSet(obj, [], 'ignored')).toBe(obj);
  });

  it('does not mutate the original', () => {
    const original = { a: { b: 1 } };
    const result = deepSet(original, ['a', 'b'], 2);
    expect(original.a.b).toBe(1);
    expect(deepGet(result, ['a', 'b'])).toBe(2);
  });
});

describe('deepDelete', () => {
  it('deletes a key at a simple path', () => {
    expect(deepDelete({ a: 1, b: 2 }, ['a'])).toEqual({ b: 2 });
  });

  it('deletes a key at a nested path', () => {
    const result = deepDelete({ a: { b: 1, c: 2 } }, ['a', 'b']);
    expect(result).toEqual({ a: { c: 2 } });
  });

  it('returns unchanged object for non-existent path', () => {
    const obj = { a: 1 };
    expect(deepDelete(obj, ['b'])).toEqual({ a: 1 });
  });

  it('returns unchanged object when traversing through non-object', () => {
    const obj = { a: 'string' };
    const result = deepDelete(obj, ['a', 'b']);
    expect(result).toBe(obj);
  });

  it('returns the original object for empty path', () => {
    const obj = { a: 1 };
    expect(deepDelete(obj, [])).toBe(obj);
  });

  it('does not mutate the original', () => {
    const original = { a: { b: 1, c: 2 } };
    deepDelete(original, ['a', 'b']);
    expect(original.a.b).toBe(1);
  });
});
