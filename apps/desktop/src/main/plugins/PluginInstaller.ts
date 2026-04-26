/**
 * PluginInstaller — Orchestrates plugin installation, updates, and lifecycle.
 *
 * Plugins are discovered from registries, installed to the profile's plugins/
 * directory, bundled with esbuild, and loaded into the plugin system at runtime.
 *
 * This service bridges the registry system with the existing plugin runtime
 * (PluginLoader + PluginBundler).
 *
 * @module main/plugins/PluginInstaller
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getEnrichedEnv } from '@vienna/shell-env';
import type { InstalledPluginRepository, InstalledPluginRecord, CreateInstalledPluginInput } from '@vienna/app-db';
import type { PluginDefinition } from '@tryvienna/sdk';
import type { RegistryManager } from '../registry/RegistryManager';
import type { RegistryPlugin } from '../registry/types';
import type { GitClient } from '../registry/GitClient';
import type { PluginBundler } from './PluginBundler';
import type { PluginLoader } from '../integrations/PluginLoader';
import { evaluatePluginBundle } from './evaluator';

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────────────────────────────────────
// Local shape types — mirrors GraphQL builder shapes to avoid cross-package import
// ─────────────────────────────────────────────────────────────────────────────

interface InstalledPluginShape {
  id: string;
  name: string;
  description: string;
  version: string | null;
  registryVersion: string | null;
  source: 'inline' | 'github' | 'registry';
  sourceRef: string | null;
  registry: string | null;
  path: string;
  icon: string | null;
  category: string | null;
  tags: string[];
  author: string | null;
  enabled: boolean;
  installDate: string;
}

interface PluginUpdateShape {
  id: string;
  installedVersion: string | null;
  registryVersion: string | null;
}

interface RegistryPluginShape {
  id: string;
  name: string;
  description: string;
  version?: string;
  source: 'inline' | 'github' | 'registry';
  repo?: string;
  path?: string;
  icon?: string;
  category?: string;
  tags: string[];
  author?: { name: string };
  registry?: string;
}

/** Validate that a plugin ID is safe for use in filesystem paths. */
const SAFE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
function assertSafeId(id: string, label: string): void {
  if (!SAFE_ID_RE.test(id)) {
    throw new Error(`${label} "${id}" contains unsafe characters`);
  }
}

/** Validate that a resolved path stays within the expected parent directory. */
function assertPathContainment(child: string, parent: string): void {
  const resolvedChild = path.resolve(child);
  const resolvedParent = path.resolve(parent);
  if (!resolvedChild.startsWith(resolvedParent + path.sep) && resolvedChild !== resolvedParent) {
    throw new Error(`Path "${child}" escapes parent "${parent}"`);
  }
}

/** Validate that a git repo URL uses https:// protocol. */
function assertSafeRepoUrl(url: string): void {
  if (!url.startsWith('https://')) {
    throw new Error(`Repo URL must use https:// protocol, got: "${url}"`);
  }
}

/** Map a DB record to the GraphQL shape interface. */
function recordToShape(record: InstalledPluginRecord): InstalledPluginShape {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    version: record.version,
    registryVersion: record.registryVersion,
    source: record.source,
    sourceRef: record.sourceRef,
    registry: record.registry,
    path: record.path,
    icon: record.icon,
    category: record.category,
    tags: record.tags,
    author: record.author,
    enabled: record.enabled,
    installDate: record.installDate,
  };
}

export interface PluginInstallerDeps {
  repository: InstalledPluginRepository;
  registryManager: RegistryManager;
  pluginsDir: string;
  gitClient: GitClient;
  bundler: PluginBundler;
  loader: PluginLoader;
  /** Callback to cache renderer bundles for the IPC layer. */
  onRendererBundle?: (pluginId: string, code: string) => void;
  /** Notify the renderer that a plugin was loaded/unloaded (triggers UI refresh). */
  onPluginChanged?: (pluginId: string, action: 'loaded' | 'reloaded' | 'unloaded') => void;
  /** Register a plugin source path so the dev server can customize it. */
  onPluginSourceRegistered?: (pluginId: string, sourcePath: string, packageRoot: string) => void;
  logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
    error: (msg: string, ctx?: Record<string, unknown>) => void;
  };
}

export class PluginInstaller {
  private readonly repository: InstalledPluginRepository;
  private readonly registryManager: RegistryManager;
  private readonly pluginsDir: string;
  private readonly gitClient: GitClient;
  private readonly bundler: PluginBundler;
  private readonly loader: PluginLoader;
  private readonly onRendererBundle?: (pluginId: string, code: string) => void;
  private readonly onPluginChanged?: (pluginId: string, action: 'loaded' | 'reloaded' | 'unloaded') => void;
  private readonly onPluginSourceRegistered?: (pluginId: string, sourcePath: string, packageRoot: string) => void;
  private readonly logger: PluginInstallerDeps['logger'];

  constructor(deps: PluginInstallerDeps) {
    this.repository = deps.repository;
    this.registryManager = deps.registryManager;
    this.pluginsDir = deps.pluginsDir;
    this.gitClient = deps.gitClient;
    this.bundler = deps.bundler;
    this.loader = deps.loader;
    this.onRendererBundle = deps.onRendererBundle;
    this.onPluginChanged = deps.onPluginChanged;
    this.onPluginSourceRegistered = deps.onPluginSourceRegistered;
    this.logger = deps.logger;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  async ensurePluginsDir(): Promise<void> {
    await fs.mkdir(this.pluginsDir, { recursive: true });
  }

  /**
   * Install default plugins from the highest-priority registry on first launch.
   */
  async ensureDefaults(): Promise<void> {
    try {
      const defaults = await this.registryManager.getPluginDefaults();
      if (defaults.length === 0) return;

      const registryPlugins = await this.registryManager.getPlugins();
      const installed = this.repository.listAll();
      const installedIds = new Set(installed.map((p) => p.id));

      for (const pluginId of defaults) {
        if (installedIds.has(pluginId)) continue;
        const registryPlugin = registryPlugins.find((p) => p.id === pluginId);
        if (!registryPlugin) continue;

        try {
          await this.install(registryPlugin);
          this.logger.info('Default plugin installed', { pluginId });
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          this.logger.warn('Failed to install default plugin', { pluginId, error });
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn('Failed to install default plugins', { error });
    }
  }

  /**
   * Reconcile installed plugins after a profile switch.
   * Uninstalls plugins that are no longer available in any registry source
   * (i.e. they came from the old profile), then installs the new profile's defaults.
   */
  async reconcileDefaults(): Promise<void> {
    try {
      const registryPlugins = await this.registryManager.getPlugins();
      const availableIds = new Set(registryPlugins.map((p) => p.id));
      const defaults = await this.registryManager.getPluginDefaults();
      const installed = this.repository.listAll();

      // Uninstall plugins that no longer exist in any registry source
      // (old profile's plugins disappear when the active profile changes)
      for (const plugin of installed) {
        if (!availableIds.has(plugin.id)) {
          try {
            await this.uninstall(plugin.id);
            this.logger.info('Removed orphaned plugin after profile switch', { pluginId: plugin.id });
          } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            this.logger.warn('Failed to remove orphaned plugin', { pluginId: plugin.id, error });
          }
        }
      }

      // Install new profile's defaults that aren't already installed
      const nowInstalled = new Set(this.repository.listAll().map((p) => p.id));
      for (const pluginId of defaults) {
        if (nowInstalled.has(pluginId)) continue;
        const registryPlugin = registryPlugins.find((p) => p.id === pluginId);
        if (!registryPlugin) continue;

        try {
          await this.install(registryPlugin);
          this.logger.info('Installed plugin for new profile', { pluginId });
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          this.logger.warn('Failed to install plugin for new profile', { pluginId, error });
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn('Failed to reconcile plugins after profile switch', { error });
    }
  }

  /**
   * Load all enabled installed plugins on startup.
   * Bundles and loads each plugin via the existing PluginLoader.
   */
  async loadInstalledPlugins(): Promise<void> {
    const plugins = this.repository.listEnabled();

    for (const plugin of plugins) {
      try {
        await this.bundleAndLoad(plugin.path, plugin.id);
        this.logger.info('Loaded installed plugin', { pluginId: plugin.id });

        // Register source so the dev server can customize this plugin
        const srcPath = path.join(plugin.path, 'src');
        this.onPluginSourceRegistered?.(plugin.id, srcPath, plugin.path);

        // Notify the renderer so it can load the renderer bundle.
        // Without this, plugins that finish loading after the renderer's
        // initial getLoadedPlugins() call would not appear until hard refresh.
        this.onPluginChanged?.(plugin.id, 'loaded');
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.error('Failed to load installed plugin', { pluginId: plugin.id, error });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD (implements PluginActions interface)
  // ─────────────────────────────────────────────────────────────────────────────

  list(): InstalledPluginShape[] {
    return this.repository.listAll().map(recordToShape);
  }

  listEnabled(): InstalledPluginShape[] {
    return this.repository.listEnabled().map(recordToShape);
  }

  getById(id: string): InstalledPluginShape | null {
    const record = this.repository.getById(id);
    return record ? recordToShape(record) : null;
  }

  async install(registryPlugin: RegistryPluginShape, opts?: { override?: boolean }): Promise<InstalledPluginShape> {
    const override = opts?.override ?? false;
    assertSafeId(registryPlugin.id, 'Plugin ID');

    // Early check — may be superseded by canonical ID check after bundling
    const earlyExisting = this.repository.getById(registryPlugin.id);
    if (earlyExisting && !override) {
      return recordToShape(earlyExisting);
    }
    if (earlyExisting && override) {
      await this.uninstall(registryPlugin.id);
    }

    await fs.mkdir(this.pluginsDir, { recursive: true });

    // Clone/copy source to a staging directory named after the input ID.
    // Remove any leftover directory from a prior failed install.
    const stagingDir = path.join(this.pluginsDir, registryPlugin.id);
    assertPathContainment(stagingDir, this.pluginsDir);
    await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});

    if (registryPlugin.source === 'inline' || registryPlugin.source === 'registry') {
      await this.installInline(registryPlugin as RegistryPlugin, stagingDir);
    } else if (registryPlugin.source === 'github') {
      await this.installFromGithub(registryPlugin as RegistryPlugin, stagingDir);
    } else {
      throw new Error(`Unknown plugin source: ${registryPlugin.source}`);
    }

    // Install npm dependencies if package.json exists
    await this.npmInstall(stagingDir);

    // Bundle and evaluate to discover the canonical plugin ID
    const definition = await this.bundleAndLoad(stagingDir, registryPlugin.id);
    const canonicalId = definition.id;

    // Check again by canonical ID (may differ from input ID, e.g. slug vs definition)
    if (canonicalId !== registryPlugin.id) {
      const canonicalExisting = this.repository.getById(canonicalId);
      if (canonicalExisting && !override) {
        // Already installed under the canonical ID — clean up staging dir
        await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
        return recordToShape(canonicalExisting);
      }
      if (canonicalExisting && override) {
        await this.uninstall(canonicalId);
      }

      // Rename directory from input ID to canonical ID
      const canonicalDir = path.join(this.pluginsDir, canonicalId);
      assertSafeId(canonicalId, 'Canonical plugin ID');
      assertPathContainment(canonicalDir, this.pluginsDir);
      // Remove any leftover canonical dir before renaming
      await fs.rm(canonicalDir, { recursive: true, force: true }).catch(() => {});
      await fs.rename(stagingDir, canonicalDir);
    }

    const pluginDir = path.join(this.pluginsDir, canonicalId);

    // Read metadata from package.json or PLUGIN.json
    const metadata = await this.readPluginMetadata(pluginDir, registryPlugin);

    const input: CreateInstalledPluginInput = {
      id: canonicalId,
      name: metadata.name,
      description: metadata.description,
      version: metadata.version ?? null,
      registryVersion: registryPlugin.version ?? null,
      source: registryPlugin.source === 'registry' ? 'inline' : registryPlugin.source,
      sourceRef: registryPlugin.source === 'github'
        ? (registryPlugin.repo ?? null)
        : (registryPlugin.registry ?? null),
      registry: registryPlugin.registry ?? null,
      path: pluginDir,
      icon: registryPlugin.icon ?? null,
      category: registryPlugin.category ?? null,
      tags: registryPlugin.tags,
      author: registryPlugin.author?.name ?? null,
    };

    const record = this.repository.create(input);
    this.logger.info('Plugin installed', {
      pluginId: canonicalId,
      inputId: registryPlugin.id,
      source: registryPlugin.source,
    });

    // Register source so the dev server can customize this plugin
    const srcPath = path.join(pluginDir, 'src');
    this.onPluginSourceRegistered?.(canonicalId, srcPath, pluginDir);

    this.onPluginChanged?.(canonicalId, 'loaded');
    return recordToShape(record);
  }

  async uninstall(pluginId: string): Promise<boolean> {
    const plugin = this.repository.getById(pluginId);
    if (!plugin) return false;

    // Unload from plugin system
    try {
      this.loader.unloadPlugin(pluginId);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn('Failed to unload plugin during uninstall', { pluginId, error });
    }

    // Remove plugin directory
    try {
      await fs.rm(plugin.path, { recursive: true, force: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn('Failed to remove plugin directory', { pluginId, error });
    }

    const deleted = this.repository.delete(pluginId);
    if (deleted) {
      this.logger.info('Plugin uninstalled', { pluginId });
      this.onPluginChanged?.(pluginId, 'unloaded');
    }
    return deleted;
  }

  async update(pluginId: string): Promise<InstalledPluginShape> {
    assertSafeId(pluginId, 'Plugin ID');
    const existing = this.repository.getById(pluginId);
    if (!existing) {
      throw new Error(`Plugin "${pluginId}" is not installed`);
    }

    // Validate the stored path is under the plugins directory
    assertPathContainment(existing.path, this.pluginsDir);

    // Find the plugin in the registry
    const registryPlugins = await this.registryManager.getPlugins();
    const registryPlugin = registryPlugins.find((p) => p.id === pluginId);
    if (!registryPlugin) {
      throw new Error(`Plugin "${pluginId}" not found in any registry`);
    }

    // Atomic swap: install to temp dir, then replace
    const parentDir = path.dirname(existing.path);
    const tmpDir = path.join(parentDir, `${pluginId}.update-tmp`);

    try {
      // Install fresh copy to temp directory
      if (registryPlugin.source === 'inline') {
        await this.installInline(registryPlugin, tmpDir);
      } else if (registryPlugin.source === 'github') {
        await this.installFromGithub(registryPlugin, tmpDir);
      }

      await this.npmInstall(tmpDir);

      // Unload old plugin
      this.loader.unloadPlugin(pluginId);

      // Swap directories
      const backupDir = path.join(parentDir, `${pluginId}.backup`);
      await fs.rename(existing.path, backupDir);
      await fs.rename(tmpDir, existing.path);
      await fs.rm(backupDir, { recursive: true, force: true });

      // Re-bundle and load
      await this.bundleAndLoad(existing.path, pluginId);

      // Update both version and registryVersion in DB so hasUpdate resolves to false
      const metadata = await this.readPluginMetadata(existing.path, registryPlugin);
      const newVersion = metadata.version ?? registryPlugin.version ?? '0.0.0';
      const newRegistryVersion = registryPlugin.version ?? metadata.version ?? '0.0.0';
      this.repository.updateRegistryVersion(pluginId, newVersion, newRegistryVersion);

      const updated = this.repository.getById(pluginId);
      this.logger.info('Plugin updated', { pluginId });
      this.onPluginChanged?.(pluginId, 'reloaded');
      return recordToShape(updated!);
    } catch (err) {
      // Cleanup temp dir on failure
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      throw err;
    }
  }

  async checkUpdates(): Promise<PluginUpdateShape[]> {
    const installed = this.repository.listAll();
    const registryPlugins = await this.registryManager.getPlugins();
    const registryMap = new Map(registryPlugins.map((p) => [p.id, p]));
    const updates: PluginUpdateShape[] = [];

    for (const plugin of installed) {
      const registryPlugin = registryMap.get(plugin.id);
      if (!registryPlugin) continue;

      if (registryPlugin.version && registryPlugin.version !== plugin.version) {
        updates.push({
          id: plugin.id,
          installedVersion: plugin.version,
          registryVersion: registryPlugin.version ?? null,
        });
      }
    }

    return updates;
  }

  async toggleEnabled(id: string, enabled: boolean): Promise<InstalledPluginShape | null> {
    const record = this.repository.setEnabled(id, enabled);
    if (!record) return null;

    if (enabled) {
      try {
        await this.bundleAndLoad(record.path, record.id);
        this.logger.info('Plugin enabled and loaded', { pluginId: id });
        this.onPluginChanged?.(id, 'loaded');
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.error('Failed to load plugin after enabling', { pluginId: id, error });
      }
    } else {
      try {
        this.loader.unloadPlugin(id);
        this.logger.info('Plugin disabled and unloaded', { pluginId: id });
        this.onPluginChanged?.(id, 'unloaded');
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.warn('Failed to unload plugin after disabling', { pluginId: id, error });
      }
    }

    return recordToShape(record);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Copy an inline plugin from the registry cache to the install directory.
   */
  private async installInline(registryPlugin: RegistryPlugin, destDir: string): Promise<void> {
    // Find the registry name from the registry field (owner/repo format)
    const registries = this.registryManager.listEnabled();
    let sourcePath: string | null = null;

    for (const registry of registries) {
      sourcePath = await this.registryManager.getPluginSourcePath(registry.name, registryPlugin.id);
      if (sourcePath) break;
    }

    if (!sourcePath) {
      throw new Error(`Plugin "${registryPlugin.id}" not found in any registry cache`);
    }

    await fs.cp(sourcePath, destDir, { recursive: true });
  }

  /**
   * Clone a plugin from a GitHub repo.
   */
  private async installFromGithub(registryPlugin: RegistryPlugin, destDir: string): Promise<void> {
    if (!registryPlugin.repo) {
      throw new Error(`Plugin "${registryPlugin.id}" is github-sourced but has no repo URL`);
    }
    assertSafeRepoUrl(registryPlugin.repo);

    if (registryPlugin.path) {
      // Clone to temp dir, then copy the subdirectory
      const tmpDir = destDir + '.clone-tmp';
      try {
        await this.gitClient.clone(registryPlugin.repo, tmpDir, { depth: 1 });
        const subDir = path.join(tmpDir, registryPlugin.path);
        assertPathContainment(subDir, tmpDir);
        await fs.cp(subDir, destDir, { recursive: true });
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    } else {
      await this.gitClient.clone(registryPlugin.repo, destDir, { depth: 1 });
    }

    // Remove .git to save space — we don't need history for installed plugins
    await fs.rm(path.join(destDir, '.git'), { recursive: true, force: true }).catch(() => {});
  }

  /**
   * Run npm install in a plugin directory if it has a package.json.
   */
  private async npmInstall(pluginDir: string): Promise<void> {
    const pkgJsonPath = path.join(pluginDir, 'package.json');
    try {
      await fs.access(pkgJsonPath);
    } catch {
      return; // No package.json — skip
    }

    this.logger.info('Running npm install for plugin', { pluginDir });
    // In packaged macOS apps launched from Dock, process.env.PATH is minimal
    // (/usr/bin:/bin:/usr/sbin:/sbin). Use the enriched shell env so npm is
    // found even when installed via nvm/fnm/volta/homebrew.
    let env: Record<string, string> | undefined;
    try {
      env = getEnrichedEnv();
    } catch {
      // Fall back to process env if shell resolution fails
    }
    try {
      await execFileAsync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], {
        cwd: pluginDir,
        timeout: 60_000,
        env,
      });
    } catch (err) {
      const stderr = (err as { stderr?: string }).stderr ?? '';
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('npm install failed for plugin', {
        pluginDir,
        error: message,
        stderr: stderr.slice(0, 500),
        pathUsed: env?.PATH?.slice(0, 200) ?? process.env.PATH?.slice(0, 200),
      });
      throw new Error(`npm install failed for plugin at ${pluginDir}: ${message}`);
    }
  }

  /**
   * Bundle a plugin with esbuild and load it into the plugin system.
   * Returns the evaluated PluginDefinition (whose `.id` is the canonical ID).
   */
  private async bundleAndLoad(pluginDir: string, pluginId: string): Promise<PluginDefinition> {
    const bundleResult = await this.bundler.bundle(pluginDir, 'main');
    const virtualPath = path.join(pluginDir, 'dist', 'index.cjs');

    const definition = await evaluatePluginBundle(bundleResult.code, {
      filePath: virtualPath,
    }) as PluginDefinition;

    // Unload any existing plugin with the same ID (e.g. builtin or prior install).
    // Try both the caller-supplied ID and the definition's actual ID since they
    // can differ (e.g. slug uses hyphens but plugin ID uses underscores).
    for (const id of new Set([pluginId, definition.id])) {
      try { this.loader.unloadPlugin(id); } catch { /* not loaded — fine */ }
    }

    await this.loader.loadPlugin(definition);

    // Bundle renderer target for canvas components (React UI)
    try {
      const rendererBundle = await this.bundler.bundle(pluginDir, 'renderer');
      this.onRendererBundle?.(definition.id, rendererBundle.code);
    } catch {
      // Renderer bundle is optional — plugins without canvases won't have one
    }

    return definition;
  }

  /**
   * Read plugin metadata from package.json or PLUGIN.json.
   */
  private async readPluginMetadata(
    pluginDir: string,
    registryPlugin: RegistryPluginShape,
  ): Promise<{ name: string; description: string; version: string | null }> {
    // Try PLUGIN.json first
    try {
      const pluginJsonPath = path.join(pluginDir, 'PLUGIN.json');
      const data = JSON.parse(await fs.readFile(pluginJsonPath, 'utf-8'));
      return {
        name: data.name ?? registryPlugin.name,
        description: data.description ?? registryPlugin.description,
        version: data.version ?? null,
      };
    } catch {
      // Fall through to package.json
    }

    // Try package.json
    try {
      const pkgJsonPath = path.join(pluginDir, 'package.json');
      const data = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));
      return {
        name: data.name ?? registryPlugin.name,
        description: data.description ?? registryPlugin.description,
        version: data.version ?? null,
      };
    } catch {
      // Fall back to registry metadata
    }

    return {
      name: registryPlugin.name,
      description: registryPlugin.description,
      version: registryPlugin.version ?? null,
    };
  }
}
