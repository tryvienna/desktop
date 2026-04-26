/**
 * File Index Service
 *
 * Provides instant file search by maintaining an in-memory index.
 * Index is built incrementally using setImmediate + async readdir to avoid
 * blocking the main-process event loop.
 * File watchers keep the index fresh automatically.
 *
 * Uses shared primitives from @vienna/file-search for fuzzy scoring,
 * ignore rules, and extension filtering.
 *
 * @ai-context
 * - Singleton service, lives in the main process
 * - addDirectory() returns immediately, scans in background via async I/O
 * - setDirectories() replaces the full indexed set (removes old, keeps unchanged, adds new)
 * - search() is pure in-memory — no I/O, instant results
 * - File watchers incrementally update the index on add/delete
 * - Git-ignored files are detected post-scan via `git check-ignore --stdin`
 * - Emits status change callbacks so the renderer can show indexing progress
 * - All filesystem I/O uses fs.promises (non-blocking) — never blocks the event loop
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { getEnrichedEnv } from '@vienna/shell-env';
import {
  fuzzyScore,
  isExcludedDir,
  isExcludedExtension,
  EXCLUDED_DIRS,
} from '@vienna/file-search';

// =============================================================================
// TYPES
// =============================================================================

export interface FileEntry {
  path: string;
  name: string;
  relativePath: string;
  extension: string;
  nameLower: string;
  relativePathLower: string;
  isGitIgnored: boolean;
}

export interface FileSearchInput {
  query: string;
  limit?: number;
  extensions?: string[];
  showDotfiles?: boolean;
  showGitignored?: boolean;
}

export interface FileSearchResult {
  path: string;
  name: string;
  relativePath: string;
  projectRoot: string;
  extension?: string;
  score: number;
}

export interface IndexStatus {
  totalFiles: number;
  directories: number;
  isIndexing: boolean;
  indexingDirectories: string[];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_DEPTH = 20;
const DIRS_PER_TICK = 50;

// =============================================================================
// FILE INDEX SERVICE
// =============================================================================

export type IndexStatusListener = (status: IndexStatus) => void;

const WATCHER_DEBOUNCE_MS = 300;

class FileIndexService {
  private index: Map<string, FileEntry[]> = new Map();
  private indexingSet: Set<string> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private statusListeners: Set<IndexStatusListener> = new Set();
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private watcherTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  onStatusChange(listener: IndexStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => { this.statusListeners.delete(listener); };
  }

  private emitStatus(): void {
    const status = this.getStatus();
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  // ---------------------------------------------------------------------------
  // Git ignore detection
  // ---------------------------------------------------------------------------

  private async getGitIgnoredPaths(rootDir: string, filePaths: string[]): Promise<Set<string>> {
    if (filePaths.length === 0) return new Set();

    return new Promise((resolve) => {
      const proc = spawn('git', ['check-ignore', '--stdin'], { cwd: rootDir, env: getEnrichedEnv() });
      let stdout = '';

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.on('close', () => {
        const ignored = new Set(stdout.trim().split('\n').filter(Boolean));
        resolve(ignored);
      });
      proc.on('error', () => resolve(new Set()));

      proc.stdin.write(filePaths.join('\n'));
      proc.stdin.end();
    });
  }

  // ---------------------------------------------------------------------------
  // Directory scanning (non-blocking)
  // ---------------------------------------------------------------------------

  private async scanDirectory(rootDir: string, signal: AbortSignal): Promise<void> {
    const files: FileEntry[] = [];
    const dirsToProcess: Array<{ path: string; depth: number }> = [{ path: rootDir, depth: 0 }];

    while (dirsToProcess.length > 0 && !signal.aborted) {
      const batch = dirsToProcess.splice(0, DIRS_PER_TICK);

      for (const { path: dirPath, depth } of batch) {
        if (depth > MAX_DEPTH || signal.aborted) continue;

        let entries: fs.Dirent[];
        try {
          entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        } catch {
          continue;
        }

        for (const entry of entries) {
          const name = entry.name;

          if (entry.isDirectory()) {
            if (!isExcludedDir(name)) {
              dirsToProcess.push({ path: path.join(dirPath, name), depth: depth + 1 });
            }
            continue;
          }

          if (!entry.isFile()) continue;

          const ext = path.extname(name).slice(1).toLowerCase();
          if (isExcludedExtension(ext)) continue;

          const fullPath = path.join(dirPath, name);
          const relativePath = path.relative(rootDir, fullPath);

          files.push({
            path: fullPath,
            name,
            relativePath,
            extension: ext,
            nameLower: name.toLowerCase(),
            relativePathLower: relativePath.toLowerCase(),
            isGitIgnored: false,
          });
        }
      }

      // Yield to event loop every batch
      if (dirsToProcess.length > 0 && !signal.aborted) {
        await new Promise<void>(resolve => setImmediate(resolve));
      }
    }

    if (!signal.aborted) {
      const ignoredPaths = await this.getGitIgnoredPaths(rootDir, files.map(f => f.path));
      if (ignoredPaths.size > 0) {
        for (const file of files) {
          if (ignoredPaths.has(file.path)) {
            file.isGitIgnored = true;
          }
        }
      }

      this.index.set(rootDir, files);
    }
  }

  // ---------------------------------------------------------------------------
  // File watching (incremental index updates)
  // ---------------------------------------------------------------------------

  private startWatching(directory: string): void {
    if (this.watchers.has(directory)) return;

    // Accumulate changed paths and process them in a debounced batch
    const pendingPaths = new Set<string>();

    const flushPending = async () => {
      this.watcherTimers.delete(directory);
      const files = this.index.get(directory);
      if (!files) return;

      const toProcess = [...pendingPaths];
      pendingPaths.clear();

      const addedPaths: string[] = [];

      for (const fullPath of toProcess) {
        const filename = path.relative(directory, fullPath);
        const name = path.basename(filename);

        try {
          const stats = await fs.promises.stat(fullPath);
          if (stats.isFile()) {
            const ext = path.extname(name).slice(1).toLowerCase();
            if (!isExcludedExtension(ext)) {
              const existingIdx = files.findIndex(f => f.path === fullPath);
              const entry: FileEntry = {
                path: fullPath,
                name,
                relativePath: filename,
                extension: ext,
                nameLower: name.toLowerCase(),
                relativePathLower: filename.toLowerCase(),
                isGitIgnored: false,
              };
              if (existingIdx >= 0) {
                files[existingIdx] = entry;
              } else {
                files.push(entry);
                addedPaths.push(fullPath);
              }
            }
          }
        } catch {
          // File deleted — remove from index
          const idx = files.findIndex(f => f.path === fullPath);
          if (idx >= 0) {
            files.splice(idx, 1);
          }
        }
      }

      // Check git-ignore status for newly added files
      if (addedPaths.length > 0) {
        this.getGitIgnoredPaths(directory, addedPaths).then(ignored => {
          if (ignored.size === 0) return;
          const currentFiles = this.index.get(directory);
          if (!currentFiles) return;
          for (const file of currentFiles) {
            if (ignored.has(file.path)) {
              file.isGitIgnored = true;
            }
          }
        });
      }
    };

    try {
      const watcher = fs.watch(directory, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;

        // Skip paths that go through excluded directories
        const parts = filename.split(path.sep);
        if (parts.some(p => EXCLUDED_DIRS.has(p))) return;

        pendingPaths.add(path.join(directory, filename));

        // Debounce: reset the timer on each event
        const existing = this.watcherTimers.get(directory);
        if (existing) clearTimeout(existing);
        this.watcherTimers.set(directory, setTimeout(flushPending, WATCHER_DEBOUNCE_MS));
      });

      this.watchers.set(directory, watcher);
    } catch {
      // Watcher creation failed — index works without it, just won't auto-update
    }
  }

  private stopWatching(directory: string): void {
    const timer = this.watcherTimers.get(directory);
    if (timer) {
      clearTimeout(timer);
      this.watcherTimers.delete(directory);
    }
    const watcher = this.watchers.get(directory);
    if (watcher) {
      watcher.close();
      this.watchers.delete(directory);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  addDirectory(directory: string): void {
    if (this.indexingSet.has(directory)) return;
    if (this.index.has(directory)) return;

    const existingController = this.abortControllers.get(directory);
    if (existingController) {
      existingController.abort();
    }

    const controller = new AbortController();
    this.abortControllers.set(directory, controller);
    this.indexingSet.add(directory);
    this.index.set(directory, []);
    this.emitStatus();

    this.scanDirectory(directory, controller.signal)
      .then(() => {
        this.indexingSet.delete(directory);
        this.abortControllers.delete(directory);
        this.emitStatus();
        this.startWatching(directory);
      })
      .catch(() => {
        this.indexingSet.delete(directory);
        this.abortControllers.delete(directory);
        this.emitStatus();
      });
  }

  /**
   * Replace the full set of indexed directories. Directories not in the new
   * set are removed (watchers stopped, index cleared). Directories already
   * indexed are kept as-is. New directories are scanned in the background.
   */
  setDirectories(directories: string[]): void {
    const desired = new Set(directories);

    // Remove directories that are no longer wanted
    for (const existing of [...this.index.keys()]) {
      if (!desired.has(existing)) {
        this.removeDirectory(existing);
      }
    }
    // Also remove any that are currently indexing but not in the new set
    for (const indexing of [...this.indexingSet]) {
      if (!desired.has(indexing)) {
        this.removeDirectory(indexing);
      }
    }

    // Add new directories (addDirectory is idempotent — skips already-indexed)
    for (const dir of directories) {
      this.addDirectory(dir);
    }
  }

  removeDirectory(directory: string): void {
    const controller = this.abortControllers.get(directory);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(directory);
    }
    this.stopWatching(directory);
    this.index.delete(directory);
    this.indexingSet.delete(directory);
    this.emitStatus();
  }

  search(input: FileSearchInput): FileSearchResult[] {
    const { query, limit = 50, extensions, showDotfiles = false, showGitignored = false } = input;

    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim();
    const results: Array<{ file: FileEntry; projectRoot: string; score: number }> = [];

    for (const [projectRoot, files] of this.index) {
      for (const file of files) {
        if (!showDotfiles && file.name.startsWith('.')) continue;
        if (!showGitignored && file.isGitIgnored) continue;

        if (extensions?.length) {
          if (!extensions.some(ext => ext.toLowerCase() === file.extension)) continue;
        }

        // Score against filename (higher weight) and full path
        const nameScore = fuzzyScore(trimmedQuery, file.name, file.nameLower) * 1.5;
        const pathScore = fuzzyScore(trimmedQuery, file.relativePath, file.relativePathLower);
        const score = Math.max(nameScore, pathScore);

        if (score > 0) {
          results.push({ file, projectRoot, score });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit).map(({ file, projectRoot, score }) => ({
      path: file.path,
      name: file.name,
      relativePath: file.relativePath,
      projectRoot,
      extension: file.extension || undefined,
      score,
    }));
  }

  getStatus(): IndexStatus {
    let totalFiles = 0;
    for (const files of this.index.values()) {
      totalFiles += files.length;
    }

    return {
      totalFiles,
      directories: this.index.size,
      isIndexing: this.indexingSet.size > 0,
      indexingDirectories: Array.from(this.indexingSet),
    };
  }

  isDirectoryIndexed(directory: string): boolean {
    return this.index.has(directory) && !this.indexingSet.has(directory);
  }

  shutdown(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    for (const timer of this.watcherTimers.values()) {
      clearTimeout(timer);
    }
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
    this.watcherTimers.clear();
    this.index.clear();
    this.indexingSet.clear();
    this.abortControllers.clear();
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: FileIndexService | null = null;

export function getFileIndexService(): FileIndexService {
  if (!instance) {
    instance = new FileIndexService();
  }
  return instance;
}

export { FileIndexService };
