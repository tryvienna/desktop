import { describe, it, expect } from 'vitest';
import { DEFAULT_KEYBINDINGS, COMMAND_METADATA } from './defaults';
import { shortcutKey } from './utils';
import { CATEGORY_ORDER } from './utils';

describe('DEFAULT_KEYBINDINGS', () => {
  it('is a non-empty map', () => {
    expect(Object.keys(DEFAULT_KEYBINDINGS).length).toBeGreaterThan(0);
  });

  it('contains no duplicate shortcuts', () => {
    const seen = new Map<string, string>();
    for (const [cmdId, shortcut] of Object.entries(DEFAULT_KEYBINDINGS)) {
      const key = shortcutKey(shortcut);
      const existing = seen.get(key);
      expect(existing).toBeUndefined();
      seen.set(key, cmdId);
    }
  });
});

describe('COMMAND_METADATA', () => {
  it('has an entry for every default keybinding', () => {
    for (const cmdId of Object.keys(DEFAULT_KEYBINDINGS)) {
      expect(COMMAND_METADATA[cmdId]).toBeDefined();
    }
  });

  it('every entry has a valid category', () => {
    for (const [cmdId, meta] of Object.entries(COMMAND_METADATA)) {
      expect(CATEGORY_ORDER).toContain(meta.category);
      expect(meta.title.length).toBeGreaterThan(0);
      // cmdId just needs to exist (already checked above)
      expect(cmdId).toBeTruthy();
    }
  });

  it('has no orphan metadata (all metadata keys have matching defaults)', () => {
    for (const cmdId of Object.keys(COMMAND_METADATA)) {
      expect(DEFAULT_KEYBINDINGS[cmdId]).toBeDefined();
    }
  });
});
