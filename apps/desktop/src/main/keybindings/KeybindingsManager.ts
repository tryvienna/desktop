/**
 * Keybindings Manager
 *
 * @ai-context
 * Main-process manager for keybinding persistence. Uses dependency injection
 * (no singletons) for testability. All file system operations and paths are
 * injected — tests use in-memory mocks.
 *
 * Storage: `<baseDir>/keybindings.json`
 * Strategy: Only user overrides are persisted. Defaults are merged at read time.
 *
 * @module main/keybindings/KeybindingsManager
 */

import { watch, type FSWatcher } from 'fs';
import { dirname } from 'path';
import type { MainLogger } from '@vienna/logger/main';
import { DEFAULT_KEYBINDINGS } from '../../keybindings/defaults';
import { KeybindingsMapSchema } from '../../keybindings/schemas';
import type { KeyboardShortcut, KeybindingsMap } from '../../keybindings/schemas';
import { shortcutKey } from '../../keybindings/utils';

// ─── Dependencies ───────────────────────────────────────────────────────────

/** Minimal file system interface for testability. */
export interface FsLike {
  readFile(path: string, encoding: 'utf-8'): Promise<string>;
  writeFile(path: string, content: string, encoding: 'utf-8'): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  unlink(path: string): Promise<void>;
  mkdir(path: string, options: { recursive: boolean }): Promise<void>;
}

/** Event emitter for pushing changes to renderer. */
export interface KeybindingsEmitter {
  onChanged(payload: { keybindings: KeybindingsMap }): void;
}

export interface KeybindingsManagerDeps {
  fs: FsLike;
  keybindingsPath: string;
  logger: MainLogger;
  emitter: KeybindingsEmitter;
}

// ─── Manager ────────────────────────────────────────────────────────────────

export class KeybindingsManager {
  private readonly fs: FsLike;
  private readonly keybindingsPath: string;
  private readonly logger: MainLogger;
  private readonly emitter: KeybindingsEmitter;

  private userOverrides: KeybindingsMap = {};
  private watcher: FSWatcher | null = null;
  private initialized = false;
  private isWriting = false;

  constructor(deps: KeybindingsManagerDeps) {
    this.fs = deps.fs;
    this.keybindingsPath = deps.keybindingsPath;
    this.logger = deps.logger;
    this.emitter = deps.emitter;
  }

  /**
   * Initialize: load keybindings from file (or create empty).
   * Idempotent — safe to call multiple times.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info('Initializing keybindings manager', { path: this.keybindingsPath });

    // Ensure parent directory exists
    const dir = dirname(this.keybindingsPath);
    if (dir) {
      await this.fs.mkdir(dir, { recursive: true });
    }

    await this.loadFromFile();
    this.startWatcher();
    this.initialized = true;
  }

  /** Get merged keybindings: defaults + user overrides. */
  getKeybindings(): KeybindingsMap {
    return { ...DEFAULT_KEYBINDINGS, ...this.userOverrides };
  }

  /** Get factory defaults (copy). */
  getDefaultKeybindings(): KeybindingsMap {
    return { ...DEFAULT_KEYBINDINGS };
  }

  /** Update a single keybinding. */
  async updateKeybinding(commandId: string, shortcut: KeyboardShortcut): Promise<void> {
    if (!this.initialized) throw new Error('KeybindingsManager not initialized');

    this.logger.info('Updating keybinding', { commandId, shortcut });
    this.userOverrides[commandId] = shortcut;
    await this.writeAtomically(this.userOverrides);
    this.emit();
  }

  /** Reset a single keybinding to its default. */
  async resetKeybinding(commandId: string): Promise<void> {
    if (!this.initialized) throw new Error('KeybindingsManager not initialized');

    this.logger.info('Resetting keybinding', { commandId });
    delete this.userOverrides[commandId];
    await this.writeAtomically(this.userOverrides);
    this.emit();
  }

  /** Reset all keybindings to defaults. */
  async resetAllKeybindings(): Promise<void> {
    if (!this.initialized) throw new Error('KeybindingsManager not initialized');

    this.logger.info('Resetting all keybindings');
    this.userOverrides = {};
    await this.writeAtomically(this.userOverrides);
    this.emit();
  }

  /** Cleanup — stop watcher. */
  cleanup(): void {
    this.stopWatcher();
    this.initialized = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════════════════════════════════════

  private async loadFromFile(): Promise<void> {
    try {
      const content = await this.fs.readFile(this.keybindingsPath, 'utf-8');
      const json: unknown = JSON.parse(content);
      const parsed = KeybindingsMapSchema.safeParse(json);

      if (!parsed.success) {
        this.logger.warn('Invalid keybindings file, resetting to empty', {
          error: parsed.error.message,
        });
        this.userOverrides = {};
        await this.writeAtomically(this.userOverrides);
        return;
      }

      this.userOverrides = this.cleanStaleOverrides(parsed.data);
      await this.writeAtomically(this.userOverrides);

      this.logger.info('Loaded keybindings', {
        overrideCount: Object.keys(this.userOverrides).length,
      });
    } catch (error) {
      if (isEnoent(error)) {
        this.logger.info('Keybindings file not found, creating empty');
        this.userOverrides = {};
        await this.writeAtomically(this.userOverrides);
      } else if (error instanceof SyntaxError) {
        this.logger.warn('Invalid JSON in keybindings file, resetting to empty', {
          error: error.message,
        });
        this.userOverrides = {};
        await this.writeAtomically(this.userOverrides);
      } else {
        this.logger.error('Failed to load keybindings', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
  }

  /**
   * Clean stale overrides:
   * 1. Discard entries whose shortcut now belongs to a different command's default
   * 2. Discard entries that match the command's own current default (no-op overrides)
   */
  private cleanStaleOverrides(stored: KeybindingsMap): KeybindingsMap {
    const defaultsByShortcut = new Map<string, string>();
    for (const [cmdId, shortcut] of Object.entries(DEFAULT_KEYBINDINGS)) {
      defaultsByShortcut.set(shortcutKey(shortcut), cmdId);
    }

    const cleaned: KeybindingsMap = {};
    for (const [cmdId, shortcut] of Object.entries(stored)) {
      const sKey = shortcutKey(shortcut);

      // Skip if this shortcut now belongs to a different default command
      const defaultOwner = defaultsByShortcut.get(sKey);
      if (defaultOwner !== undefined && defaultOwner !== cmdId) {
        this.logger.debug('Discarding stale keybinding', { cmdId, conflictsWith: defaultOwner });
        continue;
      }

      // Skip if it matches the command's own default (no-op)
      const currentDefault = DEFAULT_KEYBINDINGS[cmdId];
      if (currentDefault && shortcutKey(currentDefault) === sKey) {
        continue;
      }

      cleaned[cmdId] = shortcut;
    }

    return cleaned;
  }

  private async writeAtomically(overrides: KeybindingsMap): Promise<void> {
    const tmpPath = `${this.keybindingsPath}.tmp`;
    const content = JSON.stringify(overrides, null, 2);

    this.isWriting = true;
    try {
      await this.fs.writeFile(tmpPath, content, 'utf-8');
      await this.fs.rename(tmpPath, this.keybindingsPath);
    } catch (error) {
      try {
        await this.fs.unlink(tmpPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    } finally {
      // Delay clearing the flag so the watcher event (which fires asynchronously
      // after rename) is still suppressed.
      setTimeout(() => { this.isWriting = false; }, 150);
    }
  }

  private startWatcher(): void {
    try {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      this.watcher = watch(this.keybindingsPath, (eventType) => {
        if (eventType !== 'change') return;
        // Skip events triggered by our own writes to avoid infinite reload loops
        if (this.isWriting) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.logger.debug('Keybindings file changed externally, reloading');
          void this.loadFromFile().then(() => this.emit());
        }, 100);
      });
    } catch (error) {
      this.logger.warn('Failed to watch keybindings file', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private stopWatcher(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  private emit(): void {
    try {
      this.emitter.onChanged({ keybindings: this.getKeybindings() });
    } catch (error) {
      this.logger.error('Failed to emit keybindings change', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function isEnoent(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}
