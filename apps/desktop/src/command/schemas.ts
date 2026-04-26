/**
 * Command Palette Schemas
 *
 * @ai-context
 * SINGLE SOURCE OF TRUTH for command palette types. All other modules
 * import schemas from here. Types are inferred from schemas — never
 * define a parallel interface.
 *
 * Used by: IPC contract, CommandRegistry, CommandProvider, overlay.
 *
 * @module command/schemas
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Command categories for palette tab filtering and icon mapping.
 *
 * Matches the CommandCategory type in @vienna/chat-ui palette types.
 */
export const CommandCategorySchema = z.enum([
  'claude',
  'navigation',
  'workstream',
  'skill',
  'file',
  'edit',
  'view',
  'ai',
  'integrations',
  'settings',
  'developer',
  'help',
]);
export type CommandCategory = z.infer<typeof CommandCategorySchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serializable command definition. Sent over IPC and used by the renderer
 * to build the palette UI. Does NOT include the execution handler (which
 * lives only in the main process).
 */
export const CommandDefinitionSchema = z.object({
  /** Unique command ID (e.g. "app:toggle-sidebar", "claude:switch-model") */
  id: z.string().min(1),
  /** Category for tab filtering */
  category: CommandCategorySchema,
  /** Display title in the palette */
  title: z.string().min(1),
  /** Description shown below the title */
  description: z.string().optional(),
  /** Additional search terms for fuzzy matching */
  keywords: z.array(z.string()).optional(),
  /** Whether this command is currently disabled */
  disabled: z.boolean().optional(),
  /** Reason shown when command is disabled */
  disabledReason: z.string().optional(),
  /** Whether this command opens a multi-step flow */
  hasFlow: z.boolean().optional(),
  /** Raw command body (custom Claude commands — used for placeholder interpolation in the renderer) */
  body: z.string().optional(),
});
export type CommandDefinition = z.infer<typeof CommandDefinitionSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Actions the renderer should perform after a command executes.
 * Discriminated union on `type`.
 */
export const CommandResultActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('navigate'), path: z.string() }),
  z.object({
    type: z.literal('toast'),
    message: z.string(),
    variant: z.enum(['info', 'success', 'warning', 'error']).optional(),
  }),
  z.object({ type: z.literal('insertText'), text: z.string() }),
]);
export type CommandResultAction = z.infer<typeof CommandResultActionSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

/** Array of command definitions — the full catalog. */
export const CommandCatalogSchema = z.array(CommandDefinitionSchema);
export type CommandCatalog = z.infer<typeof CommandCatalogSchema>;
