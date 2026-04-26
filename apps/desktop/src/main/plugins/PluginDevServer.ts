/**
 * PluginDevServer — Unified plugin development server.
 *
 * Replaces DynamicPluginLoader + CustomizationManager + CustomizationWatcher
 * from v1. Handles:
 * - Loading/reloading customized plugins from directories
 * - Watching for file changes (hot-reload)
 * - Customization lifecycle (copy, install deps, reset)
 * - Serving renderer bundles for IPC
 */

import { existsSync, readFileSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { watch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getEnrichedEnv } from '@vienna/shell-env';
import type { PluginDefinition, PluginLogger } from '@tryvienna/sdk';
import type { PluginBundler } from './PluginBundler';
import { evaluatePluginBundle } from './evaluator';
import { PLATFORM_MODULE_IDS } from '../../lib/plugin-runtime/platform-externals';

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LoadResult {
  success: boolean;
  definition?: PluginDefinition;
  error?: string;
  /** True when the failure is caused by missing node_modules (deps not installed). */
  missingDependencies?: boolean;
  /** Detected package manager for the plugin directory. */
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  /** The plugin directory path (useful when pluginId is not yet known). */
  pluginDir?: string;
}

export type CustomizationStep = 'copying' | 'installing' | 'done' | 'error';

export type PluginChangedCallback = (
  pluginId: string,
  action: 'loaded' | 'reloaded' | 'unloaded',
  definition?: PluginDefinition,
) => void | Promise<void>;

export type PluginErrorCallback = (
  pluginId: string,
  error: string,
  phase: string,
) => void;

export type CustomizationProgressCallback = (
  pluginId: string,
  step: CustomizationStep,
  message: string,
) => void;

/** Minimal settings interface for plugin source tracking. */
export interface PluginSourceSettings {
  getSource(pluginId: string): { type: 'builtin' | 'customized' | 'local'; path?: string };
  setSource(pluginId: string, source: { type: 'builtin' | 'customized' | 'local'; path?: string }): void;
  /** Get all plugins with a given source type. */
  getBySourceType?(type: 'builtin' | 'customized' | 'local'): Array<{ pluginId: string; path?: string }>;
}

interface PluginSourceRegistration {
  sourcePath: string;
  packageRoot: string;
}

interface LoadedPlugin {
  pluginId: string;
  definition: PluginDefinition;
  customizationPath: string;
  loadedAt: number;
}

export interface PluginDevServerDeps {
  bundler: PluginBundler;
  logger: PluginLogger;
  customizationsDir: string;
  settings?: PluginSourceSettings;
  onPluginChanged?: PluginChangedCallback;
  onPluginError?: PluginErrorCallback;
  onProgress?: CustomizationProgressCallback;
  debounceMs?: number;
  /** Current git branch name — used to resolve local plugin paths through worktrees. */
  branch?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// File watcher helpers
// ─────────────────────────────────────────────────────────────────────────────

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.tsbuildinfo']);
const WATCHED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css']);

function shouldIgnore(relativePath: string): boolean {
  const parts = relativePath.split(path.sep);
  for (const part of parts) {
    if (IGNORED_DIRS.has(part) || part.startsWith('.')) return true;
  }
  const ext = path.extname(relativePath);
  if (!WATCHED_EXTENSIONS.has(ext)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// PluginDevServer
// ─────────────────────────────────────────────────────────────────────────────

export class PluginDevServer {
  private readonly bundler: PluginBundler;
  private readonly logger: PluginLogger;
  private readonly customizationsDir: string;
  private readonly settings?: PluginSourceSettings;
  private readonly onPluginChanged?: PluginChangedCallback;
  private readonly onPluginError?: PluginErrorCallback;
  private readonly onProgress?: CustomizationProgressCallback;
  private readonly debounceMs: number;

  /** Loaded customized plugins. */
  private readonly loaded = new Map<string, LoadedPlugin>();
  /** All customization paths (including failed loads, for reload). */
  private readonly customizationPaths = new Map<string, string>();
  /** Registered builtin plugin sources (for customize/reset). */
  private readonly pluginSources = new Map<string, PluginSourceRegistration>();

  /** Locally loaded plugin paths (external directories, not customizations). */
  private readonly localPluginPaths = new Map<string, string>();

  /** Per-plugin fs watchers. */
  private readonly watchers = new Map<string, FSWatcher>();
  /** Per-plugin debounce timers. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-plugin watcher error counts (for transient error recovery). */
  private readonly watcherErrors = new Map<string, number>();

  private readonly branch?: string;

  constructor(deps: PluginDevServerDeps) {
    this.bundler = deps.bundler;
    this.logger = deps.logger;
    this.customizationsDir = deps.customizationsDir;
    this.settings = deps.settings;
    this.onPluginChanged = deps.onPluginChanged;
    this.onPluginError = deps.onPluginError;
    this.onProgress = deps.onProgress;
    this.debounceMs = deps.debounceMs ?? 300;
    this.branch = deps.branch;
  }

  // ── Local Plugin Persistence ────────────────────────────────────────────

  /** Path to the JSON file that persists locally loaded plugin paths across restarts. */
  private get localPluginsManifestPath(): string {
    return path.join(this.customizationsDir, '.local-plugins.json');
  }

  /** Persist the current set of local plugin paths to disk. */
  private async persistLocalPlugins(): Promise<void> {
    try {
      await mkdir(this.customizationsDir, { recursive: true });
      const entries = Object.fromEntries(this.localPluginPaths);
      await writeFile(this.localPluginsManifestPath, JSON.stringify(entries, null, 2) + '\n', 'utf-8');
    } catch (err) {
      this.logger.warn('Failed to persist local plugins manifest', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Read persisted local plugin paths from disk (for auto-load on startup). */
  async getPersistedLocalPlugins(): Promise<Record<string, string>> {
    try {
      if (!existsSync(this.localPluginsManifestPath)) return {};
      const raw = await readFile(this.localPluginsManifestPath, 'utf-8');
      const plugins = JSON.parse(raw) as Record<string, string>;

      // When running on a branch with worktrees, resolve plugin paths to the
      // corresponding worktree directory so local plugins track the right branch.
      if (this.branch) {
        for (const [id, pluginDir] of Object.entries(plugins)) {
          const resolved = this.resolveWorktreePath(pluginDir);
          if (resolved !== pluginDir) {
            this.logger.info('Resolved local plugin path to worktree', {
              pluginId: id,
              original: pluginDir,
              resolved,
            });
            plugins[id] = resolved;
          }
        }
      }

      return plugins;
    } catch {
      return {};
    }
  }

  /**
   * Resolve a path through the worktree for the current branch.
   *
   * Given `/foo/repo/plugins/linear` and branch `my-feature`, checks if
   * `/foo/repo/.worktrees/my-feature/plugins/linear` exists and returns it.
   * Walks up the directory tree to find the git root (the directory containing
   * `.worktrees/<branch>/`).
   */
  private resolveWorktreePath(originalPath: string): string {
    if (!this.branch) return originalPath;

    // If the path is already inside a .worktrees/<branch>/ directory, normalise
    // it to the repo root first so the relative path doesn't carry the old
    // worktree prefix (which would produce a doubly-nested, non-existent path).
    const worktreeSegment = `${path.sep}.worktrees${path.sep}`;
    let canonicalPath = originalPath;
    const wtIdx = originalPath.indexOf(worktreeSegment);
    if (wtIdx !== -1) {
      const repoRoot = originalPath.slice(0, wtIdx);
      // Strip ".worktrees/<old-branch>/" to get the repo-relative subpath
      const afterWorktrees = originalPath.slice(wtIdx + worktreeSegment.length);
      const slashIdx = afterWorktrees.indexOf(path.sep);
      if (slashIdx !== -1) {
        const subpath = afterWorktrees.slice(slashIdx + 1);
        canonicalPath = path.join(repoRoot, subpath);
      }
    }

    let dir = canonicalPath;
    // Walk up until we find a directory that has `.worktrees/<branch>`
    while (dir !== path.dirname(dir)) {
      const worktreeRoot = path.join(dir, '.worktrees', this.branch);
      if (existsSync(worktreeRoot)) {
        // Compute the relative path from this ancestor to the original
        const relative = path.relative(dir, canonicalPath);
        const worktreePath = path.join(worktreeRoot, relative);
        if (existsSync(worktreePath)) {
          return worktreePath;
        }
        // Worktree root exists but the specific subpath doesn't — stop looking
        return originalPath;
      }
      dir = path.dirname(dir);
    }
    return originalPath;
  }

  /**
   * Given a worktree plugin path, find the main repo's node_modules.
   *
   * If `dir` is inside a `.worktrees/<branch>/` subtree, resolve the equivalent
   * path in the main repo and return its `node_modules` (if it exists).
   * This lets esbuild find dependencies that were installed in the main repo
   * but are missing from the worktree.
   */
  private getMainRepoNodePaths(dir: string): string[] {
    if (!this.branch) return [];
    const worktreeSegment = `/.worktrees/${this.branch}/`;
    const idx = dir.indexOf(worktreeSegment);
    if (idx === -1) return [];
    // Reconstruct the main repo equivalent path
    const repoRoot = dir.substring(0, idx);
    const relativePath = dir.substring(idx + worktreeSegment.length);
    const mainRepoDir = path.join(repoRoot, relativePath);
    const mainNodeModules = path.join(mainRepoDir, 'node_modules');
    if (existsSync(mainNodeModules)) {
      return [mainNodeModules];
    }
    return [];
  }

  // ── Plugin Source Registration ──────────────────────────────────────────

  /**
   * Register a plugin's source paths for customization support.
   * Called at startup for builtin plugins and after install for registry plugins.
   */
  registerPluginSource(pluginId: string, sourcePath: string, packageRoot: string): void {
    this.pluginSources.set(pluginId, { sourcePath, packageRoot });
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  /**
   * Load a customized plugin from a directory.
   * Bundles the source, evaluates it, and tracks it.
   */
  async loadFromDir(pluginId: string, dir: string): Promise<LoadResult> {
    this.customizationPaths.set(pluginId, dir);

    try {
      const extraNodePaths = this.getMainRepoNodePaths(dir);
      const { code } = await this.bundler.bundle(dir, 'main', { extraNodePaths });

      const definition = await evaluatePluginBundle(code, {
        filePath: path.join(dir, 'src', 'index.ts'),
      }) as PluginDefinition;

      this.loaded.set(pluginId, {
        pluginId,
        definition,
        customizationPath: dir,
        loadedAt: Date.now(),
      });

      this.logger.info('Loaded customized plugin', {
        pluginId,
        name: definition.name,
      });

      return { success: true, definition };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to load customized plugin', {
        pluginId,
        dir,
        error: message,
      });
      return { success: false, error: message };
    }
  }

  /**
   * Reload a previously loaded (or attempted) plugin.
   */
  async reload(pluginId: string): Promise<LoadResult> {
    const dir = this.customizationPaths.get(pluginId);
    if (!dir) {
      return { success: false, error: `No customization path tracked for '${pluginId}'` };
    }
    return this.loadFromDir(pluginId, dir);
  }

  /**
   * Unload a customized plugin.
   */
  unload(pluginId: string): void {
    this.loaded.delete(pluginId);
    this.customizationPaths.delete(pluginId);
    this.unwatch(pluginId);
  }

  // ── Renderer Bundle ─────────────────────────────────────────────────────

  /**
   * Get the renderer bundle for a customized plugin (for IPC to renderer).
   */
  async getRendererBundle(pluginId: string): Promise<string | null> {
    const dir = this.customizationPaths.get(pluginId);
    if (!dir) return null;

    try {
      const extraNodePaths = this.getMainRepoNodePaths(dir);
      const { code } = await this.bundler.bundle(dir, 'renderer', { extraNodePaths });
      return code;
    } catch (err) {
      this.logger.error('Failed to bundle renderer code', {
        pluginId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  // ── Customization Lifecycle ─────────────────────────────────────────────

  /**
   * Create a customized copy of a builtin plugin.
   *
   * 1. Copies source files to `<customizationsDir>/<pluginId>/`
   * 2. Writes clean package.json (strips workspace:* deps)
   * 3. Writes standalone tsconfig.json
   * 4. Runs `npm install --omit=dev`
   * 5. Updates settings to 'customized'
   */
  async customize(pluginId: string): Promise<LoadResult> {
    const registration = this.pluginSources.get(pluginId);
    if (!registration) {
      return { success: false, error: `Plugin '${pluginId}' has no registered source — is it installed?` };
    }

    const destDir = path.join(this.customizationsDir, pluginId);

    if (existsSync(destDir)) {
      return { success: false, error: `Customization already exists at ${destDir}` };
    }

    try {
      // 1. Copy source files
      this.onProgress?.(pluginId, 'copying', 'Copying plugin source files...');
      await mkdir(destDir, { recursive: true });
      await cp(registration.sourcePath, path.join(destDir, 'src'), { recursive: true });

      // 2. Copy and clean package.json
      const pkgJsonSrc = path.join(registration.packageRoot, 'package.json');
      if (existsSync(pkgJsonSrc)) {
        await cp(pkgJsonSrc, path.join(destDir, 'package.json'));
        await this.stripWorkspaceDeps(destDir);
      }

      // 3. Write standalone tsconfig
      await this.writeStandaloneTsconfig(registration.packageRoot, destDir);

      // 4. Install deps
      this.onProgress?.(pluginId, 'installing', 'Installing node modules...');
      await this.installDeps(destDir);

      // 5. Update settings
      this.settings?.setSource(pluginId, { type: 'customized', path: destDir });

      // 6. Load the customized plugin
      const result = await this.loadFromDir(pluginId, destDir);
      if (result.success) {
        this.onProgress?.(pluginId, 'done', 'Customization complete');
        await this.onPluginChanged?.(pluginId, 'loaded', result.definition);
      }
      return result;
    } catch (err) {
      // Clean up on failure
      try { await rm(destDir, { recursive: true, force: true }); } catch { /* ignore */ }
      const message = err instanceof Error ? err.message : String(err);
      this.onProgress?.(pluginId, 'error', message);
      this.logger.error('Failed to customize plugin', { pluginId, error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Reset a plugin to its builtin source.
   * Deletes the customization directory and updates settings.
   */
  async resetToBuiltin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    const destDir = path.join(this.customizationsDir, pluginId);

    try {
      this.unload(pluginId);

      if (existsSync(destDir)) {
        await rm(destDir, { recursive: true, force: true });
      }

      this.settings?.setSource(pluginId, { type: 'builtin' });
      await this.onPluginChanged?.(pluginId, 'unloaded');

      this.logger.info('Reset plugin to builtin', { pluginId });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to reset plugin', { pluginId, error: message });
      return { success: false, error: message };
    }
  }

  // ── Dependency Detection ─────────────────────────────────────────────────

  /**
   * Detect the package manager for a plugin directory by checking for lockfiles.
   * Falls back to 'npm' if no lockfile is found.
   */
  detectPackageManager(dir: string): 'npm' | 'pnpm' | 'yarn' | 'bun' {
    if (existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
    if (existsSync(path.join(dir, 'bun.lockb')) || existsSync(path.join(dir, 'bun.lock'))) return 'bun';
    if (existsSync(path.join(dir, 'package-lock.json'))) return 'npm';
    // No lockfile — check parent directories (monorepo)
    let current = path.dirname(dir);
    const root = path.parse(dir).root;
    while (current !== root) {
      if (existsSync(path.join(current, 'pnpm-lock.yaml'))) return 'pnpm';
      if (existsSync(path.join(current, 'yarn.lock'))) return 'yarn';
      if (existsSync(path.join(current, 'bun.lockb')) || existsSync(path.join(current, 'bun.lock'))) return 'bun';
      if (existsSync(path.join(current, 'package-lock.json'))) return 'npm';
      current = path.dirname(current);
    }
    return 'npm';
  }

  /**
   * Check if a plugin directory has npm dependencies that require installation.
   *
   * Returns true when the plugin's package.json lists non-platform dependencies
   * but node_modules does not exist (neither locally nor in a parent monorepo root).
   */
  hasMissingDependencies(dir: string): boolean {
    const pkgJsonPath = path.join(dir, 'package.json');
    if (!existsSync(pkgJsonPath)) return false;

    let pkgJson: Record<string, unknown>;
    try {
      pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    } catch {
      return false;
    }

    // Collect all declared dependencies
    const deps = {
      ...(pkgJson['dependencies'] as Record<string, string> | undefined),
      ...(pkgJson['devDependencies'] as Record<string, string> | undefined),
    };

    // Filter out platform-provided modules and workspace: deps
    const platformSet = new Set<string>(PLATFORM_MODULE_IDS);
    const needsInstall = Object.entries(deps).some(([name, version]) => {
      if (platformSet.has(name)) return false;
      // Scoped platform packages (e.g. @tryvienna/sdk/react → @tryvienna/sdk)
      if (name.startsWith('@tryvienna/') || name.startsWith('@vienna/')) return false;
      if (typeof version === 'string' && version.startsWith('workspace:')) return false;
      if (typeof version === 'string' && version.startsWith('file:')) return false;
      return true;
    });

    if (!needsInstall) return false;

    // Check for node_modules in the plugin dir
    if (existsSync(path.join(dir, 'node_modules'))) return false;

    // Check parent directories up to the nearest monorepo root (a dir with package.json).
    // We stop at the first parent that has a package.json to avoid false negatives from
    // unrelated node_modules in ancestor directories.
    let current = path.dirname(dir);
    const root = path.parse(dir).root;
    while (current !== root) {
      if (existsSync(path.join(current, 'node_modules'))) return false;
      // Stop walking at the monorepo root (nearest parent with its own package.json)
      if (existsSync(path.join(current, 'package.json'))) break;
      current = path.dirname(current);
    }

    return true;
  }

  /**
   * Install dependencies for a plugin directory using the detected package manager.
   */
  async installDependencies(dir: string, packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun'): Promise<{ success: boolean; error?: string }> {
    const pm = packageManager ?? this.detectPackageManager(dir);
    const command = pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : pm === 'bun' ? 'bun' : 'npm';

    this.logger.info('Installing plugin dependencies', { dir, packageManager: pm });

    // In packaged macOS apps launched from Dock, process.env.PATH is minimal.
    // Use the enriched shell env so npm/pnpm/yarn/bun are found even when
    // installed via nvm/fnm/volta/homebrew.
    let env: Record<string, string> | undefined;
    try {
      env = { ...getEnrichedEnv(), NODE_ENV: 'development' };
    } catch {
      // Fall back to process env if shell resolution fails
      env = { ...process.env as Record<string, string>, NODE_ENV: 'development' };
    }

    try {
      await execFileAsync(command, ['install'], {
        cwd: dir,
        timeout: 120_000,
        env,
      });
      this.logger.info('Dependencies installed successfully', { dir });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to install dependencies', {
        dir,
        error: message,
        pathUsed: env?.PATH?.slice(0, 200),
      });
      return { success: false, error: message };
    }
  }

  // ── Local Plugin Loading ────────────────────────────────────────────────

  /**
   * Load a plugin from an external directory on the user's filesystem.
   * Installs dependencies, bundles, evaluates, and starts watching.
   */
  async loadLocalPlugin(dir: string): Promise<LoadResult & { pluginId?: string }> {
    if (!existsSync(dir)) {
      return { success: false, error: `Directory does not exist: ${dir}` };
    }

    const entryFile = path.join(dir, 'src', 'index.ts');
    if (!existsSync(entryFile)) {
      return { success: false, error: `No src/index.ts found in ${dir}. Is this a Vienna plugin?` };
    }

    // Auto-install missing dependencies before bundling.
    if (this.hasMissingDependencies(dir)) {
      const packageManager = this.detectPackageManager(dir);
      this.logger.warn('Local plugin has missing dependencies', { dir, packageManager });
      this.onProgress?.('__loading__', 'installing', 'Installing dependencies…');
      const installResult = await this.installDependencies(dir, packageManager);
      if (!installResult.success) {
        const error = installResult.error ?? `Failed to install dependencies in ${dir}`;
        this.onProgress?.('__loading__', 'error', error);
        return {
          success: false,
          error,
          missingDependencies: true,
          packageManager,
          pluginDir: dir,
        };
      }
    }

    try {
      // Local plugins are the user's own dev directories — they manage deps themselves.
      // We never run npm install here because --omit=dev would prune devDependencies
      // that the plugin may intentionally use to keep packages bundled inline
      // (devDeps are not externalized by the renderer bundler).

      // 1. Bundle + evaluate to get the plugin definition
      const result = await this.loadFromDir('__pending__', dir);
      if (!result.success || !result.definition) {
        this.onProgress?.('__loading__', 'error', result.error ?? 'Failed to load plugin');
        return { success: false, error: result.error };
      }

      const pluginId = result.definition.id;

      // Re-track under the real plugin ID (loadFromDir used '__pending__')
      this.loaded.delete('__pending__');
      this.customizationPaths.delete('__pending__');

      // Check for ID conflicts
      const existingLocal = this.localPluginPaths.get(pluginId);
      if (existingLocal && existingLocal !== dir) {
        return { success: false, error: `Plugin '${pluginId}' is already loaded from ${existingLocal}` };
      }

      // 3. Track as loaded
      this.customizationPaths.set(pluginId, dir);
      this.loaded.set(pluginId, {
        pluginId,
        definition: result.definition,
        customizationPath: dir,
        loadedAt: Date.now(),
      });
      this.localPluginPaths.set(pluginId, dir);

      // 4. Persist to disk for auto-load on restart
      await this.persistLocalPlugins();

      // 5. Start watching
      this.watch(pluginId, dir);

      this.onProgress?.(pluginId, 'done', 'Plugin loaded successfully');
      await this.onPluginChanged?.(pluginId, 'loaded', result.definition);

      this.logger.info('Loaded local plugin', { pluginId, dir });
      return { success: true, definition: result.definition, pluginId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.onProgress?.('__loading__', 'error', message);
      this.logger.error('Failed to load local plugin', { dir, error: message });
      return { success: false, error: message };
    }
  }

  /**
   * Unload a locally loaded plugin.
   */
  async unloadLocalPlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.localPluginPaths.has(pluginId)) {
      return { success: false, error: `Plugin '${pluginId}' is not a locally loaded plugin` };
    }

    try {
      this.unload(pluginId);
      this.localPluginPaths.delete(pluginId);
      await this.persistLocalPlugins();
      await this.onPluginChanged?.(pluginId, 'unloaded');
      this.logger.info('Unloaded local plugin', { pluginId });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to unload local plugin', { pluginId, error: message });
      return { success: false, error: message };
    }
  }

  /** Check if a plugin was loaded from a local directory. */
  isLocalPlugin(pluginId: string): boolean {
    return this.localPluginPaths.has(pluginId);
  }

  /** Get the local path for a locally loaded plugin. */
  getLocalPluginPath(pluginId: string): string | undefined {
    return this.localPluginPaths.get(pluginId);
  }

  /** Get all locally loaded plugin IDs and paths. */
  getLocalPlugins(): Array<{ pluginId: string; path: string }> {
    return Array.from(this.localPluginPaths.entries()).map(([pluginId, p]) => ({ pluginId, path: p }));
  }

  /**
   * Get the root directory for a plugin (for finding README.md, etc.).
   * Returns the packageRoot for builtins, customization path for customized,
   * or local path for locally loaded plugins.
   */
  getPluginRootDir(pluginId: string): string | undefined {
    // Local plugins
    const localPath = this.localPluginPaths.get(pluginId);
    if (localPath) return localPath;

    // Customized plugins
    const customPath = this.customizationPaths.get(pluginId);
    if (customPath) return customPath;

    // Builtin plugins (packageRoot)
    const source = this.pluginSources.get(pluginId);
    if (source) return source.packageRoot;

    return undefined;
  }

  // ── File Watching ───────────────────────────────────────────────────────

  /**
   * Start watching a customized plugin directory for file changes.
   * On change: debounce → rebundle → evaluate → emit.
   */
  watch(pluginId: string, customizationPath: string): void {
    // Don't double-watch
    if (this.watchers.has(pluginId)) {
      this.unwatch(pluginId);
    }

    if (!existsSync(customizationPath)) {
      this.logger.warn('Customization path does not exist, skipping watch', {
        pluginId,
        customizationPath,
      });
      return;
    }

    this.logger.info('Watching customized plugin', { pluginId, customizationPath });

    try {
      const watcher = watch(
        customizationPath,
        { recursive: true },
        (_eventType, filename) => {
          if (!filename || shouldIgnore(filename)) return;
          this.handleFileChange(pluginId, filename);
        },
      );

      watcher.on('error', (err) => {
        const errorCount = (this.watcherErrors.get(pluginId) ?? 0) + 1;
        this.watcherErrors.set(pluginId, errorCount);

        this.logger.error('Watcher error', {
          pluginId,
          error: err instanceof Error ? err.message : String(err),
          errorCount,
        });

        this.unwatch(pluginId);

        // Retry up to 3 times with increasing backoff for transient OS errors
        if (errorCount <= 3) {
          const backoffMs = errorCount * 2000;
          this.logger.info('Retrying watcher after transient error', { pluginId, backoffMs, attempt: errorCount });
          setTimeout(() => {
            if (!this.watchers.has(pluginId)) {
              this.watch(pluginId, customizationPath);
            }
          }, backoffMs);
        } else {
          this.logger.error('Watcher permanently failed after multiple retries', { pluginId, errorCount });
        }
      });

      this.watchers.set(pluginId, watcher);
      // Reset error counter on successful watch creation
      this.watcherErrors.delete(pluginId);
    } catch (err) {
      this.logger.error('Failed to create watcher', {
        pluginId,
        customizationPath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Stop watching a plugin.
   */
  unwatch(pluginId: string): void {
    const watcher = this.watchers.get(pluginId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(pluginId);
    }
    const timer = this.timers.get(pluginId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(pluginId);
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  isLoaded(pluginId: string): boolean {
    return this.loaded.has(pluginId);
  }

  getLoaded(pluginId: string): LoadedPlugin | undefined {
    return this.loaded.get(pluginId);
  }

  getAllLoaded(): LoadedPlugin[] {
    return Array.from(this.loaded.values());
  }

  getCustomizationPath(pluginId: string): string {
    return path.join(this.customizationsDir, pluginId);
  }

  hasCustomization(pluginId: string): boolean {
    return existsSync(this.getCustomizationPath(pluginId));
  }

  getWatchedPlugins(): string[] {
    return Array.from(this.watchers.keys());
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /**
   * Stop all watchers and clean up.
   */
  close(): void {
    for (const pluginId of this.watchers.keys()) {
      this.unwatch(pluginId);
    }
  }

  // ── Private: File Change Handling ───────────────────────────────────────

  private handleFileChange(pluginId: string, filename: string): void {
    const existing = this.timers.get(pluginId);
    if (existing) clearTimeout(existing);

    this.logger.info('File change detected', { pluginId, filename });

    // Use .catch() instead of async/await so an error inside reloadAfterChange
    // never becomes an unhandled promise rejection that kills the process.
    const timer = setTimeout(() => {
      this.timers.delete(pluginId);
      this.reloadAfterChange(pluginId).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error('Unhandled error during hot-reload', { pluginId, error: message });
        this.onPluginError?.(pluginId, message, 'bundle');
      });
    }, this.debounceMs);

    this.timers.set(pluginId, timer);
  }

  private async reloadAfterChange(pluginId: string): Promise<void> {
    this.logger.info('Hot-reloading customized plugin', { pluginId });

    const result = await this.reload(pluginId);
    if (result.success) {
      this.logger.info('Hot-reload successful', { pluginId, name: result.definition?.name });
      try {
        await this.onPluginChanged?.(pluginId, 'reloaded', result.definition);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error('Plugin reload integration failed', { pluginId, error: message });
        this.onPluginError?.(pluginId, message, 'bundle');
      }
    } else {
      this.logger.error('Hot-reload failed', { pluginId, error: result.error });
      this.onPluginError?.(pluginId, result.error ?? 'Unknown error', 'bundle');
    }
  }

  // ── Private: Customization Helpers ──────────────────────────────────────

  /**
   * Remove workspace:* dependencies from the copied package.json.
   * These are platform externals provided by the host app at runtime.
   */
  private async stripWorkspaceDeps(dir: string): Promise<void> {
    const pkgJsonPath = path.join(dir, 'package.json');
    if (!existsSync(pkgJsonPath)) return;

    try {
      const raw = await readFile(pkgJsonPath, 'utf-8');
      const pkg = JSON.parse(raw) as Record<string, unknown>;

      // Remove devDependencies — not needed at runtime
      delete pkg['devDependencies'];

      for (const depField of ['dependencies', 'peerDependencies'] as const) {
        const deps = pkg[depField] as Record<string, string> | undefined;
        if (!deps || typeof deps !== 'object') continue;
        for (const [name, version] of Object.entries(deps)) {
          if (typeof version === 'string' && version.startsWith('workspace:')) {
            delete deps[name];
          }
        }
      }

      await writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    } catch (err) {
      this.logger.warn('Failed to strip workspace deps (non-fatal)', {
        dir,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async installDeps(dir: string): Promise<void> {
    const pkgJsonPath = path.join(dir, 'package.json');
    if (!existsSync(pkgJsonPath)) return;

    this.logger.info('Installing plugin dependencies', { dir });
    let env: Record<string, string> = { ...process.env as Record<string, string> };
    try {
      env = getEnrichedEnv();
    } catch {
      // Fall back to process env if shell resolution fails
    }
    try {
      const npmCache = path.join(this.customizationsDir, '.npm-cache');
      await execFileAsync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', '--cache', npmCache], {
        cwd: dir,
        timeout: 120_000,
        env,
      });
    } catch (err) {
      this.logger.warn('npm install failed, plugin may still work without custom deps', {
        dir,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Generate a standalone tsconfig.json by flattening extends chains.
   * Prevents "Cannot find base config" warnings when outside the monorepo.
   */
  private async writeStandaloneTsconfig(packageRoot: string, destDir: string): Promise<void> {
    const tsconfigSrc = path.join(packageRoot, 'tsconfig.json');
    if (!existsSync(tsconfigSrc)) return;

    try {
      const raw = await readFile(tsconfigSrc, 'utf-8');
      const tsconfig = JSON.parse(raw) as Record<string, unknown>;

      // Resolve and merge the `extends` chain
      if (typeof tsconfig['extends'] === 'string') {
        const basePath = path.resolve(packageRoot, tsconfig['extends']);
        if (existsSync(basePath)) {
          const baseRaw = await readFile(basePath, 'utf-8');
          const base = JSON.parse(baseRaw) as Record<string, unknown>;

          tsconfig['compilerOptions'] = {
            ...(base['compilerOptions'] as object | undefined),
            ...(tsconfig['compilerOptions'] as object | undefined),
          };

          if (!tsconfig['exclude'] && base['exclude']) {
            tsconfig['exclude'] = base['exclude'];
          }
        }
        delete tsconfig['extends'];
      }

      // Strip monorepo-only options
      const compilerOptions = tsconfig['compilerOptions'] as Record<string, unknown> | undefined;
      if (compilerOptions) {
        delete compilerOptions['composite'];
        delete compilerOptions['declarationMap'];
      }

      await writeFile(
        path.join(destDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2) + '\n',
        'utf-8',
      );
    } catch (err) {
      this.logger.warn('Failed to generate standalone tsconfig (non-fatal)', {
        packageRoot,
        destDir,
        error: err instanceof Error ? err.message : String(err),
      });
      // Fall back to copying as-is
      await cp(tsconfigSrc, path.join(destDir, 'tsconfig.json'));
    }
  }
}
