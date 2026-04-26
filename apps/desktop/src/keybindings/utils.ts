/**
 * Keybindings Utilities
 *
 * @ai-context
 * Pure utility functions for keyboard shortcut operations. Every function
 * is deterministic and side-effect-free. Platform detection is NOT done
 * here — callers inject the platform string.
 *
 * @module keybindings/utils
 */

import type { Modifier, KeyboardShortcut, KeybindingsMap } from './schemas';
import { fuzzyMatch as sharedFuzzyMatch } from '@vienna/file-search';

// ─── Normalization & Comparison ─────────────────────────────────────────────

/** Normalize a shortcut: sort modifiers alphabetically, lowercase key. */
export function normalizeShortcut(shortcut: KeyboardShortcut): KeyboardShortcut {
  return {
    modifiers: [...shortcut.modifiers].sort() as Modifier[],
    key: shortcut.key.toLowerCase(),
  };
}

/** Stable string key for a shortcut. Used for Map/Set keys and conflict detection. */
export function shortcutKey(shortcut: KeyboardShortcut): string {
  const norm = normalizeShortcut(shortcut);
  return norm.modifiers.length > 0
    ? `${norm.modifiers.join('+')}+${norm.key}`
    : norm.key;
}

/** Check if two shortcuts are equivalent (same modifiers + key, order-independent). */
export function shortcutsEqual(a: KeyboardShortcut, b: KeyboardShortcut): boolean {
  return shortcutKey(a) === shortcutKey(b);
}

/** Find command IDs that conflict with a given shortcut. */
export function findConflicts(
  shortcut: KeyboardShortcut,
  keybindings: KeybindingsMap,
  excludeCommandId?: string
): string[] {
  const target = shortcutKey(shortcut);
  const conflicts: string[] = [];
  for (const [cmdId, binding] of Object.entries(keybindings)) {
    if (cmdId === excludeCommandId) continue;
    if (shortcutKey(binding) === target) {
      conflicts.push(cmdId);
    }
  }
  return conflicts;
}

// ─── Keyboard Event Extraction ──────────────────────────────────────────────

/** Minimal keyboard event interface for extraction (works with both DOM and React events). */
export interface KeyboardEventLike {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  key: string;
}

const BARE_MODIFIERS = new Set(['Meta', 'Control', 'Alt', 'Shift']);

/**
 * Extract a KeyboardShortcut from a keyboard event.
 * Returns null if the key is a bare modifier or no modifier is pressed.
 */
export function eventToShortcut(event: KeyboardEventLike): KeyboardShortcut | null {
  if (BARE_MODIFIERS.has(event.key)) return null;

  const modifiers: Modifier[] = [];
  if (event.metaKey) modifiers.push('cmd');
  // On macOS, Ctrl+Cmd combos fire both ctrlKey and metaKey. We suppress ctrlKey
  // when metaKey is active because 'cmd' already maps to Meta/⌘. This means
  // Ctrl+Cmd+X is treated as Cmd+X — intentional, since macOS apps don't
  // conventionally distinguish Ctrl+Cmd from Cmd alone.
  if (event.ctrlKey && !event.metaKey) modifiers.push('ctrl');
  if (event.altKey) modifiers.push('alt');
  if (event.shiftKey) modifiers.push('shift');

  if (modifiers.length === 0) return null;

  // On macOS, Alt+Space produces a non-breaking space (\u00A0) instead of ' '.
  // Normalize to regular space so Alt+Space shortcuts match their definitions.
  let key = event.key.toLowerCase();
  if (key === '\u00a0') key = ' ';

  return { modifiers, key };
}

/** Find the command ID matching a shortcut in a keybindings map, or null. */
export function matchKeybinding(
  shortcut: KeyboardShortcut,
  keybindings: KeybindingsMap
): string | null {
  const target = shortcutKey(shortcut);
  for (const [cmdId, binding] of Object.entries(keybindings)) {
    if (shortcutKey(binding) === target) return cmdId;
  }
  return null;
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export type Platform = 'mac' | 'other';

const MODIFIER_LABELS: Record<Modifier, Record<Platform, string>> = {
  cmd: { mac: '⌘', other: 'Ctrl' },
  ctrl: { mac: '⌃', other: 'Ctrl' },
  alt: { mac: '⌥', other: 'Alt' },
  shift: { mac: '⇧', other: 'Shift' },
};

const KEY_LABELS: Record<string, string> = {
  '/': '/',
  ',': ',',
  '.': '.',
  '\\': '\\',
  enter: '↵',
  escape: 'Esc',
  backspace: '⌫',
  delete: 'Del',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  tab: 'Tab',
  ' ': 'Space',
};

/** Get the display label for a modifier key. */
export function getModifierLabel(mod: Modifier, platform: Platform): string {
  return MODIFIER_LABELS[mod][platform];
}

/** Get the display label for a key. */
export function getKeyLabel(key: string): string {
  return KEY_LABELS[key.toLowerCase()] ?? key.toUpperCase();
}

/** Format a shortcut as a display string (e.g. "⌘⇧T" on mac, "Ctrl+Shift+T" on other). */
export function formatShortcut(shortcut: KeyboardShortcut, platform: Platform): string {
  const parts = [
    ...shortcut.modifiers.map((m) => getModifierLabel(m, platform)),
    getKeyLabel(shortcut.key),
  ];
  return platform === 'mac' ? parts.join('') : parts.join('+');
}

// ─── UI Constants ───────────────────────────────────────────────────────────

export type Category = 'navigation' | 'workstream' | 'view' | 'input' | 'settings' | 'developer' | 'help';

export const CATEGORY_ORDER: readonly Category[] = [
  'navigation',
  'workstream',
  'view',
  'input',
  'settings',
  'developer',
  'help',
] as const;

export const CATEGORY_LABELS: Record<Category, string> = {
  navigation: 'Navigation',
  workstream: 'Workstream',
  view: 'View',
  input: 'Input',
  settings: 'Settings',
  developer: 'Developer',
  help: 'Help',
};

/** Simple fuzzy match: all query chars appear in order in the target. */
export const fuzzyMatch = sharedFuzzyMatch;
