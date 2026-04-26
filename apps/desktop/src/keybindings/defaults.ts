/**
 * Default Keybindings & Command Metadata
 *
 * @ai-context
 * Source of truth for factory-default keyboard shortcuts and the command
 * catalog (title, description, category). Used for initial keybindings,
 * reset operations, and the shortcuts UI.
 *
 * @module keybindings/defaults
 */

import { KeybindingsMapSchema } from './schemas';
import type { KeybindingsMap } from './schemas';
import type { Category } from './utils';

/** Command metadata for UI display. */
export interface CommandInfo {
  readonly title: string;
  readonly description?: string;
  readonly category: Category;
}

/**
 * Factory-default keybindings.
 * Validated at import time — a typo here crashes immediately.
 */
export const DEFAULT_KEYBINDINGS: KeybindingsMap = KeybindingsMapSchema.parse({
  // ─── Navigation ────────────────────────────────────────────────────
  'app:command-palette': { modifiers: ['cmd', 'shift'], key: 'p' },
  'app:nav-home': { modifiers: ['cmd'], key: '1' },
  'app:entity-browser': { modifiers: ['cmd'], key: 'p' },
  'app:toggle-sidebar': { modifiers: ['cmd'], key: 'b' },
  'app:toggle-drawer': { modifiers: ['cmd'], key: '\\' },
  'app:global-search': { modifiers: ['cmd', 'shift'], key: 'f' },
  'chat:focus-input': { modifiers: ['cmd'], key: 'j' },

  // ─── Workstream ────────────────────────────────────────────────────
  'app:new-workstream': { modifiers: ['cmd'], key: 'n' },
  'app:new-group': { modifiers: ['cmd', 'shift'], key: 'n' },
  'workstream:browse': { modifiers: ['cmd'], key: 'g' },
  'workstream:settings': { modifiers: ['cmd'], key: ',' },
  'workstream:recall-message': { modifiers: ['cmd', 'shift'], key: 'l' },
  'workstream:mark-needs-verification': { modifiers: ['cmd', 'shift'], key: 'v' },

  // ─── Workstream (cont.) ──────────────────────────────────────────────
  'workstream:toggle-previous': { modifiers: ['cmd'], key: '`' },
  'workstream:toggle-todo-panel': { modifiers: ['cmd', 'shift'], key: 't' },

  // ─── Settings ──────────────────────────────────────────────────────
  'app:toggle-theme': { modifiers: ['cmd', 'alt'], key: 't' },
  'app:nav-settings': { modifiers: ['cmd', 'shift'], key: ',' },

  // ─── Developer ─────────────────────────────────────────────────────
  'app:toggle-devtools': { modifiers: ['cmd', 'alt'], key: 'i' },
  'app:reload': { modifiers: ['cmd'], key: 'r' },

  // ─── View ──────────────────────────────────────────────────────────
  'view:zoom-in': { modifiers: ['cmd'], key: '=' },
  'view:zoom-out': { modifiers: ['cmd'], key: '-' },
  'view:zoom-reset': { modifiers: ['cmd'], key: '0' },

  // ─── Input ────────────────────────────────────────────────────────
  'input:voice': { modifiers: ['alt'], key: ' ' },

  // ─── Help ──────────────────────────────────────────────────────────
  'app:keyboard-shortcuts': { modifiers: ['cmd'], key: '/' },
});

/**
 * Command metadata — title, description, and category for each command.
 * Must have an entry for every key in DEFAULT_KEYBINDINGS.
 */
export const COMMAND_METADATA: Record<string, CommandInfo> = {
  // Navigation
  'app:command-palette': { title: 'Command Palette', description: 'Open the command palette', category: 'navigation' },
  'app:nav-home': { title: 'Go Home', description: 'Navigate to the home screen', category: 'navigation' },
  'chat:focus-input': { title: 'Focus Chat Input', description: 'Move focus to the chat input', category: 'navigation' },
  'app:entity-browser': { title: 'Entity Browser', description: 'Open the entity browser', category: 'navigation' },
  'app:toggle-sidebar': { title: 'Toggle Sidebar', description: 'Show or hide the sidebar', category: 'navigation' },
  'app:toggle-drawer': { title: 'Toggle Drawer', description: 'Show or hide the drawer panel', category: 'navigation' },
  'app:global-search': { title: 'Search in Files', description: 'Search file contents across all directories', category: 'navigation' },

  // Workstream
  'app:new-workstream': { title: 'New Workstream', description: 'Create a new workstream', category: 'workstream' },
  'app:new-group': { title: 'New Scope', description: 'Create a new scope', category: 'workstream' },
  'workstream:browse': { title: 'Browse Workstreams', description: 'Open the workstream browser', category: 'workstream' },
  'workstream:settings': { title: 'Workstream Settings', description: 'Open current workstream settings', category: 'workstream' },
  'workstream:recall-message': { title: 'Recall Last Message', description: 'Recall the last sent message', category: 'workstream' },
  'workstream:mark-needs-verification': { title: 'Mark Needs Verification', description: 'Flag the active workstream for manual review', category: 'workstream' },
  'workstream:toggle-previous': { title: 'Toggle Previous Workstream', description: 'Switch between current and last active workstream', category: 'workstream' },
  'workstream:toggle-todo-panel': { title: 'Toggle Task List', description: 'Show or hide the active task list panel', category: 'workstream' },

  // Settings
  'app:toggle-theme': { title: 'Toggle Theme', description: 'Switch between light and dark themes', category: 'settings' },
  'app:nav-settings': { title: 'Open Settings', description: 'Navigate to settings', category: 'settings' },

  // Developer
  'app:toggle-devtools': { title: 'Toggle DevTools', description: 'Open or close developer tools', category: 'developer' },
  'app:reload': { title: 'Reload App', description: 'Reload the application window', category: 'developer' },

  // View
  'view:zoom-in': { title: 'Zoom In', description: 'Increase the UI zoom level', category: 'view' },
  'view:zoom-out': { title: 'Zoom Out', description: 'Decrease the UI zoom level', category: 'view' },
  'view:zoom-reset': { title: 'Actual Size', description: 'Reset the UI zoom to 100%', category: 'view' },

  // Input
  'input:voice': { title: 'Voice Input', description: 'Hold to record, release to transcribe (push-to-talk)', category: 'input' },

  // Help
  'app:keyboard-shortcuts': { title: 'Keyboard Shortcuts', description: 'Show all keyboard shortcuts', category: 'help' },
};
