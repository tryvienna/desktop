/**
 * Zod Input Schemas for MCP Tools
 *
 * Each tool has a Zod schema that:
 * 1. Validates input at runtime before the handler runs
 * 2. Converts to JSON Schema for MCP tool registration
 *
 * Types are derived via z.infer<> (Vienna convention).
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// entity_get
// ─────────────────────────────────────────────────────────────────────────────

export const EntityGetInputSchema = z.object({
  uri: z
    .string()
    .refine((s) => s.startsWith('@vienna//'), { message: 'URI must start with @vienna//' })
    .describe('Entity URI (e.g., @vienna//skill/my-skill)'),
});
export type EntityGetInput = z.infer<typeof EntityGetInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// entity_types (no input required)
// ─────────────────────────────────────────────────────────────────────────────

export const EntityTypesInputSchema = z.object({});
export type EntityTypesInput = z.infer<typeof EntityTypesInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// graphql_execute
// ─────────────────────────────────────────────────────────────────────────────

export const GraphqlExecuteInputSchema = z.object({
  query: z
    .string()
    .describe(
      'GraphQL query or mutation string. Use graphql_operations to discover available operations first.'
    ),
  variables: z
    .union([z.record(z.unknown()), z.string()])
    .optional()
    .transform((v) => {
      if (typeof v === 'string') {
        try { return JSON.parse(v) as Record<string, unknown>; }
        catch { throw new Error(`Invalid JSON in variables: ${v.slice(0, 200)}`); }
      }
      return v;
    })
    .describe('Variables for the GraphQL operation (object or JSON string)'),
});
export type GraphqlExecuteInput = z.infer<typeof GraphqlExecuteInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// graphql_operations
// ─────────────────────────────────────────────────────────────────────────────

export const GraphqlOperationsInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      'Search keyword to filter operations (e.g., "merge", "PR", "issue", "workstream"). ' +
        'Matches against operation name and description. Omit to list all.'
    ),
  kind: z
    .enum(['query', 'mutation'])
    .optional()
    .describe('Filter by operation kind. Omit to include both queries and mutations.'),
});
export type GraphqlOperationsInput = z.infer<typeof GraphqlOperationsInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// workstream_create
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamCreateInputSchema = z.object({
  projectId: z.string().describe('ID of the project to create the workstream in'),
  title: z.string().min(1).max(200).describe('Title for the new workstream'),
  model: z
    .string()
    .optional()
    .describe('AI model to use (e.g., "haiku", "sonnet", "opus"). Defaults to project default.'),
  groupName: z
    .string()
    .optional()
    .describe('Name of the workstream group to place this workstream in (matched by name, auto-created if it does not exist)'),
  createWorktrees: z
    .boolean()
    .optional()
    .describe('If true, create git worktrees for each inherited project directory. The workstream gets its own branch and working copy.'),
  branchName: z
    .string()
    .optional()
    .describe('Custom git branch name for worktrees. Auto-generated from title if omitted.'),
  baseBranch: z
    .string()
    .optional()
    .describe('Base branch to create worktrees from (e.g., "main"). Uses repo default if omitted.'),
});
export type WorkstreamCreateInput = z.infer<typeof WorkstreamCreateInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// workstream_send_message
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamSendMessageInputSchema = z.object({
  workstreamId: z.string().describe('ID of the workstream to send the message to'),
  text: z.string().min(1).describe('Message text to send to the workstream agent'),
});
export type WorkstreamSendMessageInput = z.infer<typeof WorkstreamSendMessageInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// reference_add
// ─────────────────────────────────────────────────────────────────────────────

export const ReferenceAddInputSchema = z.object({
  entityUri: z
    .string()
    .refine((s) => s.startsWith('@vienna//'), { message: 'URI must start with @vienna//' })
    .describe('Entity URI to add as a reference (e.g., @vienna//github_pr/owner/repo/42)'),
  entityType: z
    .string()
    .describe('Entity type (e.g., "github_pr", "linear_issue")'),
  entityTitle: z
    .string()
    .optional()
    .describe('Optional human-readable title for the reference'),
});
export type ReferenceAddInput = z.infer<typeof ReferenceAddInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// reference_remove
// ─────────────────────────────────────────────────────────────────────────────

export const ReferenceRemoveInputSchema = z.object({
  entityUri: z
    .string()
    .refine((s) => s.startsWith('@vienna//'), { message: 'URI must start with @vienna//' })
    .describe('Entity URI to remove from references'),
});
export type ReferenceRemoveInput = z.infer<typeof ReferenceRemoveInputSchema>;
