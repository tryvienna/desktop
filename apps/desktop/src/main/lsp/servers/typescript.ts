/**
 * TypeScript Language Server Configuration
 *
 * Provides configuration for typescript-language-server (wraps tsserver).
 * Resolves the server binary from local node_modules, global PATH, or npx.
 *
 * @module main/lsp/servers/typescript
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getEnrichedEnv } from '@vienna/shell-env';
import type { Logger } from '@vienna/logger';
import type { LspServerConfig } from '../LspServerInstance';

// ---------------------------------------------------------------------------
// Server Configuration
// ---------------------------------------------------------------------------

export function getTypeScriptServerConfig(projectRoot: string, logger: Logger): LspServerConfig {
  logger.debug('Getting TypeScript server config', { projectRoot });

  const tsLspPath = findTypeScriptLanguageServer(projectRoot);
  const tsVersion = getTypeScriptVersion(projectRoot);
  logger.debug('TypeScript version detected', { version: tsVersion ?? 'not found' });

  if (tsLspPath) {
    logger.debug('Found typescript-language-server', { path: tsLspPath });
    return {
      command: tsLspPath,
      args: ['--stdio'],
      cwd: projectRoot,
      env: { TSC_NONPOLLING_WATCHER: 'true' },
    };
  }

  logger.debug('typescript-language-server not found locally, using npx');
  return {
    command: 'npx',
    args: ['typescript-language-server', '--stdio'],
    cwd: projectRoot,
    env: { TSC_NONPOLLING_WATCHER: 'true' },
  };
}

// ---------------------------------------------------------------------------
// Path Resolution
// ---------------------------------------------------------------------------

function findTypeScriptLanguageServer(projectRoot: string): string | null {
  const localPath = path.join(projectRoot, 'node_modules', '.bin', 'typescript-language-server');
  if (fs.existsSync(localPath)) return localPath;

  try {
    const globalPath = execSync('which typescript-language-server', {
      encoding: 'utf8',
      timeout: 3000,
      env: getEnrichedEnv(),
    }).trim();
    if (globalPath && fs.existsSync(globalPath)) return globalPath;
  } catch {
    // Not found in PATH
  }

  return null;
}

function findTypeScriptPath(projectRoot: string): string | null {
  const localTs = path.join(projectRoot, 'node_modules', 'typescript');
  if (fs.existsSync(path.join(localTs, 'lib', 'tsserver.js'))) return localTs;

  let currentDir = projectRoot;
  for (let i = 0; i < 5; i++) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;

    const parentTs = path.join(parentDir, 'node_modules', 'typescript');
    if (fs.existsSync(path.join(parentTs, 'lib', 'tsserver.js'))) return parentTs;
    currentDir = parentDir;
  }

  return null;
}

function getTypeScriptVersion(projectRoot: string): string | null {
  const tsPath = findTypeScriptPath(projectRoot);
  if (!tsPath) return null;

  try {
    const packageJsonPath = path.join(tsPath, 'package.json');
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Language Detection
// ---------------------------------------------------------------------------

export const TYPESCRIPT_LANGUAGE_IDS = [
  'typescript',
  'typescriptreact',
  'javascript',
  'javascriptreact',
] as const;

export type TypeScriptLanguageId = (typeof TYPESCRIPT_LANGUAGE_IDS)[number];

export function isTypeScriptLanguage(languageId: string): languageId is TypeScriptLanguageId {
  return (TYPESCRIPT_LANGUAGE_IDS as readonly string[]).includes(languageId);
}

export const TYPESCRIPT_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
] as const;
