/**
 * ClaudeFileChangeListener — Detects patterns in files within Claude session directories.
 *
 * When a Claude session starts, begins watching its working directory with
 * @parcel/watcher for instant file change detection. Runs detectors (TODO, etc.)
 * against changed files and emits core plugin events.
 *
 * This is much faster than the JSONL-based approach: file changes are detected
 * within milliseconds of the write via OS-level notifications (FSEvents/inotify),
 * rather than waiting for Claude to write the tool_result to the JSONL.
 *
 * Data flow:
 *   core.claude-code.session.started → watchDirectory(cwd)
 *   @parcel/watcher detects file change → git diff → detectors
 *   → pluginSystem.emitCoreEvent('core.src.todo.added', payload)
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { defineEvent, type PluginSystem, type PluginLogger, type EventListenerDeclaration } from '@tryvienna/sdk';
import type { Detection, TodoPayload } from '@vienna/file-analyzer';
import { z } from 'zod';
import { ProjectFileWatcher } from './ProjectFileWatcher';

// ─────────────────────────────────────────────────────────────────────────────
// Event definitions
// ─────────────────────────────────────────────────────────────────────────────

const todoAddedEvent = defineEvent({
  name: 'src.todo.added',
  description: 'A TODO/FIXME/HACK/XXX comment was added in source code',
  schema: z.object({
    tag: z.enum(['TODO', 'FIXME', 'HACK', 'XXX']),
    text: z.string(),
    file: z.string(),
    line: z.number(),
    context: z.string(),
    repoRoot: z.string(),
  }),
});

const todoRemovedEvent = defineEvent({
  name: 'src.todo.removed',
  description: 'A TODO/FIXME/HACK/XXX comment was removed from source code',
  schema: z.object({
    tag: z.enum(['TODO', 'FIXME', 'HACK', 'XXX']),
    text: z.string(),
    file: z.string(),
    line: z.number(),
    context: z.string(),
    repoRoot: z.string(),
  }),
});

const fileChangedEvent = defineEvent({
  name: 'file.changed',
  description: 'A source file was modified in a watched project directory',
  schema: z.object({
    /** Absolute path of the changed file. */
    absolutePath: z.string(),
    /** Relative path from the project directory. */
    relativePath: z.string(),
    /** The watched project directory root. */
    directory: z.string(),
    /** File extension (e.g., ".ts"). */
    extension: z.string(),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Listener
// ─────────────────────────────────────────────────────────────────────────────

export interface ClaudeFileChangeListenerOptions {
  pluginSystem: PluginSystem;
  logger: PluginLogger;
}

export class ClaudeFileChangeListener {
  private readonly pluginSystem: PluginSystem;
  private readonly logger: PluginLogger;
  private readonly fileWatcher: ProjectFileWatcher;

  constructor(options: ClaudeFileChangeListenerOptions) {
    this.pluginSystem = options.pluginSystem;
    this.logger = options.logger;

    // Register events
    this.pluginSystem.registerCoreEvent(todoAddedEvent);
    this.pluginSystem.registerCoreEvent(todoRemovedEvent);
    this.pluginSystem.registerCoreEvent(fileChangedEvent);

    // Create file watcher that runs detectors on changed files
    this.fileWatcher = new ProjectFileWatcher({
      onFileChanged: (event) => {
        // Emit core.file.changed immediately — plugins (e.g., vercel-cli) listen to this
        this.logger.info('Emitting core.file.changed', {
          absolutePath: event.absolutePath,
          relativePath: event.relativePath,
          directory: event.directory,
        });
        try {
          this.pluginSystem.emitCoreEvent('core.file.changed', event);
          this.logger.debug('core.file.changed emitted successfully');
        } catch (err) {
          this.logger.error('Failed to emit core.file.changed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
      onDetections: (repoRoot, detections) => {
        for (const detection of detections) {
          this.emitDetection(detection, repoRoot);
        }
      },
      onError: (err) => {
        this.logger.error('ProjectFileWatcher error', {
          error: err instanceof Error ? err.message : String(err),
        });
      },
      onLog: (msg, data) => {
        this.logger.debug(msg, data);
      },
    });

    // Listen for Claude sessions starting — watch their working directories
    const listeners: EventListenerDeclaration[] = [
      {
        event: 'core.claude-code.session.started',
        handler: (payload: unknown) => {
          const p = payload as { cwd: string; sessionId: string; projectPath: string };
          if (p.cwd) {
            void this.fileWatcher.watchDirectory(p.cwd).catch((err) => {
              this.logger.warn('Failed to watch session directory', {
                cwd: p.cwd,
                error: err instanceof Error ? err.message : String(err),
              });
            });
          }
        },
      },
    ];
    this.pluginSystem.registerCoreListeners(listeners);

    this.logger.info('ClaudeFileChangeListener initialized', {
      events: ['core.src.todo.added', 'core.src.todo.removed', 'core.file.changed'],
    });
  }

  /**
   * Scan ~/.claude/sessions/ for active Claude sessions and watch their cwds.
   * Call on startup and after plugins load (so late-loaded plugins get file.changed events).
   */
  async watchActiveSessions(): Promise<void> {
    try {
      const sessionsDir = join(homedir(), '.claude', 'sessions');
      const files = await readdir(sessionsDir);
      const watchedDirs = new Set(this.fileWatcher.getWatchedDirectories());

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const content = await readFile(join(sessionsDir, file), 'utf-8');
          const meta = JSON.parse(content) as { pid?: number; cwd?: string };
          if (!meta.cwd || !meta.pid) continue;
          if (watchedDirs.has(meta.cwd)) continue;

          // Check if the process is still running
          try {
            process.kill(meta.pid, 0); // Signal 0 = check existence
          } catch {
            continue; // Process not running
          }

          await this.fileWatcher.watchDirectory(meta.cwd);
          this.logger.info('Watching active session directory', { cwd: meta.cwd, pid: meta.pid });
        } catch {
          // Skip corrupt/unreadable session files
        }
      }
    } catch {
      // ~/.claude/sessions may not exist
    }
  }

  /** Stop all file watchers. */
  stop(): void {
    void this.fileWatcher.stopAll();
  }

  // ── Event emission ────────────────────────────────────────────────────

  private emitDetection(detection: Detection, repoRoot: string): void {
    const todoPayload = detection.payload as TodoPayload;
    const coreEventName = detection.event === 'todo.added'
      ? 'core.src.todo.added'
      : 'core.src.todo.removed';

    try {
      this.pluginSystem.emitCoreEvent(coreEventName, {
        ...todoPayload,
        repoRoot,
      });
    } catch (err) {
      this.logger.error(`Failed to emit ${coreEventName}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
