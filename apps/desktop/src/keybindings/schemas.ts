/**
 * Keybindings Zod Schemas
 *
 * @ai-context
 * This module is the SINGLE SOURCE OF TRUTH for all keybindings types.
 * Every other module imports schemas from here. Types are inferred from
 * schemas — never define a parallel interface.
 *
 * @module keybindings/schemas
 */

import { z } from 'zod';

/** Modifier keys. 'cmd' maps to Meta (⌘) on macOS, Ctrl elsewhere. */
export const ModifierSchema = z.enum(['cmd', 'ctrl', 'alt', 'shift']);
export type Modifier = z.infer<typeof ModifierSchema>;

/** A single keyboard shortcut: modifier keys + a trigger key. */
export const KeyboardShortcutSchema = z.object({
  modifiers: z.array(ModifierSchema),
  key: z.string().min(1),
});
export type KeyboardShortcut = z.infer<typeof KeyboardShortcutSchema>;

/** Map of command ID → shortcut. Used for both defaults and merged bindings. */
export const KeybindingsMapSchema = z.record(z.string(), KeyboardShortcutSchema);
export type KeybindingsMap = z.infer<typeof KeybindingsMapSchema>;
