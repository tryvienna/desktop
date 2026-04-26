/**
 * Path Utilities — Normalization and validation for directory paths.
 *
 * Used by WorkstreamDirectoryRepository and BranchSelectionRepository
 * to ensure consistent path storage.
 *
 * @module app-db/path-utils
 */

import { resolve } from 'path';

/**
 * Normalize a directory path for storage.
 * - Resolves to absolute path
 * - Removes trailing slash (except root '/')
 *
 * @throws {Error} If path is empty
 */
export function normalizeDirPath(path: string): string {
  if (!path || typeof path !== 'string' || !path.trim()) {
    throw new Error('Directory path must be a non-empty string');
  }

  const absolute = resolve(path.trim());

  // Remove trailing slash (except for root)
  if (absolute.length > 1 && absolute.endsWith('/')) {
    return absolute.slice(0, -1);
  }

  return absolute;
}
