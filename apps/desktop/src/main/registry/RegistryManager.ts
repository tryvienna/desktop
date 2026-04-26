/**
 * RegistryManager — Facade for the registry system.
 *
 * Composes RegistryRepository (persistence), RegistrySyncer (git), and
 * RegistryReader (content reading) into a single service injected into
 * the GraphQL context.
 *
 * Supports three kinds of registry sources:
 * - Git registries (cloned to cache dir, managed via DB)
 * - Global local registry (~/.vienna/)
 * - Project local registries (<projectDir>/.vienna/)
 *
 * @module main/registry/RegistryManager
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { RegistryRepository, RegistryRecord, CreateRegistryInput, UpdateRegistryInput } from '@vienna/app-db';
import type { RegistrySyncer } from './RegistrySyncer';
import type { RegistryReader } from './RegistryReader';
import type { RegistrySource } from './RegistryReader';
import type { QuickAction, RegistryPlugin, RegistrySkill, VerificationAction } from './types';

const OFFICIAL_REGISTRY = {
  name: 'official',
  url: 'https://github.com/tryvienna/registry.git',
  priority: 0,
} as const;

/** Priority tiers for registry sources. */
const PRIORITY = {
  /** Official git registry (tryvienna/registry). */
  OFFICIAL: 0,
  /** Project .vienna/ directories. */
  PROJECT: 5,
  /** Global ~/.vienna/ directory. */
  GLOBAL: 8,
  /** User-added git registries (default). */
  USER: 10,
} as const;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

export interface RegistryManagerDeps {
  repository: RegistryRepository;
  syncer: RegistrySyncer;
  reader: RegistryReader;
  cacheDir: string;
  logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    error: (msg: string, ctx?: Record<string, unknown>) => void;
  };
  /** Content profile manager — provides the active profile directory for the GLOBAL tier. */
  contentProfileManager?: { getActiveDirectory(): string };
}

export class RegistryManager {
  private readonly repository: RegistryRepository;
  private readonly syncer: RegistrySyncer;
  private readonly reader: RegistryReader;
  private readonly cacheDir: string;
  private readonly logger: RegistryManagerDeps['logger'];
  private readonly contentProfileManager: RegistryManagerDeps['contentProfileManager'];

  private quickActionCache: CacheEntry<QuickAction[]> | null = null;
  private quickActionDefaultsCache: CacheEntry<string[]> | null = null;
  private verificationActionCache: CacheEntry<VerificationAction[]> | null = null;
  private verificationActionDefaultsCache: CacheEntry<VerificationAction[]> | null = null;
  private skillsCache: CacheEntry<RegistrySkill[]> | null = null;
  private skillDefaultsCache: CacheEntry<string[]> | null = null;
  private pluginsCache: CacheEntry<RegistryPlugin[]> | null = null;
  private pluginDefaultsCache: CacheEntry<string[]> | null = null;
  private seeded = false;

  /** Active project directories (set when workstream focuses or directories change). */
  private activeProjectDirs: string[] = [];

  constructor(deps: RegistryManagerDeps) {
    this.repository = deps.repository;
    this.syncer = deps.syncer;
    this.reader = deps.reader;
    this.cacheDir = deps.cacheDir;
    this.logger = deps.logger;
    this.contentProfileManager = deps.contentProfileManager;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Project directory awareness
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set the active project directories. Called when a workstream is focused
   * or project directories change. Invalidates all caches so that content
   * from .vienna/ directories is picked up.
   */
  setActiveProjectDirectories(dirs: string[]): void {
    this.activeProjectDirs = dirs;
    this.invalidateCache();
  }

  /** Get the currently active project directories. */
  getActiveProjectDirectories(): string[] {
    return this.activeProjectDirs;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Registry CRUD (git-backed registries only)
  // ─────────────────────────────────────────────────────────────────────────────

  async add(input: CreateRegistryInput): Promise<RegistryRecord> {
    // Check for duplicate URL
    const existing = this.repository.listAll();
    if (existing.some((r) => r.url === input.url)) {
      throw new Error(`A registry with URL "${input.url}" already exists`);
    }

    const record = this.repository.create(input);

    // Clone the registry in the background — don't block the response
    this.syncer.syncOne(record, this.cacheDir).catch((err) => {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn('Failed to clone registry after adding', { name: record.name, error });
    });

    this.invalidateCache();
    return record;
  }

  remove(id: string): boolean {
    const record = this.repository.getById(id);
    if (!record) return false;

    if (record.name === OFFICIAL_REGISTRY.name) {
      throw new Error('Cannot remove the official registry');
    }

    const deleted = this.repository.delete(id);
    if (deleted) {
      this.syncer.removeCache(record.name, this.cacheDir).catch((err) => {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.warn('Failed to remove registry cache', { name: record.name, error });
      });
      this.invalidateCache();
    }
    return deleted;
  }

  list(): RegistryRecord[] {
    this.ensureSeeded();
    return this.repository.listAll();
  }

  listEnabled(): RegistryRecord[] {
    this.ensureSeeded();
    return this.repository.listEnabled();
  }

  update(id: string, input: UpdateRegistryInput): RegistryRecord | null {
    const result = this.repository.update(id, input);
    if (result) {
      this.invalidateCache();
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Sync (git-backed registries only)
  // ─────────────────────────────────────────────────────────────────────────────

  async sync(): Promise<{ synced: number }> {
    this.ensureSeeded();
    const registries = this.repository.listEnabled();
    const result = await this.syncer.syncAll(registries, this.cacheDir);
    this.invalidateCache();
    this.logger.info('Registry sync complete', { synced: result.synced, errors: result.errors.length });
    return { synced: result.synced };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Content (with caching) — reads from ALL sources (git + local)
  // ─────────────────────────────────────────────────────────────────────────────

  async getQuickActions(): Promise<QuickAction[]> {
    const now = Date.now();

    if (this.quickActionCache && now - this.quickActionCache.fetchedAt < CACHE_TTL) {
      return this.quickActionCache.data;
    }

    const sources = this.getSources();
    const actions = await this.reader.readQuickActions(sources);
    this.quickActionCache = { data: actions, fetchedAt: now };

    return actions;
  }

  async getQuickActionDefaults(): Promise<string[]> {
    const now = Date.now();

    if (this.quickActionDefaultsCache && now - this.quickActionDefaultsCache.fetchedAt < CACHE_TTL) {
      return this.quickActionDefaultsCache.data;
    }

    const sources = this.getSources();
    const defaults = await this.reader.readQuickActionDefaults(sources);
    this.quickActionDefaultsCache = { data: defaults, fetchedAt: now };

    return defaults;
  }

  async getVerificationActions(): Promise<VerificationAction[]> {
    const now = Date.now();

    if (this.verificationActionCache && now - this.verificationActionCache.fetchedAt < CACHE_TTL) {
      return this.verificationActionCache.data;
    }

    const sources = this.getSources();
    const actions = await this.reader.readVerificationActions(sources);
    this.verificationActionCache = { data: actions, fetchedAt: now };

    return actions;
  }

  async getVerificationActionDefaults(): Promise<VerificationAction[]> {
    const now = Date.now();

    if (
      this.verificationActionDefaultsCache &&
      now - this.verificationActionDefaultsCache.fetchedAt < CACHE_TTL
    ) {
      return this.verificationActionDefaultsCache.data;
    }

    const sources = this.getSources();
    const defaults = await this.reader.readVerificationActionDefaults(sources);
    this.verificationActionDefaultsCache = { data: defaults, fetchedAt: now };

    return defaults;
  }

  async getSkills(): Promise<RegistrySkill[]> {
    const now = Date.now();

    if (this.skillsCache && now - this.skillsCache.fetchedAt < CACHE_TTL) {
      return this.skillsCache.data;
    }

    const sources = this.getSources();
    const skills = await this.reader.readSkills(sources);
    this.skillsCache = { data: skills, fetchedAt: now };

    return skills;
  }

  async getSkillDefaults(): Promise<string[]> {
    const now = Date.now();

    if (this.skillDefaultsCache && now - this.skillDefaultsCache.fetchedAt < CACHE_TTL) {
      return this.skillDefaultsCache.data;
    }

    const sources = this.getSources();
    const defaults = await this.reader.readSkillDefaults(sources);
    this.skillDefaultsCache = { data: defaults, fetchedAt: now };

    return defaults;
  }

  async getSkillContent(registryName: string, skillId: string): Promise<string | null> {
    // Look up the source path for this registry name
    const sources = this.getSources();
    const source = sources.find((s) => s.name === registryName);
    if (source) {
      return this.reader.readSkillContentFromSource(source.path, skillId);
    }
    // Fallback: search all sources
    return this.reader.readSkillContent(sources, skillId);
  }

  async getPlugins(): Promise<RegistryPlugin[]> {
    const now = Date.now();

    if (this.pluginsCache && now - this.pluginsCache.fetchedAt < CACHE_TTL) {
      return this.pluginsCache.data;
    }

    const sources = this.getSources();
    const plugins = await this.reader.readPlugins(sources);
    this.pluginsCache = { data: plugins, fetchedAt: now };

    return plugins;
  }

  async getPluginDefaults(): Promise<string[]> {
    const now = Date.now();

    if (this.pluginDefaultsCache && now - this.pluginDefaultsCache.fetchedAt < CACHE_TTL) {
      return this.pluginDefaultsCache.data;
    }

    const sources = this.getSources();
    const defaults = await this.reader.readPluginDefaults(sources);
    this.pluginDefaultsCache = { data: defaults, fetchedAt: now };

    return defaults;
  }

  async getPluginSourcePath(registryName: string, pluginId: string): Promise<string | null> {
    // Look up the source path for this registry name
    const sources = this.getSources();
    const source = sources.find((s) => s.name === registryName);
    if (source) {
      const pluginDir = path.join(source.path, 'plugins', pluginId);
      try {
        const stat = fs.statSync(pluginDir);
        if (stat.isDirectory()) return pluginDir;
      } catch {
        // Not found in named source
      }
    }
    // Fallback: search all sources
    return this.reader.readPluginSourcePath(sources, pluginId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  dispose(): void {
    this.invalidateCache();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────────

  private ensureSeeded(): void {
    if (this.seeded) return;
    this.seeded = true;

    const existing = this.repository.listAll();
    if (existing.length === 0) {
      this.logger.info('Seeding default official registry');
      this.repository.create({
        name: OFFICIAL_REGISTRY.name,
        url: OFFICIAL_REGISTRY.url,
        priority: OFFICIAL_REGISTRY.priority,
      });
    } else {
      const official = this.repository.getByName(OFFICIAL_REGISTRY.name);
      if (official && official.url !== OFFICIAL_REGISTRY.url) {
        this.logger.info({ old: official.url, new: OFFICIAL_REGISTRY.url }, 'Updating official registry URL');
        this.repository.updateUrl(official.id, OFFICIAL_REGISTRY.url);
      }
    }
  }

  /**
   * Build the unified list of registry sources from all tiers:
   * 1. Git registries from DB (official + user-added)
   * 2. Project .vienna/ directories
   * 3. Global ~/.vienna/ directory
   */
  private getSources(): RegistrySource[] {
    this.ensureSeeded();
    const sources: RegistrySource[] = [];

    // Git registries from DB
    const registries = this.repository.listEnabled();
    for (const reg of registries) {
      const regPath = path.join(this.cacheDir, reg.name);
      sources.push({
        name: reg.name,
        priority: reg.priority,
        path: regPath,
        type: 'git',
      });
    }

    // Project .vienna/ directories
    for (const dir of this.activeProjectDirs) {
      const viennaDir = path.join(dir, '.vienna');
      if (dirExists(viennaDir)) {
        sources.push({
          name: `project:${path.basename(dir)}`,
          priority: PRIORITY.PROJECT,
          path: viennaDir,
          type: 'local',
        });
      }
    }

    // Active content profile (or fallback to flat ~/.vienna/)
    const globalVienna = this.contentProfileManager?.getActiveDirectory()
      ?? path.join(os.homedir(), '.vienna');
    if (dirExists(globalVienna)) {
      sources.push({
        name: 'global',
        priority: PRIORITY.GLOBAL,
        path: globalVienna,
        type: 'local',
      });
    }

    return sources.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
  }

  /** Clear all cached content so the next read picks up changes (e.g. after profile switch). */
  invalidateCache(): void {
    this.quickActionCache = null;
    this.quickActionDefaultsCache = null;
    this.verificationActionCache = null;
    this.verificationActionDefaultsCache = null;
    this.skillsCache = null;
    this.skillDefaultsCache = null;
    this.pluginsCache = null;
    this.pluginDefaultsCache = null;
  }
}

/** Check if a directory exists (sync, for hot path). */
function dirExists(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
