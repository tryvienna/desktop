/**
 * File IPC Handlers — Main-process implementation.
 *
 * Delegates all methods to FileService.
 * Only import this from the main process.
 */

import type { ApiHandlers } from '@vienna/ipc';
import type { FileService } from '../../main/file/FileService';
import type { fileApi } from './contract';

export function createFileHandlers(fileService: FileService): ApiHandlers<typeof fileApi> {
  return {
    file: {
      read: async ({ path }) => fileService.readFile(path),

      write: async ({ path, content }) => fileService.writeFile(path, content),

      watch: async ({ path }) => fileService.watchFile(path),

      unwatch: async ({ path }) => fileService.unwatchFile(path),

      listDirectory: async ({ path }) => fileService.listDirectory(path),

      createDirectory: async ({ path }) => fileService.createDirectory(path),

      createFile: async ({ path }) => fileService.createFile(path),

      rename: async ({ oldPath, newPath }) => fileService.rename(oldPath, newPath),

      deleteItem: async ({ path }) => fileService.deleteItem(path),
    },
  };
}
