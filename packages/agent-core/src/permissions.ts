/**
 * Permission Types
 *
 * Zod schemas for the unified permission engine. These define how permission
 * rules are stored, matched, and evaluated — provider-agnostic.
 *
 * @module agent-core/permissions
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Permission Rule
// ─────────────────────────────────────────────────────────────────────────────

export const PermissionBehaviorSchema = z.enum(['allow', 'deny']);
export type PermissionBehavior = z.infer<typeof PermissionBehaviorSchema>;

export const PermissionScopeSchema = z.enum(['session', 'persistent']);
export type PermissionScope = z.infer<typeof PermissionScopeSchema>;

export const PermissionRuleSchema = z.object({
  id: z.number().optional(),
  toolName: z.string(),
  behavior: PermissionBehaviorSchema,
  scope: PermissionScopeSchema,
  /** NULL for persistent rules */
  sessionId: z.string().nullable(),
  /** Optional glob pattern for directory-scoped rules */
  directoryPattern: z.string().nullable().optional(),
  /** Optional: provider-specific rules (null = applies to all providers) */
  providerId: z.string().nullable().optional(),
  createdAt: z.number(),
});
export type PermissionRule = z.infer<typeof PermissionRuleSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Permission Check
// ─────────────────────────────────────────────────────────────────────────────

export const PermissionCheckRequestSchema = z.object({
  toolName: z.string(),
  input: z.record(z.unknown()),
  sessionId: z.string(),
  providerId: z.string(),
  /** The working directory for directory-scope matching */
  cwd: z.string().optional(),
});
export type PermissionCheckRequest = z.infer<typeof PermissionCheckRequestSchema>;

export const PermissionCheckResultSchema = z.object({
  allowed: z.boolean(),
  /** The rule that matched, if any */
  matchedRule: PermissionRuleSchema.nullable(),
  reason: z.enum(['rule_match', 'no_match', 'default_deny']),
});
export type PermissionCheckResult = z.infer<typeof PermissionCheckResultSchema>;
