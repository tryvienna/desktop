/**
 * Keybindings Module
 *
 * Re-exports schemas, defaults, and utilities.
 */

export {
  ModifierSchema,
  KeyboardShortcutSchema,
  KeybindingsMapSchema,
} from './schemas';
export type { Modifier, KeyboardShortcut, KeybindingsMap } from './schemas';

export { DEFAULT_KEYBINDINGS, COMMAND_METADATA } from './defaults';
export type { CommandInfo } from './defaults';

export {
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
export type { KeyboardEventLike, Platform, Category } from './utils';
