/**
 * Skill types — Zod schemas for SKILL.md frontmatter and installed skill records.
 *
 * @module main/skills/types
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// SKILL.md frontmatter (Claude Code open standard)
// ─────────────────────────────────────────────────────────────────────────────

export const SkillFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Must be lowercase alphanumeric with hyphens'),
  description: z.string().min(1).max(1024),
  version: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  tags: z.array(z.string()).default([]),
  icon: z.string().optional(),
  category: z.string().optional(),
  'allowed-tools': z.string().optional(),
  'user-invocable': z.boolean().default(true),
  'disable-model-invocation': z.boolean().default(false),
  context: z.enum(['inline', 'fork']).optional(),
  agent: z.string().optional(),
  model: z.string().optional(),
  'argument-hint': z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Parsed skill (frontmatter + body from SKILL.md)
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedSkill {
  frontmatter: SkillFrontmatter;
  body: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Installed skill record (mirrors DB row)
// ─────────────────────────────────────────────────────────────────────────────

export interface InstalledSkill {
  id: string;
  name: string;
  description: string;
  version: string | null;
  registryVersion: string | null;
  source: 'inline' | 'github';
  sourceRef: string | null;
  registry: string | null;
  path: string;
  icon: string | null;
  category: string | null;
  tags: string[];
  author: string | null;
  enabled: boolean;
  pinned: boolean;
  installDate: string;
  lastUsed: string | null;
  useCount: number;
  createdAt: number;
  updatedAt: number;
}
