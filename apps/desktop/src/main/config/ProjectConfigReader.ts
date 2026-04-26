/**
 * ProjectConfigReader — Reads .vienna/config.json from project directories.
 *
 * Scans a list of project directory paths for .vienna/config.json files,
 * parses them with Zod, and returns ProjectTier objects for the config resolver.
 *
 * Malformed files are logged and skipped — a broken config.json should
 * never block the user from working.
 *
 * @module main/config/ProjectConfigReader
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProjectConfigSchema } from '@vienna/app-db';
import type { ProjectConfig } from '@vienna/app-db';
import type { ProjectTier } from '@vienna/app-db';

export interface ProjectConfigReaderDeps {
  logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
  };
}

export class ProjectConfigReader {
  private readonly logger: ProjectConfigReaderDeps['logger'];

  constructor(deps: ProjectConfigReaderDeps) {
    this.logger = deps.logger;
  }

  /**
   * Read .vienna/config.json from a list of project directories.
   * Returns one ProjectTier per directory that has a valid config.
   * Directories without .vienna/config.json or with invalid configs are skipped.
   */
  readConfigs(projectDirs: string[]): ProjectTier[] {
    const results: ProjectTier[] = [];

    for (const dir of projectDirs) {
      const tier = this.readOne(dir);
      if (tier) {
        results.push(tier);
      }
    }

    return results;
  }

  /**
   * Read a single project's .vienna/config.json.
   * Returns null if the file doesn't exist or is malformed.
   */
  readOne(dir: string): ProjectTier | null {
    const configPath = path.join(dir, '.vienna', 'config.json');

    let rawContent: string;
    try {
      rawContent = fs.readFileSync(configPath, 'utf-8');
    } catch {
      // No config file — this is normal, not an error
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch (err) {
      this.logger.warn('Malformed JSON in .vienna/config.json', {
        directory: dir,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }

    const result = ProjectConfigSchema.safeParse(parsed);
    if (!result.success) {
      this.logger.warn('Invalid .vienna/config.json schema', {
        directory: dir,
        errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
      return null;
    }

    this.logger.info('Loaded project config', {
      directory: dir,
      name: result.data.name,
      plugins: result.data.plugins.length,
      skills: result.data.skills.length,
    });

    return { directory: dir, config: result.data };
  }
}
