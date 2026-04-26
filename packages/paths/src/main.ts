/**
 * Main Process Paths
 *
 * Creates the ViennaPaths object from a base directory and profile directory.
 * All paths are computed eagerly (they are just string joins, no I/O).
 *
 * This module uses node:path and is intended for the Electron main process.
 * The renderer should receive specific path strings via IPC if needed.
 */

import path from 'node:path';
import type { CreatePathsOptions, LogPaths, ViennaPaths } from './index';

export type { CreatePathsOptions, LogPaths, ViennaPaths };

// ---------------------------------------------------------------------------
// Internal builders
// ---------------------------------------------------------------------------

function createLogPaths(profileDir: string): LogPaths {
  const dir = path.join(profileDir, 'logs');

  return {
    dir,
    session: (sessionId: string) => path.join(dir, sessionId),
    sessionLog: (sessionId: string) => path.join(dir, sessionId, 'vienna.log'),
    currentSession: path.join(dir, 'current-session'),
  };
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Create a ViennaPaths instance from a base directory and profile directory.
 *
 * @example
 * ```ts
 * import { createPaths } from '@vienna/paths/main';
 *
 * const paths = createPaths({
 *   baseDir: app.getPath('userData'),
 *   profileDir: '/path/to/profiles/anon-abc123',
 * });
 * paths.appDb           // /path/to/profiles/anon-abc123/app.db
 * paths.logs.dir        // /path/to/profiles/anon-abc123/logs
 * ```
 */
export function createPaths(options: CreatePathsOptions): ViennaPaths {
  const { baseDir, profileDir } = options;

  return {
    baseDir,
    profileDir,
    appDb: path.join(profileDir, 'app.db'),
    agentDb: path.join(profileDir, 'agent.db'),
    settings: path.join(profileDir, 'settings.json'),
    keybindings: path.join(profileDir, 'keybindings.json'),
    secureStorage: path.join(profileDir, 'secure-storage'),
    registryCache: path.join(profileDir, 'registry-cache'),
    skills: path.join(profileDir, 'skills'),
    plugins: path.join(profileDir, 'plugins'),
    tags: path.join(profileDir, 'tags.json'),
    projects: path.join(profileDir, 'projects'),
    logs: createLogPaths(profileDir),
    whisperModels: path.join(baseDir, 'whisper-models'),
  };
}
