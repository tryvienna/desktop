import { describe, it, expect } from 'vitest';
import {
  ModifierSchema,
  KeyboardShortcutSchema,
  KeybindingsMapSchema,
} from './schemas';

describe('ModifierSchema', () => {
  it('accepts valid modifiers', () => {
    expect(ModifierSchema.parse('cmd')).toBe('cmd');
    expect(ModifierSchema.parse('ctrl')).toBe('ctrl');
    expect(ModifierSchema.parse('alt')).toBe('alt');
    expect(ModifierSchema.parse('shift')).toBe('shift');
  });

  it('rejects invalid modifiers', () => {
    expect(ModifierSchema.safeParse('meta').success).toBe(false);
    expect(ModifierSchema.safeParse('super').success).toBe(false);
    expect(ModifierSchema.safeParse('').success).toBe(false);
  });
});

describe('KeyboardShortcutSchema', () => {
  it('accepts a shortcut with modifiers and a key', () => {
    const result = KeyboardShortcutSchema.parse({
      modifiers: ['cmd', 'shift'],
      key: 'p',
    });
    expect(result.modifiers).toEqual(['cmd', 'shift']);
    expect(result.key).toBe('p');
  });

  it('accepts a shortcut with no modifiers', () => {
    const result = KeyboardShortcutSchema.parse({ modifiers: [], key: 'a' });
    expect(result.modifiers).toEqual([]);
  });

  it('rejects an empty key', () => {
    expect(
      KeyboardShortcutSchema.safeParse({ modifiers: ['cmd'], key: '' }).success
    ).toBe(false);
  });

  it('rejects invalid modifier values', () => {
    expect(
      KeyboardShortcutSchema.safeParse({ modifiers: ['meta'], key: 'a' }).success
    ).toBe(false);
  });

  it('rejects missing key field', () => {
    expect(
      KeyboardShortcutSchema.safeParse({ modifiers: ['cmd'] }).success
    ).toBe(false);
  });
});

describe('KeybindingsMapSchema', () => {
  it('accepts a valid map', () => {
    const result = KeybindingsMapSchema.parse({
      'app:toggle-sidebar': { modifiers: ['cmd'], key: 'b' },
      'app:new-workstream': { modifiers: ['cmd'], key: 'n' },
    });
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('accepts an empty map', () => {
    expect(KeybindingsMapSchema.parse({})).toEqual({});
  });

  it('rejects a map with invalid shortcut values', () => {
    expect(
      KeybindingsMapSchema.safeParse({
        'app:bad': { modifiers: ['cmd'], key: '' },
      }).success
    ).toBe(false);
  });
});
