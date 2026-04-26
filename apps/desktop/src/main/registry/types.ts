/**
 * Registry content types — Zod schemas for data read from registry repos.
 *
 * These describe the structure of files inside a registry Git repo,
 * NOT records persisted in the database.
 *
 * @module main/registry/types
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Registry metadata (registry.json at repo root)
// ─────────────────────────────────────────────────────────────────────────────

export const RegistryMetadataSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  version: z.number(),
  updatedAt: z.string().optional(),
});
export type RegistryMetadata = z.infer<typeof RegistryMetadataSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Quick actions (quick-actions/_index.json entries)
// ─────────────────────────────────────────────────────────────────────────────

export const QuickActionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  prompt: z.string(),
});
export type QuickActionOption = z.infer<typeof QuickActionOptionSchema>;

export const QuickActionAuthorSchema = z.object({
  name: z.string(),
});
export type QuickActionAuthor = z.infer<typeof QuickActionAuthorSchema>;

export const QuickActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
  description: z.string(),
  author: QuickActionAuthorSchema,
  tags: z.array(z.string()).default([]),
  options: z.array(QuickActionOptionSchema),
  registry: z.string().optional(),
});
export type QuickAction = z.infer<typeof QuickActionSchema>;

export const QuickActionDefaultsSchema = z.object({
  version: z.number(),
  defaults: z.array(z.string()),
});
export type QuickActionDefaults = z.infer<typeof QuickActionDefaultsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Skills (skills/_index.json entries)
// ─────────────────────────────────────────────────────────────────────────────

export const RegistrySkillAuthorSchema = z.object({
  name: z.string(),
});
export type RegistrySkillAuthor = z.infer<typeof RegistrySkillAuthorSchema>;

export const RegistrySkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().optional(),
  source: z.enum(['inline', 'github', 'registry']),
  repo: z.string().optional(),
  path: z.string().optional(),           // subdirectory within repo containing SKILL.md
  icon: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  author: RegistrySkillAuthorSchema.optional(),
  registry: z.string().optional(),
});
export type RegistrySkill = z.infer<typeof RegistrySkillSchema>;

export const RegistrySkillDefaultsSchema = z.object({
  version: z.number(),
  defaults: z.array(z.string()),
});
export type RegistrySkillDefaults = z.infer<typeof RegistrySkillDefaultsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Verification actions (verification-actions/_index.json entries)
// ─────────────────────────────────────────────────────────────────────────────

export const BuiltinVerificationActionIdSchema = z.enum([
  'workstream:archive',
  'workstream:delete',
  'workstream:pin',
]);
export type BuiltinVerificationActionId = z.infer<typeof BuiltinVerificationActionIdSchema>;

export const VerificationActionSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    type: z.literal('builtin'),
    builtinId: BuiltinVerificationActionIdSchema,
    label: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('prompt'),
    label: z.string(),
    prompt: z.string(),
  }),
]);
export type VerificationAction = z.infer<typeof VerificationActionSchema>;

export const VerificationActionDefaultsSchema = z.object({
  version: z.number(),
  defaults: z.array(VerificationActionSchema),
});
export type VerificationActionDefaults = z.infer<typeof VerificationActionDefaultsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Plugins (plugins/_index.json entries)
// ─────────────────────────────────────────────────────────────────────────────

export const RegistryPluginAuthorSchema = z.object({
  name: z.string(),
});
export type RegistryPluginAuthor = z.infer<typeof RegistryPluginAuthorSchema>;

export const RegistryPluginCanvasesSchema = z.object({
  'nav-sidebar': z.boolean().default(false),
  drawer: z.boolean().default(false),
  'menu-bar': z.boolean().default(false),
  feed: z.boolean().default(false),
  'workstream-widget': z.boolean().default(false),
}).default({ 'nav-sidebar': false, drawer: false, 'menu-bar': false, feed: false, 'workstream-widget': false });

export const RegistryPluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().optional(),
  source: z.enum(['inline', 'github', 'registry']),
  repo: z.string().optional(),
  path: z.string().optional(),           // subdirectory within repo containing the plugin
  icon: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  author: RegistryPluginAuthorSchema.optional(),
  registry: z.string().optional(),
  canvases: RegistryPluginCanvasesSchema,
});
export type RegistryPlugin = z.infer<typeof RegistryPluginSchema>;

export const RegistryPluginDefaultsSchema = z.object({
  version: z.number(),
  defaults: z.array(z.string()),
});
export type RegistryPluginDefaults = z.infer<typeof RegistryPluginDefaultsSchema>;

