/**
 * RegistryReader — Reads and merges content from registry sources.
 *
 * A "registry source" is any directory that follows the registry layout
 * (plugins/, skills/, quick-actions/ subdirectories with _index.json files).
 * Sources can be git-backed registries (cloned to a cache dir) or local
 * directories (~/.vienna/ or <project>/.vienna/).
 *
 * Merges by priority (lower priority number wins on ID conflict),
 * and validates all data with Zod before returning.
 *
 * @module main/registry/RegistryReader
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  QuickActionSchema,
  QuickActionDefaultsSchema,
  RegistryMetadataSchema,
  RegistrySkillSchema,
  RegistrySkillDefaultsSchema,
  VerificationActionSchema,
  VerificationActionDefaultsSchema,
  RegistryPluginSchema,
  RegistryPluginDefaultsSchema,
} from './types';
import type { QuickAction, RegistryMetadata, RegistrySkill, RegistryPlugin, VerificationAction } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Registry Source — unified interface for all content sources
// ─────────────────────────────────────────────────────────────────────────────

/** A content source that follows the registry directory layout. */
export interface RegistrySource {
  /** Display name (e.g. "official", "global", "project:my-app"). */
  name: string;
  /** Merge priority — lower number wins on ID conflict. */
  priority: number;
  /** Absolute path to the registry root directory. */
  path: string;
  /** Source type — for logging and diagnostics. */
  type: 'git' | 'local';
}

export interface RegistryReaderDeps {
  logger?: { warn: (msg: string, ctx?: Record<string, unknown>) => void };
}

/** Sort sources by priority ascending, then name alphabetically. */
function sortSources(sources: RegistrySource[]): RegistrySource[] {
  return [...sources].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

/** Sort sources by priority descending (most-local first) for defaults. */
function sortSourcesDescending(sources: RegistrySource[]): RegistrySource[] {
  return [...sources].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
}

export class RegistryReader {
  private readonly logger: RegistryReaderDeps['logger'];

  constructor(deps: RegistryReaderDeps = {}) {
    this.logger = deps.logger;
  }

  /**
   * Read quick actions from all sources, merged by priority.
   * Lower priority number wins when multiple sources provide the same ID.
   */
  async readQuickActions(sources: RegistrySource[]): Promise<QuickAction[]> {
    const sorted = sortSources(sources);
    const result: QuickAction[] = [];
    const seenIds = new Set<string>();

    for (const source of sorted) {
      const indexPath = path.join(source.path, 'quick-actions', '_index.json');
      const entries = await this.readJsonArray(indexPath);
      if (!entries) continue;

      for (const raw of entries) {
        const parsed = QuickActionSchema.safeParse(raw);
        if (!parsed.success) {
          this.logger?.warn('Skipping malformed quick action entry', {
            source: source.name,
            error: parsed.error.message,
          });
          continue;
        }
        if (seenIds.has(parsed.data.id)) continue;
        seenIds.add(parsed.data.id);
        result.push({ ...parsed.data, registry: source.name });
      }
    }

    return result;
  }

  /**
   * Read quick action defaults from the most-local source that has them.
   * Most-local (highest priority number) wins so profiles override the registry.
   */
  async readQuickActionDefaults(sources: RegistrySource[]): Promise<string[]> {
    const sorted = sortSourcesDescending(sources);

    for (const source of sorted) {
      const defaultsPath = path.join(source.path, 'quick-actions', '_defaults.json');
      try {
        const data = await fs.readFile(defaultsPath, 'utf-8');
        const parsed = QuickActionDefaultsSchema.safeParse(JSON.parse(data));
        if (parsed.success) {
          return parsed.data.defaults;
        }
      } catch {
        // No defaults file — try next source
      }
    }

    return [];
  }

  /**
   * Read verification actions from all sources, merged by priority.
   * Lower priority number wins when multiple sources provide the same ID.
   */
  async readVerificationActions(sources: RegistrySource[]): Promise<VerificationAction[]> {
    const sorted = sortSources(sources);
    const result: VerificationAction[] = [];
    const seenIds = new Set<string>();

    for (const source of sorted) {
      const indexPath = path.join(source.path, 'verification-actions', '_index.json');
      const entries = await this.readJsonArray(indexPath);
      if (!entries) continue;

      for (const raw of entries) {
        const parsed = VerificationActionSchema.safeParse(raw);
        if (!parsed.success) {
          this.logger?.warn('Skipping malformed verification action entry', {
            source: source.name,
            error: parsed.error.message,
          });
          continue;
        }
        if (seenIds.has(parsed.data.id)) continue;
        seenIds.add(parsed.data.id);
        result.push(parsed.data);
      }
    }

    return result;
  }

  /**
   * Read verification action defaults from the most-local source that has them.
   */
  async readVerificationActionDefaults(sources: RegistrySource[]): Promise<VerificationAction[]> {
    const sorted = sortSourcesDescending(sources);

    for (const source of sorted) {
      const defaultsPath = path.join(source.path, 'verification-actions', '_defaults.json');
      try {
        const data = await fs.readFile(defaultsPath, 'utf-8');
        const parsed = VerificationActionDefaultsSchema.safeParse(JSON.parse(data));
        if (parsed.success) {
          return parsed.data.defaults;
        }
      } catch {
        // No defaults file — try next source
      }
    }

    return [];
  }

  /**
   * Read skills from all sources, merged by priority.
   * Lower priority number wins when multiple sources provide the same ID.
   */
  async readSkills(sources: RegistrySource[]): Promise<RegistrySkill[]> {
    const sorted = sortSources(sources);
    const result: RegistrySkill[] = [];
    const seenIds = new Set<string>();

    for (const source of sorted) {
      const indexPath = path.join(source.path, 'skills', '_index.json');
      const entries = await this.readJsonArray(indexPath);
      if (!entries) continue;

      for (const raw of entries) {
        const parsed = RegistrySkillSchema.safeParse(raw);
        if (!parsed.success) {
          this.logger?.warn('Skipping malformed skill entry', {
            source: source.name,
            error: parsed.error.message,
          });
          continue;
        }
        if (seenIds.has(parsed.data.id)) continue;
        seenIds.add(parsed.data.id);
        result.push({ ...parsed.data, registry: source.name });
      }
    }

    return result;
  }

  /**
   * Read skill defaults from the most-local source that has them.
   */
  async readSkillDefaults(sources: RegistrySource[]): Promise<string[]> {
    const sorted = sortSourcesDescending(sources);

    for (const source of sorted) {
      const defaultsPath = path.join(source.path, 'skills', '_defaults.json');
      try {
        const data = await fs.readFile(defaultsPath, 'utf-8');
        const parsed = RegistrySkillDefaultsSchema.safeParse(JSON.parse(data));
        if (parsed.success) {
          return parsed.data.defaults;
        }
      } catch {
        // No defaults file — try next source
      }
    }

    return [];
  }

  /**
   * Read a skill's SKILL.md content from a source directory.
   * Searches all sources for the given skill, respecting priority order.
   */
  async readSkillContent(sources: RegistrySource[], skillId: string): Promise<string | null> {
    const sorted = sortSources(sources);

    for (const source of sorted) {
      const skillPath = path.join(source.path, 'skills', skillId, 'SKILL.md');
      try {
        return await fs.readFile(skillPath, 'utf-8');
      } catch {
        // Not in this source — try next
      }
    }

    return null;
  }

  /**
   * Read a skill's SKILL.md content from a specific named source.
   */
  async readSkillContentFromSource(sourcePath: string, skillId: string): Promise<string | null> {
    const skillFilePath = path.join(sourcePath, 'skills', skillId, 'SKILL.md');
    try {
      return await fs.readFile(skillFilePath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Read plugins from all sources, merged by priority.
   * Lower priority number wins when multiple sources provide the same ID.
   */
  async readPlugins(sources: RegistrySource[]): Promise<RegistryPlugin[]> {
    const sorted = sortSources(sources);
    const result: RegistryPlugin[] = [];
    const seenIds = new Set<string>();

    for (const source of sorted) {
      const indexPath = path.join(source.path, 'plugins', '_index.json');
      const entries = await this.readJsonArray(indexPath);
      if (!entries) continue;

      for (const raw of entries) {
        const parsed = RegistryPluginSchema.safeParse(raw);
        if (!parsed.success) {
          this.logger?.warn('Skipping malformed plugin entry', {
            source: source.name,
            error: parsed.error.message,
          });
          continue;
        }
        if (seenIds.has(parsed.data.id)) continue;
        seenIds.add(parsed.data.id);
        result.push({ ...parsed.data, registry: source.name });
      }
    }

    return result;
  }

  /**
   * Read plugin defaults from the most-local source that has them.
   */
  async readPluginDefaults(sources: RegistrySource[]): Promise<string[]> {
    const sorted = sortSourcesDescending(sources);

    for (const source of sorted) {
      const defaultsPath = path.join(source.path, 'plugins', '_defaults.json');
      try {
        const data = await fs.readFile(defaultsPath, 'utf-8');
        const parsed = RegistryPluginDefaultsSchema.safeParse(JSON.parse(data));
        if (parsed.success) {
          return parsed.data.defaults;
        }
      } catch {
        // No defaults file — try next source
      }
    }

    return [];
  }

  /**
   * Get the source path for an inline plugin.
   * Searches all sources for the plugin directory, respecting priority order.
   */
  async readPluginSourcePath(sources: RegistrySource[], pluginId: string): Promise<string | null> {
    const sorted = sortSources(sources);

    for (const source of sorted) {
      const pluginDir = path.join(source.path, 'plugins', pluginId);
      try {
        const stat = await fs.stat(pluginDir);
        if (stat.isDirectory()) return pluginDir;
      } catch {
        // Not in this source — try next
      }
    }

    return null;
  }

  /**
   * Read registry metadata from registry.json in a specific source.
   */
  async readMetadata(sourcePath: string): Promise<RegistryMetadata | null> {
    const metaPath = path.join(sourcePath, 'registry.json');
    try {
      const data = await fs.readFile(metaPath, 'utf-8');
      const parsed = RegistryMetadataSchema.safeParse(JSON.parse(data));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private async readJsonArray(filePath: string): Promise<unknown[] | null> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}
