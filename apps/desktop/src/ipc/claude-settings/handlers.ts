/**
 * Claude Settings IPC Handlers — Main-process implementation.
 *
 * Delegates to config-discovery functions from @vienna/agent-providers.
 * Only import this from the main process.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ApiHandlers } from '@vienna/ipc';
import type { AppDb } from '@vienna/app-db';
import { discoverClaudeConfig, listClaudeConfigDirectory, isAllowedClaudePath } from '@vienna/agent-providers';
import type { Logger } from '@vienna/logger';
import type { claudeSettingsApi } from './contract';

/** Default content for newly created config files */
function getDefaultContent(filePath: string): string {
  const basename = path.basename(filePath);
  if (basename.endsWith('.json')) return '{}';
  if (basename === 'CLAUDE.md') return '';
  return '';
}

/** Get all known project directory paths from the database */
function getProjectDirs(db: AppDb): string[] {
  const projects = db.projects.listAll();
  const dirs: string[] = [];
  for (const p of projects) {
    const projectDirs = db.projectDirectories.getByProject(p.id);
    for (const d of projectDirs) dirs.push(d.path);
  }
  return dirs;
}

export interface ClaudeSettingsHandlersDeps {
  db: AppDb;
  logger: Logger;
}

export function createClaudeSettingsHandlers(deps: ClaudeSettingsHandlersDeps): ApiHandlers<typeof claudeSettingsApi> {
  const logger = deps.logger.child({ service: 'claude-settings' });
  return {
    claudeSettings: {
      discover: async ({ directories }) => {
        // Only allow discovery of known project directories
        const projectDirs = getProjectDirs(deps.db);
        const allowed = directories.filter((d) => projectDirs.includes(d));
        return discoverClaudeConfig(allowed);
      },

      listDirectory: async ({ path: dirPath }) => {
        const projectDirs = getProjectDirs(deps.db);
        return listClaudeConfigDirectory(dirPath, projectDirs);
      },

      create: async ({ path: filePath, isDirectory }) => {
        const projectDirs = getProjectDirs(deps.db);
        if (!await isAllowedClaudePath(filePath, projectDirs)) {
          logger.warn('Blocked create for unauthorized path', { path: filePath });
          return { success: false };
        }

        if (isDirectory) {
          await fs.mkdir(filePath, { recursive: true });
        } else {
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, getDefaultContent(filePath), 'utf-8');
        }
        return { success: true };
      },

      readFile: async ({ path: filePath }) => {
        const projectDirs = getProjectDirs(deps.db);
        if (!await isAllowedClaudePath(filePath, projectDirs)) {
          logger.warn('Blocked read for unauthorized path', { path: filePath });
          throw new Error('Path not allowed');
        }
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return { content };
        } catch (err) {
          if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
            return { content: '{}' };
          }
          throw err;
        }
      },

      writeFile: async ({ path: filePath, content }) => {
        const projectDirs = getProjectDirs(deps.db);
        if (!await isAllowedClaudePath(filePath, projectDirs)) {
          logger.warn('Blocked write for unauthorized path', { path: filePath });
          return { success: false };
        }
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
      },
    },
  };
}
