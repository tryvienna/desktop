/**
 * ContentProfileManager — Manages shareable content profiles.
 *
 * A content profile is a directory under ~/.vienna/profiles/<name>/ that follows
 * the registry layout (skills/, plugins/, quick-actions/, config.json). The active
 * profile replaces ~/.vienna/ as the GLOBAL priority-8 registry source.
 *
 * Profiles can be:
 * - **default**: The user's own profile, created on first launch
 * - **forked**: Cloned from a git repo, with .git intact for manual pulls
 *
 * Only the content catalog changes on switch — the user's installed content DB
 * and settings.json remain constant across all profiles.
 *
 * @module main/profile/ContentProfileManager
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProjectConfigSchema } from '@vienna/app-db';
import type { ProjectConfig } from '@vienna/app-db';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileMetadata {
  displayName?: string;
  description?: string;
  author?: { name: string; url?: string };
  icon?: string;
  tags: string[];
  sourceUrl?: string;
}

export interface ContentProfile {
  /** Profile directory name (e.g., "default", "solo-founder"). */
  name: string;
  /** Absolute path to the profile directory. */
  directory: string;
  /** Whether this is the built-in default profile. */
  isDefault: boolean;
  /** Whether this is the currently active profile. */
  isActive: boolean;
  /** Whether this profile was forked from a git repo (has .git/). */
  isFork: boolean;
  /** Parsed identity metadata from config.json, or null if absent. */
  metadata: ProfileMetadata | null;
}

export interface ContentProfileManagerDeps {
  gitClient: {
    clone(url: string, dest: string, opts?: { depth?: number }): Promise<void>;
  };
  logger: {
    info(msg: string, ctx?: Record<string, unknown>): void;
    warn(msg: string, ctx?: Record<string, unknown>): void;
    error(msg: string, ctx?: Record<string, unknown>): void;
  };
  /** Called after switching profiles — invalidate caches, re-sync symlinks. */
  onSwitch: (activeDirectory: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE = 'default';
const ACTIVE_PROFILE_FILE = 'active-profile';
const PROFILE_DIRS = ['skills', 'quick-actions', 'plugins'];
const SAFE_NAME = /^[a-z0-9][a-z0-9._-]*$/;

// ─────────────────────────────────────────────────────────────────────────────
// Manager
// ─────────────────────────────────────────────────────────────────────────────

export class ContentProfileManager {
  private readonly viennaDir: string;
  private readonly profilesDir: string;
  private readonly gitClient: ContentProfileManagerDeps['gitClient'];
  private readonly logger: ContentProfileManagerDeps['logger'];
  private readonly onSwitch: ContentProfileManagerDeps['onSwitch'];

  /** Cached active directory for the hot path in RegistryManager.getSources(). */
  private cachedActiveDir: string | null = null;

  constructor(viennaDir: string, deps: ContentProfileManagerDeps) {
    this.viennaDir = viennaDir;
    this.profilesDir = path.join(viennaDir, 'profiles');
    this.gitClient = deps.gitClient;
    this.logger = deps.logger;
    this.onSwitch = deps.onSwitch;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * List all content profiles on disk.
   */
  list(): ContentProfile[] {
    const activeName = this.readActiveName();
    try {
      const entries = fs.readdirSync(this.profilesDir, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => this.buildProfile(e.name, activeName));
    } catch {
      return [];
    }
  }

  /**
   * Get the currently active content profile.
   */
  getActive(): ContentProfile {
    const activeName = this.readActiveName();
    return this.buildProfile(activeName, activeName);
  }

  /**
   * Get the active profile's content directory path.
   * Synchronous and cached — this is the hot path called by RegistryManager.getSources().
   *
   * For forked profiles (git repos), content lives in `.vienna/` inside the repo.
   * For the default profile (created by migration), content is at the profile root.
   */
  getActiveDirectory(): string {
    if (this.cachedActiveDir) return this.cachedActiveDir;
    const name = this.readActiveName();
    this.cachedActiveDir = this.resolveContentDir(path.join(this.profilesDir, name));
    return this.cachedActiveDir;
  }

  /**
   * Resolve the actual content directory for a profile.
   * If the profile has a `.vienna/` subdirectory (forked git repo), use that.
   * Otherwise use the profile root directly (default profile from migration).
   */
  private resolveContentDir(profileDir: string): string {
    const viennaSubdir = path.join(profileDir, '.vienna');
    if (fs.existsSync(viennaSubdir)) return viennaSubdir;
    return profileDir;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Commands
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new empty profile.
   */
  async create(name: string): Promise<ContentProfile> {
    this.validateName(name);
    const dir = path.join(this.profilesDir, name);

    if (fs.existsSync(dir)) {
      throw new Error(`Profile '${name}' already exists`);
    }

    for (const sub of PROFILE_DIRS) {
      fs.mkdirSync(path.join(dir, sub), { recursive: true });
    }

    this.logger.info('Created content profile', { name });
    return this.buildProfile(name, this.readActiveName());
  }

  /**
   * Fork a profile by cloning a git repo.
   * Derives the profile name from the repo URL if not provided.
   */
  async fork(gitUrl: string, name?: string): Promise<ContentProfile> {
    const derivedName = name ?? this.deriveNameFromUrl(gitUrl);
    const finalName = this.findAvailableName(derivedName);
    this.validateName(finalName);

    const dir = path.join(this.profilesDir, finalName);

    this.logger.info('Forking content profile', { gitUrl, name: finalName });

    try {
      await this.gitClient.clone(gitUrl, dir, { depth: 1 });
    } catch (err) {
      // Clean up partial clone
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch { /* ignore cleanup errors */ }
      throw new Error(
        `Failed to clone profile from ${gitUrl}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Ensure standard subdirectories exist even if the repo doesn't have them
    for (const sub of PROFILE_DIRS) {
      fs.mkdirSync(path.join(dir, sub), { recursive: true });
    }

    // Write sourceUrl into config.json if not already present
    this.ensureSourceUrl(dir, gitUrl);

    this.logger.info('Forked content profile', { name: finalName, gitUrl });
    return this.buildProfile(finalName, this.readActiveName());
  }

  /**
   * Switch to a different content profile.
   */
  async switchTo(name: string): Promise<void> {
    this.validateName(name);
    const dir = path.join(this.profilesDir, name);
    if (!fs.existsSync(dir)) {
      throw new Error(`Profile '${name}' does not exist`);
    }

    fs.writeFileSync(path.join(this.viennaDir, ACTIVE_PROFILE_FILE), name, 'utf-8');
    const contentDir = this.resolveContentDir(dir);
    this.cachedActiveDir = contentDir;

    this.logger.info('Switched content profile', { name });
    this.onSwitch(contentDir);
  }

  /**
   * Delete a content profile.
   * Refuses to delete the default or active profile.
   */
  async delete(name: string): Promise<boolean> {
    this.validateName(name);
    if (name === DEFAULT_PROFILE) {
      throw new Error('Cannot delete the default profile');
    }

    const activeName = this.readActiveName();
    if (name === activeName) {
      throw new Error('Cannot delete the active profile. Switch to another profile first.');
    }

    const dir = path.join(this.profilesDir, name);
    if (!fs.existsSync(dir)) {
      return false;
    }

    fs.rmSync(dir, { recursive: true, force: true });
    this.logger.info('Deleted content profile', { name });
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────────────

  private readActiveName(): string {
    try {
      const name = fs.readFileSync(
        path.join(this.viennaDir, ACTIVE_PROFILE_FILE),
        'utf-8',
      ).trim();
      if (name && SAFE_NAME.test(name)) return name;
    } catch { /* fall through */ }
    return DEFAULT_PROFILE;
  }

  private buildProfile(name: string, activeName: string): ContentProfile {
    const directory = path.join(this.profilesDir, name);
    return {
      name,
      directory,
      isDefault: name === DEFAULT_PROFILE,
      isActive: name === activeName,
      isFork: fs.existsSync(path.join(directory, '.git')),
      metadata: this.readMetadata(directory),
    };
  }

  private readMetadata(dir: string): ProfileMetadata | null {
    const configPath = path.join(dir, 'config.json');
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const result = ProjectConfigSchema.safeParse(raw);
      if (!result.success) return null;

      const cfg = result.data;
      // Only return metadata if at least one identity field is present
      if (!cfg.name && !cfg.description && !cfg.author && !cfg.icon && !cfg.sourceUrl) {
        return null;
      }

      return {
        displayName: cfg.name,
        description: cfg.description,
        author: cfg.author,
        icon: cfg.icon,
        tags: cfg.tags ?? [],
        sourceUrl: cfg.sourceUrl,
      };
    } catch {
      return null;
    }
  }

  private ensureSourceUrl(dir: string, gitUrl: string): void {
    const configPath = path.join(dir, 'config.json');
    try {
      const raw = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        : { version: 1 };

      if (!raw.sourceUrl) {
        raw.sourceUrl = gitUrl;
        fs.writeFileSync(configPath, JSON.stringify(raw, null, 2) + '\n', 'utf-8');
      }
    } catch {
      // Non-critical — don't fail the fork
    }
  }

  private validateName(name: string): void {
    if (!name || !SAFE_NAME.test(name)) {
      throw new Error(
        `Invalid profile name '${name}'. Must start with a lowercase letter or digit, ` +
        `and contain only lowercase letters, digits, dots, hyphens, or underscores.`,
      );
    }
    if (name.length > 128) {
      throw new Error(`Profile name too long (${name.length} chars, max 128)`);
    }
  }

  /**
   * Derive a profile name from a git URL.
   * e.g., "https://github.com/user/solo-founder.git" → "solo-founder"
   */
  private deriveNameFromUrl(url: string): string {
    const lastSegment = url.split('/').pop() ?? 'profile';
    return lastSegment
      .replace(/\.git$/, '')
      .replace(/[^a-z0-9._-]/gi, '-')
      .toLowerCase();
  }

  /**
   * Find an available profile name, appending -2, -3, etc. on collision.
   */
  private findAvailableName(base: string): string {
    if (!fs.existsSync(path.join(this.profilesDir, base))) return base;

    for (let i = 2; i <= 99; i++) {
      const candidate = `${base}-${i}`;
      if (!fs.existsSync(path.join(this.profilesDir, candidate))) return candidate;
    }

    throw new Error(`Cannot find an available name for profile '${base}'`);
  }
}
