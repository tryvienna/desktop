/**
 * TagFileStore — JSON file-based tag definitions (VSCode-style settings).
 *
 * Tags are stored in JSON files with global defaults and per-project overrides:
 *   - Global: `<profileDir>/tags.json`
 *   - Per-project: `<profileDir>/projects/<projectId>/tags.json`
 *
 * Project tags with the same name fully replace global ones.
 * Follows the SettingsRepository pattern (atomic writes via temp+rename, Zod validation).
 *
 * @module app-db/tag-store
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { HexColorSchema, WorktreeModeSchema } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const TagDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  instructions: z.string().min(1).max(50_000),
  color: HexColorSchema.default('#3B82F6'),
  dependsOn: z.array(z.string()).default([]),
  spawnWorkstream: z.boolean().default(false),
  worktreeMode: WorktreeModeSchema.default('same'),
  maxDepth: z.number().int().min(1).max(10).default(3),
});

export type TagDefinition = z.infer<typeof TagDefinitionSchema>;

export const TagsFileSchema = z.object({
  tags: z.array(TagDefinitionSchema).default([]),
});

export type TagsFile = z.infer<typeof TagsFileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export class TagFileStore {
  constructor(private readonly profileDir: string) {}

  // ── Global tags ────────────────────────────────────────────────────────

  /** Read global tag definitions from `<profileDir>/tags.json`. */
  getGlobal(): TagDefinition[] {
    return this.readTagsFile(this.globalPath());
  }

  /** Write global tag definitions to `<profileDir>/tags.json`. */
  setGlobal(tags: TagDefinition[]): void {
    this.writeTagsFile(this.globalPath(), tags);
  }

  // ── Per-project tags ───────────────────────────────────────────────────

  /** Read project-specific tag definitions. */
  getForProject(projectId: string): TagDefinition[] {
    return this.readTagsFile(this.projectPath(projectId));
  }

  /** Write project-specific tag definitions. */
  setForProject(projectId: string, tags: TagDefinition[]): void {
    this.writeTagsFile(this.projectPath(projectId), tags);
  }

  // ── Merged (global + project overrides) ──────────────────────────────────

  /**
   * Get merged tags: global defaults + project overrides.
   * Project tags with the same name fully replace global ones.
   */
  getMerged(projectId: string): TagDefinition[] {
    const global = this.getGlobal();
    const project = this.getForProject(projectId);

    // Project tags override global by name
    const projectNames = new Set(project.map((l) => l.name));
    const merged = global.filter((l) => !projectNames.has(l.name));
    merged.push(...project);

    return merged;
  }

  // ── Dependency edges ─────────────────────────────────────────────────────

  /**
   * Convert merged tag dependsOn arrays into edge list for dag-utils.
   * Maps tag names to synthetic stable IDs (the name itself, since names
   * are unique within a merged set).
   */
  getDependencyEdges(
    projectId: string,
  ): { tagId: string; dependsOnTagId: string }[] {
    const tags = this.getMerged(projectId);
    const nameSet = new Set(tags.map((l) => l.name));
    const edges: { tagId: string; dependsOnTagId: string }[] = [];

    for (const tag of tags) {
      for (const dep of tag.dependsOn) {
        // Only include edges where both ends exist
        if (nameSet.has(dep)) {
          edges.push({ tagId: tag.name, dependsOnTagId: dep });
        }
      }
    }

    return edges;
  }

  // ── Single-tag helpers ─────────────────────────────────────────────────

  /** Find a tag by name in the merged set. */
  getByName(projectId: string, name: string): TagDefinition | null {
    const merged = this.getMerged(projectId);
    return merged.find((l) => l.name === name) ?? null;
  }

  // ── File paths ───────────────────────────────────────────────────────────

  private globalPath(): string {
    return join(this.profileDir, 'tags.json');
  }

  private projectPath(projectId: string): string {
    return join(this.profileDir, 'projects', projectId, 'tags.json');
  }

  // ── File I/O (atomic, Zod-validated) ─────────────────────────────────────

  private readTagsFile(filePath: string): TagDefinition[] {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content) as unknown;
      const validated = TagsFileSchema.parse(parsed);
      return validated.tags;
    } catch {
      return [];
    }
  }

  private writeTagsFile(filePath: string, tags: TagDefinition[]): void {
    const validated = TagsFileSchema.parse({ tags });
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const tmpPath = filePath + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(validated, null, 2) + '\n', 'utf-8');
    renameSync(tmpPath, filePath);
  }
}
