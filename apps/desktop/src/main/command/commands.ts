/**
 * Static Command Catalog — Built-in commands for the command palette.
 *
 * @ai-context
 * Defines the static catalog of app commands. Each command has metadata
 * for display (title, description, keywords, category) but NOT execution
 * logic (handlers are registered separately in main.ts).
 *
 * Keyboard shortcuts are NOT hardcoded here — they are resolved at runtime
 * from the keybindings system so users can customize them.
 *
 * To add a new command:
 * 1. Add the CommandDefinition here
 * 2. Register a handler in the appropriate handlers/ module
 * 3. Optionally add a default keybinding in keybindings/defaults.ts
 *
 * @module main/command/commands
 */

import type { CommandDefinition } from '../../command/schemas';

export const BUILTIN_COMMANDS: CommandDefinition[] = [
  // ─── Navigation ────────────────────────────────────────────────────────

  {
    id: 'app:command-palette',
    category: 'navigation',
    title: 'Command Palette',
    description: 'Open the command palette',
    keywords: ['commands', 'search', 'palette'],
  },
  {
    id: 'app:nav-home',
    category: 'navigation',
    title: 'Go Home',
    description: 'Navigate to the home screen',
    keywords: ['home', 'main'],
  },
  {
    id: 'app:entity-browser',
    category: 'navigation',
    title: 'Entity Browser',
    description: 'Open the entity browser',
    keywords: ['entities', 'search', 'find', 'browse'],
  },
  {
    id: 'app:toggle-sidebar',
    category: 'navigation',
    title: 'Toggle Sidebar',
    description: 'Show or hide the sidebar',
    keywords: ['sidebar', 'panel', 'nav'],
  },
  {
    id: 'app:toggle-drawer',
    category: 'navigation',
    title: 'Toggle Drawer',
    description: 'Show or hide the drawer panel',
    keywords: ['drawer', 'panel', 'details'],
  },

  // ─── Workstream ────────────────────────────────────────────────────────

  {
    id: 'app:new-workstream',
    category: 'workstream',
    title: 'New Workstream',
    description: 'Create a new workstream',
    keywords: ['create', 'new', 'workstream'],
  },
  {
    id: 'app:new-group',
    category: 'workstream',
    title: 'New Scope',
    description: 'Create a new scope',
    keywords: ['create', 'new', 'scope', 'group'],
  },
  {
    id: 'workstream:browse',
    category: 'workstream',
    title: 'Browse Workstreams',
    description: 'Browse and switch workstreams',
    keywords: ['list', 'switch', 'workstream', 'go'],
    hasFlow: true,
  },
  {
    id: 'workstream:settings',
    category: 'workstream',
    title: 'Workstream Settings',
    description: 'Open current workstream settings',
    keywords: ['config', 'configure', 'workstream'],
  },
  {
    id: 'workstream:move-to-group',
    category: 'workstream',
    title: 'Move to Scope',
    description: 'Move a workstream to a scope',
    keywords: ['move', 'scope', 'group', 'assign', 'organize'],
    hasFlow: true,
  },
  {
    id: 'workstream:recall-message',
    category: 'workstream',
    title: 'Recall Last Message',
    description: 'Recall the last sent message',
    keywords: ['undo', 'recall', 'retract', 'message'],
  },
  {
    id: 'workstream:mark-needs-verification',
    category: 'workstream',
    title: 'Mark Needs Verification',
    description: 'Flag the active workstream for manual review',
    keywords: ['verify', 'review', 'check', 'flag', 'shield'],
  },
  {
    id: 'workstream:archive',
    category: 'workstream',
    title: 'Archive Workstream',
    description: 'Archive a workstream',
    keywords: ['archive', 'close', 'workstream'],
    hasFlow: true,
  },
  {
    id: 'workstream:delete',
    category: 'workstream',
    title: 'Delete Workstream',
    description: 'Permanently delete a workstream',
    keywords: ['delete', 'remove', 'workstream'],
    hasFlow: true,
  },
  {
    id: 'workstream:unarchive',
    category: 'workstream',
    title: 'Restore Workstream',
    description: 'Restore an archived workstream',
    keywords: ['workstream', 'unarchive', 'restore'],
    hasFlow: true,
  },
  {
    id: 'workstream:bulk-archive',
    category: 'workstream',
    title: 'Bulk Archive Workstreams',
    description: 'Archive multiple workstreams at once',
    keywords: ['bulk', 'archive', 'mass', 'multiple', 'workstreams', 'clean'],
    hasFlow: true,
  },
  {
    id: 'workstream:bulk-delete',
    category: 'workstream',
    title: 'Bulk Delete Workstreams',
    description: 'Permanently delete multiple workstreams at once',
    keywords: ['bulk', 'delete', 'mass', 'multiple', 'workstreams', 'remove'],
    hasFlow: true,
  },
  {
    id: 'workstream:pin',
    category: 'workstream',
    title: 'Pin Workstream',
    description: 'Pin a workstream to the top',
    keywords: ['pin', 'stick', 'favorite', 'workstream'],
    hasFlow: true,
  },
  {
    id: 'workstream:unpin',
    category: 'workstream',
    title: 'Unpin Workstream',
    description: 'Unpin a workstream',
    keywords: ['unpin', 'unstick', 'unfavorite', 'workstream'],
    hasFlow: true,
  },
  {
    id: 'group:create',
    category: 'workstream',
    title: 'New Scope',
    description: 'Create a new scope',
    keywords: ['create', 'new', 'scope', 'group', 'organize'],
    hasFlow: true,
  },
  {
    id: 'group:rename',
    category: 'workstream',
    title: 'Rename Scope',
    description: 'Rename a scope',
    keywords: ['rename', 'scope', 'group', 'name'],
    hasFlow: true,
  },
  {
    id: 'group:pin',
    category: 'workstream',
    title: 'Pin Scope',
    description: 'Pin a scope to the sidebar',
    keywords: ['pin', 'scope', 'group', 'sidebar', 'favorite'],
    hasFlow: true,
  },
  {
    id: 'group:unpin',
    category: 'workstream',
    title: 'Unpin Scope',
    description: 'Unpin a scope from the sidebar',
    keywords: ['unpin', 'scope', 'group', 'sidebar'],
    hasFlow: true,
  },
  {
    id: 'group:archive',
    category: 'workstream',
    title: 'Archive Scope',
    description: 'Archive a scope and all its workstreams',
    keywords: ['archive', 'scope', 'group', 'close'],
    hasFlow: true,
  },
  {
    id: 'group:delete',
    category: 'workstream',
    title: 'Delete Scope',
    description: 'Delete a scope',
    keywords: ['delete', 'remove', 'scope', 'group'],
    hasFlow: true,
  },

  {
    id: 'workstream:open-changes',
    category: 'workstream',
    title: 'Open Workstream Changes',
    description: 'Review git changes for the active workstream',
    keywords: ['diff', 'changes', 'git', 'review', 'code review'],
  },

  // ─── Tags ────────────────────────────────────────────────────────────

  {
    id: 'tag:apply',
    category: 'workstream',
    title: 'Apply Tag',
    description: 'Apply a tag to a workstream',
    keywords: ['tag', 'apply', 'add', 'workstream'],
    hasFlow: true,
  },
  {
    id: 'tag:remove',
    category: 'workstream',
    title: 'Remove Tag',
    description: 'Remove a tag from a workstream',
    keywords: ['tag', 'remove', 'delete', 'workstream'],
    hasFlow: true,
  },
  {
    id: 'tag:create',
    category: 'workstream',
    title: 'Create Tag',
    description: 'Open tag settings to create a new tag',
    keywords: ['tag', 'create', 'new', 'settings'],
  },
  {
    id: 'tag:manage',
    category: 'workstream',
    title: 'Manage Tags',
    description: 'Open tag settings to manage project tags',
    keywords: ['tag', 'manage', 'edit', 'settings'],
  },

  // ─── Claude / Agent ────────────────────────────────────────────────────

  {
    id: 'claude:switch-model',
    category: 'claude',
    title: 'Switch Model',
    description: 'Change the active AI model',
    keywords: ['model', 'haiku', 'sonnet', 'opus', 'change', 'switch'],
    hasFlow: true,
  },
  {
    id: 'claude:clear-conversation',
    category: 'claude',
    title: 'Clear Conversation',
    description: 'Clear the current conversation history',
    keywords: ['clear', 'reset', 'conversation', 'history'],
    hasFlow: true,
  },
  {
    id: 'claude:compact',
    category: 'claude',
    title: 'Compact Conversation',
    description: 'Summarize the conversation to save context',
    keywords: ['compact', 'summarize', 'context'],
    hasFlow: true,
  },
  {
    id: 'claude:cost',
    category: 'claude',
    title: 'Token Usage',
    description: 'Show current token usage and cost',
    keywords: ['cost', 'tokens', 'usage', 'billing'],
    hasFlow: true,
  },
  {
    id: 'claude:permissions',
    category: 'claude',
    title: 'Manage Permissions',
    description: 'View and manage tool permissions',
    keywords: ['permissions', 'tools', 'access', 'security'],
    hasFlow: true,
  },
  {
    id: 'claude:mcp',
    category: 'claude',
    title: 'MCP Servers',
    description: 'View MCP server connection status',
    keywords: ['mcp', 'server', 'tools', 'integration'],
  },
  {
    id: 'claude:memory',
    category: 'claude',
    title: 'Edit Memory',
    description: 'Edit CLAUDE.md persistent memory',
    keywords: ['memory', 'claude', 'instructions', 'context'],
  },
  {
    id: 'claude:add-dir',
    category: 'claude',
    title: 'Add Directory',
    description: 'Add a working directory to the agent',
    keywords: ['directory', 'folder', 'path', 'add'],
    hasFlow: true,
  },
  {
    id: 'claude:todos',
    category: 'claude',
    title: 'View TODOs',
    description: 'List current task items',
    keywords: ['todos', 'tasks', 'list'],
    hasFlow: true,
  },

  // ─── Settings ──────────────────────────────────────────────────────────

  {
    id: 'app:toggle-theme',
    category: 'settings',
    title: 'Toggle Theme',
    description: 'Switch between light and dark themes',
    keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
  },
  {
    id: 'app:nav-settings',
    category: 'settings',
    title: 'Open Settings',
    description: 'Navigate to the settings page',
    keywords: ['settings', 'preferences', 'config'],
  },

  // ─── Developer ─────────────────────────────────────────────────────────

  {
    id: 'app:toggle-devtools',
    category: 'developer',
    title: 'Toggle DevTools',
    description: 'Open or close developer tools',
    keywords: ['devtools', 'inspector', 'debug', 'console'],
  },
  {
    id: 'app:reload',
    category: 'developer',
    title: 'Reload App',
    description: 'Reload the application window',
    keywords: ['reload', 'refresh', 'restart'],
  },

  // ─── Help ──────────────────────────────────────────────────────────────

  {
    id: 'app:keyboard-shortcuts',
    category: 'help',
    title: 'Keyboard Shortcuts',
    description: 'Show all keyboard shortcuts',
    keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keybindings'],
  },
];
