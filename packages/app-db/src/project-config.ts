/**
 * Project Configuration — Schema and types for .vienna/config.json files.
 *
 * Project config extends the registry concept with project-specific directives:
 * requirements, recommendations, and settings suggestions.
 *
 * @module app-db/project-config
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Content requirements
// ─────────────────────────────────────────────────────────────────────────────

/** How strongly a project wants a plugin/skill/quick-action. */
export const ContentRequirementSchema = z.enum(['required', 'recommended', 'forbidden']);
export type ContentRequirement = z.infer<typeof ContentRequirementSchema>;

/** A reference to a content item (plugin, skill, or quick action) with a requirement level. */
export const ContentRefSchema = z.object({
  /** The content item ID (must match a registry entry). */
  id: z.string(),
  /** Requirement level. Defaults to 'recommended' if omitted. */
  requirement: ContentRequirementSchema.default('recommended'),
  /** Human-readable reason shown in the UI (e.g. "Team uses GitHub integration"). */
  reason: z.string().optional(),
});
export type ContentRef = z.infer<typeof ContentRefSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Project-declared registries
// ─────────────────────────────────────────────────────────────────────────────

/** A git registry declared by the project. */
export const ProjectRegistryRefSchema = z.object({
  /** Short identifier (lowercase alphanumeric + hyphens). */
  name: z.string().regex(/^[a-z0-9-]+$/),
  /** Git URL (HTTPS). */
  url: z.string().url(),
});
export type ProjectRegistryRef = z.infer<typeof ProjectRegistryRefSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Settings recommendations
// ─────────────────────────────────────────────────────────────────────────────

/** A setting the project recommends (user always has final say). */
export const SettingRecommendationSchema = z.object({
  /** Dot-path to the setting (e.g. "ai.defaultModel", "appearance.theme"). */
  key: z.string(),
  /** The recommended value. */
  value: z.unknown(),
  /** Why this is recommended (e.g. "Team standard for code review"). */
  reason: z.string().optional(),
});
export type SettingRecommendation = z.infer<typeof SettingRecommendationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Profile identity metadata (used when .vienna/config.json is a shareable profile)
// ─────────────────────────────────────────────────────────────────────────────

/** Author of a shareable profile. */
export const ProfileAuthorSchema = z.object({
  name: z.string(),
  url: z.string().url().optional(),
});
export type ProfileAuthor = z.infer<typeof ProfileAuthorSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Project config (root schema for .vienna/config.json)
// ─────────────────────────────────────────────────────────────────────────────

export const ProjectConfigSchema = z.object({
  /** Schema version for forward compatibility. Must be 1. */
  version: z.literal(1),

  /** Human-readable display name. */
  name: z.string().optional(),

  // ── Identity metadata (for shareable profiles) ─────────────────────────

  /** Short description of what this profile provides. */
  description: z.string().optional(),

  /** Profile author. */
  author: ProfileAuthorSchema.optional(),

  /** Emoji icon for display in the UI. */
  icon: z.string().optional(),

  /** Categorization tags (e.g., ["frontend", "react", "typescript"]). */
  tags: z.array(z.string()).default([]),

  /** Git URL this profile was forked from (set automatically on fork). */
  sourceUrl: z.string().optional(),

  // ── Content directives ─────────────────────────────────────────────────

  /** Additional git registries this project needs. */
  registries: z.array(ProjectRegistryRefSchema).default([]),

  /** Plugin requirements/recommendations. */
  plugins: z.array(ContentRefSchema).default([]),

  /** Skill requirements/recommendations. */
  skills: z.array(ContentRefSchema).default([]),

  /** Quick action requirements/recommendations. */
  quickActions: z.array(ContentRefSchema).default([]),

  /** Settings the project recommends (user can dismiss). */
  settings: z.array(SettingRecommendationSchema).default([]),
});
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
