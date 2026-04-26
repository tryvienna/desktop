/**
 * File Service
 *
 * Provides file read/write/watch operations for the editor.
 * Emits change events via IPC when watched files change externally.
 *
 * @module main/file/FileService
 */

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { FSWatcher } from 'node:fs';
import type { Logger } from '@vienna/logger';
import { detectLanguage } from '@vienna/file-search';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileServiceCallbacks {
  onChanged: (data: { path: string }) => void;
}

export interface FileServiceOptions {
  readonly logger: Logger;
  readonly callbacks: FileServiceCallbacks;
}

// ---------------------------------------------------------------------------
// File Service
// ---------------------------------------------------------------------------

export class FileService {
  private readonly watchers = new Map<string, FSWatcher>();
  private readonly logger: Logger;
  private readonly callbacks: FileServiceCallbacks;
  private allowedRoots = new Set<string>();

  constructor(options: FileServiceOptions) {
    this.logger = options.logger;
    this.callbacks = options.callbacks;
  }

  /** Configure the set of root directories that mutating operations are allowed within. */
  setAllowedRoots(roots: string[]): void {
    this.allowedRoots = new Set(roots.map((r) => path.resolve(r)));
  }

  /** Ensure a resolved path falls within one of the allowed root directories. */
  private assertWithinAllowedRoot(targetPath: string): void {
    if (this.allowedRoots.size === 0) return; // no roots configured — skip validation
    const resolved = path.resolve(targetPath);
    for (const root of this.allowedRoots) {
      if (resolved === root || resolved.startsWith(root + '/')) return;
    }
    throw new Error(`Path is outside allowed project directories: ${targetPath}`);
  }

  async readFile(filePath: string): Promise<{ content: string; language: string }> {
    this.logger.debug('Reading file', { path: filePath });
    const content = await fsPromises.readFile(filePath, 'utf8');
    const language = detectLanguage(filePath);
    return { content, language };
  }

  async writeFile(filePath: string, content: string): Promise<{ success: boolean }> {
    this.logger.debug('Writing file', { path: filePath });
    await fsPromises.writeFile(filePath, content, 'utf8');
    return { success: true };
  }

  watchFile(filePath: string): { watching: boolean } {
    if (this.watchers.has(filePath)) {
      return { watching: true };
    }

    try {
      // Watch the PARENT DIRECTORY instead of the file itself.
      // On macOS, fs.watch on a file uses kqueue (inode-based). When tools
      // do atomic writes (write temp → rename), the inode changes and the
      // watcher silently dies. Directory watches use FSEvents (path-based)
      // which survive renames and are more reliable.
      const dirPath = path.dirname(filePath);
      const fileName = path.basename(filePath);
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const watcher = fs.watch(dirPath, (eventType, changedName) => {
        if (changedName !== fileName) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          // Verify file still exists before emitting (might have been deleted)
          fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) return;
            this.logger.debug('File changed', { path: filePath, eventType });
            this.callbacks.onChanged({ path: filePath });
          });
        }, 50);
      });

      watcher.on('error', (err) => {
        this.logger.error('File watcher error', { path: filePath, error: (err as Error).message });
        this.unwatchFile(filePath);
      });

      this.watchers.set(filePath, watcher);
      this.logger.debug('Watching file', { path: filePath });
      return { watching: true };
    } catch (err) {
      this.logger.error('Failed to watch file', { path: filePath, error: (err as Error).message });
      return { watching: false };
    }
  }

  unwatchFile(filePath: string): { success: boolean } {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
      this.logger.debug('Unwatched file', { path: filePath });
    }
    return { success: true };
  }

  async listDirectory(dirPath: string): Promise<{
    entries: Array<{
      name: string;
      path: string;
      type: 'file' | 'directory' | 'symlink';
      extension?: string;
      size?: number;
      modifiedTime: string;
      isHidden: boolean;
    }>;
  }> {
    this.logger.debug('Listing directory', { path: dirPath });
    const dirents = await fsPromises.readdir(dirPath, { withFileTypes: true });

    const entries = await Promise.all(
      dirents.map(async (dirent) => {
        const entryPath = path.join(dirPath, dirent.name);
        let type: 'file' | 'directory' | 'symlink' = 'file';
        if (dirent.isDirectory()) type = 'directory';
        else if (dirent.isSymbolicLink()) type = 'symlink';

        let size: number | undefined;
        let modifiedTime = '';
        try {
          const stats = await fsPromises.stat(entryPath);
          modifiedTime = stats.mtime.toISOString();
          if (type === 'file') size = stats.size;
          // Resolve symlink type
          if (type === 'symlink' && stats.isDirectory()) type = 'directory';
        } catch {
          modifiedTime = new Date().toISOString();
        }

        const extension = type === 'file' ? path.extname(dirent.name).toLowerCase() || undefined : undefined;
        const isHidden = dirent.name.startsWith('.');

        return { name: dirent.name, path: entryPath, type, extension, size, modifiedTime, isHidden };
      }),
    );

    // Sort: directories first (alpha), then files (alpha)
    entries.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    return { entries };
  }

  async createDirectory(dirPath: string): Promise<{ success: boolean }> {
    if (!path.isAbsolute(dirPath)) {
      throw new Error('Path must be absolute');
    }
    this.assertWithinAllowedRoot(dirPath);
    this.logger.debug('Creating directory', { path: dirPath });
    await fsPromises.mkdir(dirPath, { recursive: true });
    return { success: true };
  }

  async createFile(filePath: string): Promise<{ success: boolean }> {
    if (!path.isAbsolute(filePath)) {
      throw new Error('Path must be absolute');
    }
    this.assertWithinAllowedRoot(filePath);
    // Fail if file already exists
    try {
      await fsPromises.access(filePath);
      throw new Error('File already exists');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    this.logger.debug('Creating file', { path: filePath });
    await fsPromises.writeFile(filePath, '', 'utf8');
    return { success: true };
  }

  async rename(oldPath: string, newPath: string): Promise<{ success: boolean }> {
    if (!path.isAbsolute(oldPath) || !path.isAbsolute(newPath)) {
      throw new Error('Paths must be absolute');
    }
    this.assertWithinAllowedRoot(oldPath);
    this.assertWithinAllowedRoot(newPath);
    const oldDir = path.dirname(path.resolve(oldPath));
    const newDir = path.dirname(path.resolve(newPath));
    if (oldDir !== newDir) {
      throw new Error('Rename must stay within the same directory');
    }
    const newBasename = path.basename(newPath);
    if (newBasename.includes('\0')) {
      throw new Error('Name contains invalid characters');
    }
    this.logger.debug('Renaming', { oldPath, newPath });
    await fsPromises.rename(oldPath, newPath);
    return { success: true };
  }

  async deleteItem(itemPath: string): Promise<{ success: boolean }> {
    if (!path.isAbsolute(itemPath)) {
      throw new Error('Path must be absolute');
    }
    this.assertWithinAllowedRoot(itemPath);
    this.logger.debug('Deleting', { path: itemPath });
    const stat = await fsPromises.stat(itemPath);
    if (stat.isDirectory()) {
      await fsPromises.rm(itemPath, { recursive: true });
    } else {
      await fsPromises.unlink(itemPath);
    }
    return { success: true };
  }

  unwatchAll(): void {
    for (const [filePath, watcher] of this.watchers) {
      watcher.close();
      this.logger.debug('Unwatched file', { path: filePath });
    }
    this.watchers.clear();
  }
}

