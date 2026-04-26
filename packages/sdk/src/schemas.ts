/**
 * Zod Schemas — Source of truth for all sdk types.
 *
 * Every exported TypeScript type in this package derives from these
 * schemas via z.infer<>. This follows the Vienna convention established
 * in @vienna/app-db and @vienna/agent-core.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

/** Entity type identifier: lowercase alphanumeric + underscore/hyphen, starts with letter, max 64 chars */
export const EntityTypeSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z][a-z0-9_-]*$/,
    'Must be lowercase alphanumeric with underscores or hyphens, starting with a letter'
  );
export type EntityType = z.infer<typeof EntityTypeSchema>;

/** URI path segment: non-empty, no control characters */
export const PathSegmentSchema = z
  .string()
  .min(1)
  .max(256)
  .refine(
    (s) => !/[\0\n\r]/.test(s),
    'Path segment cannot contain control characters'
  );

// ─────────────────────────────────────────────────────────────────────────────
// URI
// ─────────────────────────────────────────────────────────────────────────────

/** URI path configuration */
export const EntityURIPathSchema = z.object({
  segments: z.array(z.string().min(1)).min(1).readonly(),
});
export type EntityURIPath = z.infer<typeof EntityURIPathSchema>;

/** Error codes for URI operations */
export const EntityURIErrorCodeSchema = z.enum([
  'INVALID_FORMAT',
  'MISSING_ENTITY_TYPE',
  'MISSING_PATH',
  'INVALID_ENTITY_TYPE',
  'INVALID_PATH_SEGMENT',
  'INVALID_LABEL_ENCODING',
  'SEGMENT_COUNT_MISMATCH',
]);
export type EntityURIErrorCode = z.infer<typeof EntityURIErrorCodeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Base Entity
// ─────────────────────────────────────────────────────────────────────────────

export const BaseEntitySchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  uri: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type BaseEntity = z.infer<typeof BaseEntitySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Source
// ─────────────────────────────────────────────────────────────────────────────

export const EntitySourceSchema = z.enum(['builtin', 'integration']);
export type EntitySource = z.infer<typeof EntitySourceSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Display Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const EntityDisplayColorsSchema = z.object({
  bg: z.string(),
  text: z.string(),
  border: z.string(),
});
export type EntityDisplayColors = z.infer<typeof EntityDisplayColorsSchema>;

export const FilterDescriptionSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
});
export type FilterDescription = z.infer<typeof FilterDescriptionSchema>;

export const OutputFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  metadataPath: z.string(),
  format: z.string().optional(),
});
export type OutputField = z.infer<typeof OutputFieldSchema>;

export const EntityDisplayMetadataSchema = z.object({
  emoji: z.string(),
  colors: EntityDisplayColorsSchema,
  description: z.string().optional(),
  filterDescriptions: z.array(FilterDescriptionSchema).optional(),
  outputFields: z.array(OutputFieldSchema).optional(),
});
export type EntityDisplayMetadata = z.infer<typeof EntityDisplayMetadataSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Palette Filter Spec
// ─────────────────────────────────────────────────────────────────────────────

export const PaletteFilterValueSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  aliases: z.array(z.string()).optional(),
  colorToken: z.string().optional(),
  description: z.string().optional(),
});
export type PaletteFilterValueSpec = z.infer<typeof PaletteFilterValueSpecSchema>;

export const PaletteFilterSpecSchema = z.object({
  key: z.string(),
  label: z.string(),
  aliases: z.array(z.string()).optional(),
  values: z.array(PaletteFilterValueSpecSchema),
});
export type PaletteFilterSpec = z.infer<typeof PaletteFilterSpecSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Cache Config
// ─────────────────────────────────────────────────────────────────────────────

export const EntityCacheConfigSchema = z.object({
  ttl: z.number().positive(),
  maxSize: z.number().positive().optional(),
});
export type EntityCacheConfig = z.infer<typeof EntityCacheConfigSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Entity Type Summary (for discovery query)
// ─────────────────────────────────────────────────────────────────────────────

export const EntityTypeSummarySchema = z.object({
  type: z.string(),
  displayName: z.string(),
  icon: z.string(),
  source: EntitySourceSchema,
  uriExample: z.string(),
  display: EntityDisplayMetadataSchema.optional(),
});
export type EntityTypeSummary = z.infer<typeof EntityTypeSummarySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Icon (serializable representation for IPC)
// ─────────────────────────────────────────────────────────────────────────────

export const PluginIconSchema = z.union([
  z.object({ svg: z.string() }),
  z.object({ png: z.string() }),
  z.object({ path: z.string() }),
]);

// ─────────────────────────────────────────────────────────────────────────────
// Integration Summary (for discovery)
// ─────────────────────────────────────────────────────────────────────────────

export const IntegrationSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: PluginIconSchema,
  description: z.string().optional(),
  hasOAuth: z.boolean(),
  status: z.enum(['ready', 'needs_setup']),
  credentials: z.array(z.string()).optional(),
});
export type IntegrationSummary = z.infer<typeof IntegrationSummarySchema>;
