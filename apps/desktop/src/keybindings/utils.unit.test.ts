import { describe, it, expect } from 'vitest';
import {
  normalizeShortcut,
  shortcutKey,
  shortcutsEqual,
  findConflicts,
  eventToShortcut,
  matchKeybinding,
  formatShortcut,
  getModifierLabel,
  getKeyLabel,
  fuzzyMatch,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from './utils';
import type { KeyboardShortcut, KeybindingsMap } from './schemas';

// ─── normalizeShortcut ──────────────────────────────────────────────────────

describe('normalizeShortcut', () => {
  it('sorts modifiers alphabetically', () => {
    const result = normalizeShortcut({ modifiers: ['shift', 'cmd', 'alt'], key: 'P' });
    expect(result.modifiers).toEqual(['alt', 'cmd', 'shift']);
  });

  it('lowercases the key', () => {
    const result = normalizeShortcut({ modifiers: ['cmd'], key: 'P' });
    expect(result.key).toBe('p');
  });

  it('handles empty modifiers', () => {
    const result = normalizeShortcut({ modifiers: [], key: 'a' });
    expect(result.modifiers).toEqual([]);
  });
});

// ─── shortcutKey ────────────────────────────────────────────────────────────

describe('shortcutKey', () => {
  it('produces a stable key regardless of modifier order', () => {
    const a: KeyboardShortcut = { modifiers: ['shift', 'cmd'], key: 'p' };
    const b: KeyboardShortcut = { modifiers: ['cmd', 'shift'], key: 'P' };
    expect(shortcutKey(a)).toBe(shortcutKey(b));
  });

  it('produces different keys for different shortcuts', () => {
    const a: KeyboardShortcut = { modifiers: ['cmd'], key: 'p' };
    const b: KeyboardShortcut = { modifiers: ['cmd'], key: 'k' };
    expect(shortcutKey(a)).not.toBe(shortcutKey(b));
  });

  it('handles no modifiers', () => {
    expect(shortcutKey({ modifiers: [], key: 'a' })).toBe('a');
  });

  it('includes all modifiers in the key', () => {
    expect(shortcutKey({ modifiers: ['cmd', 'shift'], key: 'p' })).toBe('cmd+shift+p');
  });
});

// ─── shortcutsEqual ─────────────────────────────────────────────────────────

describe('shortcutsEqual', () => {
  it('returns true for identical shortcuts', () => {
    expect(
      shortcutsEqual(
        { modifiers: ['cmd'], key: 'p' },
        { modifiers: ['cmd'], key: 'p' }
      )
    ).toBe(true);
  });

  it('returns true regardless of modifier order and key case', () => {
    expect(
      shortcutsEqual(
        { modifiers: ['shift', 'cmd'], key: 'P' },
        { modifiers: ['cmd', 'shift'], key: 'p' }
      )
    ).toBe(true);
  });

  it('returns false for different keys', () => {
    expect(
      shortcutsEqual(
        { modifiers: ['cmd'], key: 'p' },
        { modifiers: ['cmd'], key: 'k' }
      )
    ).toBe(false);
  });

  it('returns false for different modifiers', () => {
    expect(
      shortcutsEqual(
        { modifiers: ['cmd'], key: 'p' },
        { modifiers: ['alt'], key: 'p' }
      )
    ).toBe(false);
  });
});

// ─── findConflicts ──────────────────────────────────────────────────────────

describe('findConflicts', () => {
  const bindings: KeybindingsMap = {
    'app:sidebar': { modifiers: ['cmd'], key: 'b' },
    'app:palette': { modifiers: ['cmd', 'shift'], key: 'p' },
    'app:new': { modifiers: ['cmd'], key: 'n' },
  };

  it('returns empty when no conflicts', () => {
    expect(findConflicts({ modifiers: ['cmd'], key: 'k' }, bindings)).toEqual([]);
  });

  it('returns conflicting command ID', () => {
    expect(findConflicts({ modifiers: ['cmd'], key: 'b' }, bindings)).toEqual([
      'app:sidebar',
    ]);
  });

  it('excludes the specified command ID', () => {
    expect(
      findConflicts({ modifiers: ['cmd'], key: 'b' }, bindings, 'app:sidebar')
    ).toEqual([]);
  });
});

// ─── eventToShortcut ────────────────────────────────────────────────────────

describe('eventToShortcut', () => {
  it('returns null for bare modifier keys', () => {
    expect(
      eventToShortcut({ metaKey: true, ctrlKey: false, altKey: false, shiftKey: false, key: 'Meta' })
    ).toBeNull();
    expect(
      eventToShortcut({ metaKey: false, ctrlKey: true, altKey: false, shiftKey: false, key: 'Control' })
    ).toBeNull();
  });

  it('returns null when no modifier is pressed', () => {
    expect(
      eventToShortcut({ metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, key: 'a' })
    ).toBeNull();
  });

  it('extracts cmd from metaKey', () => {
    const result = eventToShortcut({
      metaKey: true, ctrlKey: false, altKey: false, shiftKey: false, key: 'p',
    });
    expect(result).toEqual({ modifiers: ['cmd'], key: 'p' });
  });

  it('extracts multiple modifiers', () => {
    const result = eventToShortcut({
      metaKey: true, ctrlKey: false, altKey: true, shiftKey: true, key: 'k',
    });
    expect(result).toEqual({ modifiers: ['cmd', 'alt', 'shift'], key: 'k' });
  });

  it('maps ctrlKey to ctrl when metaKey is not pressed', () => {
    const result = eventToShortcut({
      metaKey: false, ctrlKey: true, altKey: false, shiftKey: false, key: 'c',
    });
    expect(result).toEqual({ modifiers: ['ctrl'], key: 'c' });
  });

  it('ignores ctrlKey when metaKey is pressed (Mac behavior)', () => {
    const result = eventToShortcut({
      metaKey: true, ctrlKey: true, altKey: false, shiftKey: false, key: 'c',
    });
    expect(result).toEqual({ modifiers: ['cmd'], key: 'c' });
  });

  it('lowercases the key', () => {
    const result = eventToShortcut({
      metaKey: true, ctrlKey: false, altKey: false, shiftKey: false, key: 'P',
    });
    expect(result?.key).toBe('p');
  });

  it('normalizes macOS non-breaking space (Alt+Space) to regular space', () => {
    const result = eventToShortcut({
      metaKey: false, ctrlKey: false, altKey: true, shiftKey: false, key: '\u00A0',
    });
    expect(result).toEqual({ modifiers: ['alt'], key: ' ' });
  });
});

// ─── matchKeybinding ────────────────────────────────────────────────────────

describe('matchKeybinding', () => {
  const bindings: KeybindingsMap = {
    'app:sidebar': { modifiers: ['cmd'], key: 'b' },
    'app:palette': { modifiers: ['cmd', 'shift'], key: 'p' },
  };

  it('returns matching command ID', () => {
    expect(matchKeybinding({ modifiers: ['cmd'], key: 'b' }, bindings)).toBe('app:sidebar');
  });

  it('matches regardless of modifier order', () => {
    expect(matchKeybinding({ modifiers: ['shift', 'cmd'], key: 'p' }, bindings)).toBe('app:palette');
  });

  it('returns null when no match', () => {
    expect(matchKeybinding({ modifiers: ['cmd'], key: 'z' }, bindings)).toBeNull();
  });
});

// ─── Formatting ─────────────────────────────────────────────────────────────

describe('getModifierLabel', () => {
  it('returns Mac symbols', () => {
    expect(getModifierLabel('cmd', 'mac')).toBe('⌘');
    expect(getModifierLabel('alt', 'mac')).toBe('⌥');
    expect(getModifierLabel('shift', 'mac')).toBe('⇧');
    expect(getModifierLabel('ctrl', 'mac')).toBe('⌃');
  });

  it('returns text labels for other platforms', () => {
    expect(getModifierLabel('cmd', 'other')).toBe('Ctrl');
    expect(getModifierLabel('alt', 'other')).toBe('Alt');
    expect(getModifierLabel('shift', 'other')).toBe('Shift');
  });
});

describe('getKeyLabel', () => {
  it('returns special key labels', () => {
    expect(getKeyLabel('enter')).toBe('↵');
    expect(getKeyLabel('escape')).toBe('Esc');
    expect(getKeyLabel('backspace')).toBe('⌫');
    expect(getKeyLabel('arrowup')).toBe('↑');
    expect(getKeyLabel(' ')).toBe('Space');
  });

  it('uppercases regular keys', () => {
    expect(getKeyLabel('p')).toBe('P');
    expect(getKeyLabel('b')).toBe('B');
  });

  it('passes through special characters', () => {
    expect(getKeyLabel('/')).toBe('/');
    expect(getKeyLabel(',')).toBe(',');
  });
});

describe('formatShortcut', () => {
  it('formats for Mac without separators', () => {
    expect(formatShortcut({ modifiers: ['cmd', 'shift'], key: 'p' }, 'mac')).toBe('⌘⇧P');
  });

  it('formats for other platforms with + separator', () => {
    expect(formatShortcut({ modifiers: ['cmd', 'shift'], key: 'p' }, 'other')).toBe('Ctrl+Shift+P');
  });

  it('formats special keys', () => {
    expect(formatShortcut({ modifiers: ['cmd'], key: 'enter' }, 'mac')).toBe('⌘↵');
  });
});

// ─── fuzzyMatch ─────────────────────────────────────────────────────────────

describe('fuzzyMatch', () => {
  it('matches when all chars appear in order', () => {
    expect(fuzzyMatch('nav', 'Navigation')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(fuzzyMatch('NAV', 'navigation')).toBe(true);
  });

  it('returns false when chars are not in order', () => {
    expect(fuzzyMatch('zx', 'navigation')).toBe(false);
  });

  it('matches empty query to anything', () => {
    expect(fuzzyMatch('', 'anything')).toBe(true);
  });

  it('fails when query is longer than target', () => {
    expect(fuzzyMatch('longquery', 'short')).toBe(false);
  });
});

// ─── CATEGORY constants ─────────────────────────────────────────────────────

describe('CATEGORY constants', () => {
  it('CATEGORY_LABELS has an entry for every CATEGORY_ORDER value', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
    }
  });
});
