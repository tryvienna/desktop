/**
 * RegistrySyncer — Git clone/pull operations for registry repos.
 *
 * Handles syncing registry Git repos to a local cache directory.
 * Each registry is cloned into `<cacheDir>/<registry.name>/`.
 *
 * @module main/registry/RegistrySyncer
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GitClient } from './GitClient';
import type { RegistryRecord } from '@vienna/app-db';

export interface RegistrySyncerDeps {
  git: GitClient;
  logger: { info: (msg: string, ctx?: Record<string, unknown>) => void; warn: (msg: string, ctx?: Record<string, unknown>) => void };
}

export class RegistrySyncer {
  private readonly git: GitClient;
  private readonly logger: RegistrySyncerDeps['logger'];

  constructor(deps: RegistrySyncerDeps) {
    this.git = deps.git;
    this.logger = deps.logger;
  }

  async syncOne(registry: RegistryRecord, cacheDir: string): Promise<void> {
    const repoDir = path.join(cacheDir, registry.name);
    await fs.promises.mkdir(cacheDir, { recursive: true });

    if (fs.existsSync(repoDir)) {
      this.logger.info('Pulling registry', { name: registry.name });
      await this.git.pull(repoDir);
    } else {
      this.logger.info('Cloning registry', { name: registry.name, url: registry.url });
      await this.git.clone(registry.url, repoDir, { depth: 1 });
    }
  }

  async syncAll(
    registries: RegistryRecord[],
    cacheDir: string,
  ): Promise<{ synced: number; errors: Array<{ name: string; error: string }> }> {
    let synced = 0;
    const errors: Array<{ name: string; error: string }> = [];

    for (const registry of registries) {
      try {
        await this.syncOne(registry, cacheDir);
        synced++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.warn('Failed to sync registry', { name: registry.name, error });
        errors.push({ name: registry.name, error });
      }
    }

    return { synced, errors };
  }

  async removeCache(name: string, cacheDir: string): Promise<void> {
    const repoDir = path.join(cacheDir, name);
    await fs.promises.rm(repoDir, { recursive: true, force: true });
  }

  async checkRemoteChanges(
    registries: RegistryRecord[],
    cacheDir: string,
  ): Promise<Array<{ name: string; behind: number }>> {
    const results: Array<{ name: string; behind: number }> = [];

    for (const registry of registries) {
      const repoDir = path.join(cacheDir, registry.name);
      if (!fs.existsSync(repoDir)) continue;

      try {
        const behind = await this.git.getCommitsBehind(repoDir);
        if (behind > 0) {
          results.push({ name: registry.name, behind });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.warn('Failed to check remote changes', { name: registry.name, error });
      }
    }

    return results;
  }
}
