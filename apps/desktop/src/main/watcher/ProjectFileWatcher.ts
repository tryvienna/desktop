/**
 * ProjectFileWatcher — Watches project directories for file changes and runs detectors.
 *
 * Uses @parcel/watcher for instant OS-level file change detection (FSEvents on macOS,
 * inotify on Linux). When a file changes, filters through `git check-ignore` to respect
 * the project's .gitignore, then runs detectors to find patterns like TODO comments.
 *
 * Lifecycle:
 * - watchDirectory(dir) — start watching a directory
 * - unwatchDirectory(dir) — stop watching
 * - stopAll() — stop all watchers
 */

import type { AsyncSubscription, Event } from '@parcel/watcher';
import { execFile } from 'node:child_process';
import { extname } from 'node:path';
import { analyze, todoAstDetectors } from '@vienna/file-analyzer';
import type { Detection } from '@vienna/file-analyzer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FileChangedEvent {
  absolutePath: string;
  relativePath: string;
  directory: string;
  extension: string;
}

export interface ProjectFileWatcherOptions {
  onDetections: (repoRoot: string, detections: Detection[]) => void;
  onFileChanged?: (event: FileChangedEvent) => void;
  onError?: (error: unknown) => void;
  onLog?: (msg: string, data?: Record<string, unknown>) => void;
  debounceMs?: number;
}

interface DirectoryWatcher {
  subscription: AsyncSubscription;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  pendingFiles: Set<string>;
}

const DEFAULT_DEBOUNCE_MS = 50;

/** File extensions we run detectors on. */
const ANALYZABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h',
]);

/**
 * Minimal path-segment filter applied BEFORE git check-ignore.
 * Only filters paths that are never tracked by git (the .git dir itself).
 * Everything else is deferred to the project's .gitignore via git check-ignore.
 */
function isGitInternal(path: string): boolean {
  return path.includes('/.git/');
}

// ─────────────────────────────────────────────────────────────────────────────
// Watcher
// ─────────────────────────────────────────────────────────────────────────────

export class ProjectFileWatcher {
  private watchers = new Map<string, DirectoryWatcher>();
  private readonly onDetections: ProjectFileWatcherOptions['onDetections'];
  private readonly onFileChanged: ProjectFileWatcherOptions['onFileChanged'];
  private readonly onError: (error: unknown) => void;
  private readonly log: (msg: string, data?: Record<string, unknown>) => void;
  private readonly debounceMs: number;

  constructor(options: ProjectFileWatcherOptions) {
    this.onDetections = options.onDetections;
    this.onFileChanged = options.onFileChanged;
    this.onError = options.onError ?? (() => {});
    this.log = options.onLog ?? (() => {});
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  }

  async watchDirectory(dir: string): Promise<void> {
    if (this.watchers.has(dir)) return;

    const watcher = await import('@parcel/watcher');
    const subscription = await watcher.subscribe(
      dir,
      (err, events) => {
        if (err) {
          this.onError(err);
          return;
        }
        this.handleEvents(dir, events);
      },
      {
        // Minimal ignore — let git check-ignore handle the rest
        ignore: ['**/.git/**'],
      },
    );

    this.watchers.set(dir, {
      subscription,
      debounceTimer: null,
      pendingFiles: new Set(),
    });

    this.log('Watching directory', { dir });
  }

  async unwatchDirectory(dir: string): Promise<void> {
    const watcher = this.watchers.get(dir);
    if (!watcher) return;

    if (watcher.debounceTimer) clearTimeout(watcher.debounceTimer);
    await watcher.subscription.unsubscribe();
    this.watchers.delete(dir);
    this.log('Unwatched directory', { dir });
  }

  async stopAll(): Promise<void> {
    const dirs = Array.from(this.watchers.keys());
    await Promise.all(dirs.map((dir) => this.unwatchDirectory(dir)));
  }

  getWatchedDirectories(): string[] {
    return Array.from(this.watchers.keys());
  }

  // ── Event handling ──────────────────────────────────────────────────────

  private handleEvents(dir: string, events: Event[]): void {
    const watcher = this.watchers.get(dir);
    if (!watcher) return;

    // Collect candidate files (non-delete, analyzable extension, not .git internal)
    const candidates: Array<{ path: string; ext: string; relativePath: string }> = [];
    const prefix = dir.endsWith('/') ? dir : dir + '/';

    for (const event of events) {
      if (event.type === 'delete') continue;
      if (isGitInternal(event.path)) continue;

      const ext = extname(event.path);
      if (!ANALYZABLE_EXTENSIONS.has(ext)) continue;

      const relativePath = event.path.startsWith(prefix)
        ? event.path.slice(prefix.length)
        : event.path;

      candidates.push({ path: event.path, ext, relativePath });
    }

    if (candidates.length === 0) return;

    // Filter through git check-ignore to respect .gitignore
    this.filterGitignored(dir, candidates.map((c) => c.relativePath))
      .then((tracked) => {
        const trackedSet = new Set(tracked);

        for (const candidate of candidates) {
          if (!trackedSet.has(candidate.relativePath)) continue;

          this.log('File changed', {
            absolutePath: candidate.path,
            relativePath: candidate.relativePath,
            dir,
            ext: candidate.ext,
          });

          this.onFileChanged?.({
            absolutePath: candidate.path,
            relativePath: candidate.relativePath,
            directory: dir,
            extension: candidate.ext,
          });

          watcher.pendingFiles.add(candidate.relativePath);
        }

        if (watcher.pendingFiles.size === 0) return;

        if (watcher.debounceTimer) clearTimeout(watcher.debounceTimer);
        watcher.debounceTimer = setTimeout(() => {
          const files = Array.from(watcher.pendingFiles);
          watcher.pendingFiles.clear();
          void this.analyzeFiles(dir, files);
        }, this.debounceMs);
      })
      .catch((err) => {
        // If git check-ignore fails (not a git repo?), process all candidates
        this.log('git check-ignore failed, processing all candidates', {
          error: err instanceof Error ? err.message : String(err),
        });

        for (const candidate of candidates) {
          this.onFileChanged?.({
            absolutePath: candidate.path,
            relativePath: candidate.relativePath,
            directory: dir,
            extension: candidate.ext,
          });
          watcher.pendingFiles.add(candidate.relativePath);
        }

        if (watcher.debounceTimer) clearTimeout(watcher.debounceTimer);
        watcher.debounceTimer = setTimeout(() => {
          const files = Array.from(watcher.pendingFiles);
          watcher.pendingFiles.clear();
          void this.analyzeFiles(dir, files);
        }, this.debounceMs);
      });
  }

  /**
   * Filter file paths through `git check-ignore`.
   * Returns paths that are NOT ignored (i.e., tracked or untracked but not gitignored).
   */
  private filterGitignored(cwd: string, paths: string[]): Promise<string[]> {
    if (paths.length === 0) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      // git check-ignore returns the paths that ARE ignored.
      // We want the inverse — paths that are NOT ignored.
      const proc = execFile(
        'git',
        ['check-ignore', '--stdin'],
        { cwd, maxBuffer: 1024 * 1024, timeout: 5000 },
        (err, stdout) => {
          if (err) {
            // Exit code 1 = no ignored files found (all are tracked) — that's fine
            if ((err as NodeJS.ErrnoException).code === '1' || err.message.includes('exit code 1')) {
              resolve(paths);
              return;
            }
            // Exit code 128 = not a git repo
            reject(err);
            return;
          }
          const ignored = new Set(stdout.trim().split('\n').filter(Boolean));
          resolve(paths.filter((p) => !ignored.has(p)));
        },
      );
      // Write paths to stdin
      proc.stdin?.write(paths.join('\n'));
      proc.stdin?.end();
    });
  }

  private async analyzeFiles(repoRoot: string, files: string[]): Promise<void> {
    this.log('Analyzing changed files', { repoRoot, fileCount: files.length, files });

    try {
      const detections = await analyze({
        repoRoot,
        files,
        detectors: [...todoAstDetectors],
        onError: (detector, file, error) => {
          this.log(`Detector '${detector}' failed on ${file}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        },
      });

      if (detections.length > 0) {
        this.log('Detections found', {
          count: detections.length,
          events: detections.map((d) => d.event),
        });
        this.onDetections(repoRoot, detections);
      }
    } catch (err) {
      this.onError(err);
    }
  }
}
