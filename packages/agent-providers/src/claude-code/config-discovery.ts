/**
 * Claude Code Config Discovery — Discovers all Claude Code configuration
 * files and directories across enterprise, global, project, and local scopes.
 *
 * @ai-context
 * - Used by the claude-settings IPC domain to enumerate config files for the sidebar
 * - Checks file existence on disk via fs.stat
 * - Derives the Claude memory project key from git repo root path
 * - Enterprise paths are macOS-only (/Library/Application Support/ClaudeCode/) — intentionally not stubbed for Linux/Windows
 * - Global paths live under ~/.claude/
 * - Project paths are per-directory (.claude/, CLAUDE.md, .mcp.json)
 * - Local paths are gitignored variants (.claude/settings.local.json)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type ClaudeConfigScope = 'enterprise' | 'global' | 'project' | 'local';

export type ClaudeConfigCategory =
  | 'instructions'
  | 'settings'
  | 'rules'
  | 'skills'
  | 'agents'
  | 'commands'
  | 'memory'
  | 'mcp'
  | 'plans';

export interface ClaudeConfigFile {
  path: string;
  scope: ClaudeConfigScope;
  category: ClaudeConfigCategory;
  label: string;
  exists: boolean;
  isDirectory: boolean;
  /** For project/local scope, which directory this belongs to */
  sourceDirectory?: string;
}

export interface ClaudeConfigDiscoveryResult {
  files: ClaudeConfigFile[];
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isDir(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get the git repository root for a directory, or null if not a git repo.
 */
async function getGitRoot(dir: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
      cwd: dir,
      timeout: 5000,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Derive the Claude memory project key from a filesystem path.
 * Claude Code strips the leading `/` then replaces remaining `/` with `-`.
 */
export function deriveProjectKey(repoRoot: string): string {
  return repoRoot.replace(/^\//, '').replace(/\//g, '-');
}

interface ConfigCandidate {
  relativePath: string;
  scope: ClaudeConfigScope;
  category: ClaudeConfigCategory;
  label: string;
  isDirectory: boolean;
}

const ENTERPRISE_BASE = '/Library/Application Support/ClaudeCode';
const ENTERPRISE_CANDIDATES: ConfigCandidate[] = [
  { relativePath: 'managed-settings.json', scope: 'enterprise', category: 'settings', label: 'managed-settings.json', isDirectory: false },
  { relativePath: 'CLAUDE.md', scope: 'enterprise', category: 'instructions', label: 'CLAUDE.md', isDirectory: false },
  { relativePath: 'managed-mcp.json', scope: 'enterprise', category: 'mcp', label: 'managed-mcp.json', isDirectory: false },
];

function getGlobalCandidates(home: string): ConfigCandidate[] {
  const claudeDir = path.join(home, '.claude');
  return [
    { relativePath: path.join(claudeDir, 'settings.json'), scope: 'global', category: 'settings', label: 'settings.json', isDirectory: false },
    { relativePath: path.join(claudeDir, 'CLAUDE.md'), scope: 'global', category: 'instructions', label: 'CLAUDE.md', isDirectory: false },
    { relativePath: path.join(claudeDir, 'rules'), scope: 'global', category: 'rules', label: 'rules/', isDirectory: true },
    { relativePath: path.join(claudeDir, 'skills'), scope: 'global', category: 'skills', label: 'skills/', isDirectory: true },
    { relativePath: path.join(claudeDir, 'agents'), scope: 'global', category: 'agents', label: 'agents/', isDirectory: true },
    { relativePath: path.join(claudeDir, 'commands'), scope: 'global', category: 'commands', label: 'commands/', isDirectory: true },
    { relativePath: path.join(claudeDir, 'plans'), scope: 'global', category: 'plans', label: 'plans/', isDirectory: true },
    { relativePath: path.join(home, '.claude.json'), scope: 'global', category: 'settings', label: '.claude.json', isDirectory: false },
  ];
}

function getProjectCandidates(dir: string): ConfigCandidate[] {
  return [
    { relativePath: path.join(dir, 'CLAUDE.md'), scope: 'project', category: 'instructions', label: 'CLAUDE.md', isDirectory: false },
    { relativePath: path.join(dir, '.claude', 'CLAUDE.md'), scope: 'project', category: 'instructions', label: '.claude/CLAUDE.md', isDirectory: false },
    { relativePath: path.join(dir, '.claude', 'settings.json'), scope: 'project', category: 'settings', label: '.claude/settings.json', isDirectory: false },
    { relativePath: path.join(dir, '.claude', 'rules'), scope: 'project', category: 'rules', label: '.claude/rules/', isDirectory: true },
    { relativePath: path.join(dir, '.claude', 'skills'), scope: 'project', category: 'skills', label: '.claude/skills/', isDirectory: true },
    { relativePath: path.join(dir, '.claude', 'agents'), scope: 'project', category: 'agents', label: '.claude/agents/', isDirectory: true },
    { relativePath: path.join(dir, '.claude', 'commands'), scope: 'project', category: 'commands', label: '.claude/commands/', isDirectory: true },
    { relativePath: path.join(dir, '.mcp.json'), scope: 'project', category: 'mcp', label: '.mcp.json', isDirectory: false },
  ];
}

function getLocalCandidates(dir: string): ConfigCandidate[] {
  return [
    { relativePath: path.join(dir, '.claude', 'settings.local.json'), scope: 'local', category: 'settings', label: '.claude/settings.local.json', isDirectory: false },
  ];
}

/**
 * Discover all Claude Code configuration files for the given directories.
 * Returns both existing and non-existing files so the UI can offer creation.
 */
export async function discoverClaudeConfig(
  directories: string[],
): Promise<ClaudeConfigDiscoveryResult> {
  const home = os.homedir();
  const files: ClaudeConfigFile[] = [];

  // Enterprise scope (macOS only)
  if (process.platform === 'darwin') {
    const checks = ENTERPRISE_CANDIDATES.map(async (c) => {
      const fullPath = path.join(ENTERPRISE_BASE, c.relativePath);
      return {
        path: fullPath,
        scope: c.scope,
        category: c.category,
        label: c.label,
        exists: await exists(fullPath),
        isDirectory: c.isDirectory,
      } satisfies ClaudeConfigFile;
    });
    files.push(...await Promise.all(checks));
  }

  // Global scope
  const globalCandidates = getGlobalCandidates(home);
  const globalChecks = globalCandidates.map(async (c) => ({
    path: c.relativePath,
    scope: c.scope,
    category: c.category,
    label: c.label,
    exists: await exists(c.relativePath),
    isDirectory: c.isDirectory,
  } satisfies ClaudeConfigFile));
  files.push(...await Promise.all(globalChecks));

  // Memory directories (global scope, but per-directory based on git root)
  const gitRoots = await Promise.all(directories.map((dir) => getGitRoot(dir)));
  const seenGitRoots = new Set<string>();
  const memoryChecks: Promise<ClaudeConfigFile>[] = [];
  for (let i = 0; i < directories.length; i++) {
    const gitRoot = gitRoots[i];
    if (gitRoot && !seenGitRoots.has(gitRoot)) {
      seenGitRoots.add(gitRoot);
      const projectKey = deriveProjectKey(gitRoot);
      const memoryPath = path.join(home, '.claude', 'projects', projectKey, 'memory');
      memoryChecks.push(
        exists(memoryPath).then((e) => ({
          path: memoryPath,
          scope: 'global' as const,
          category: 'memory' as const,
          label: `memory/ (${path.basename(gitRoot)})`,
          exists: e,
          isDirectory: true,
        })),
      );
    }
  }
  files.push(...await Promise.all(memoryChecks));

  // Project + Local scope (per directory)
  for (const dir of directories) {
    const projectCandidates = getProjectCandidates(dir);
    const localCandidates = getLocalCandidates(dir);
    const allCandidates = [...projectCandidates, ...localCandidates];

    const checks = allCandidates.map(async (c) => ({
      path: c.relativePath,
      scope: c.scope,
      category: c.category,
      label: c.label,
      exists: await exists(c.relativePath),
      isDirectory: c.isDirectory,
      sourceDirectory: dir,
    } satisfies ClaudeConfigFile));
    files.push(...await Promise.all(checks));
  }

  return { files };
}

/**
 * Validate that a resolved path is under an allowed Claude config directory.
 * Prevents path traversal attacks from the renderer.
 * Uses realpath to resolve symlinks and prevent symlink escape attacks.
 */
export async function isAllowedClaudePath(targetPath: string, projectDirs: string[] = []): Promise<boolean> {
  // Resolve the path logically first
  const resolved = path.resolve(targetPath);
  const home = os.homedir();
  const bases = [
    path.join(home, '.claude'),
    ENTERPRISE_BASE,
    // Project-level .claude dirs and root-level config files
    ...projectDirs.flatMap((dir) => [
      path.join(dir, '.claude'),
      path.join(dir, 'CLAUDE.md'),
      path.join(dir, '.mcp.json'),
    ]),
  ];

  // Check logical path first
  const logicalMatch = bases.some((base) => resolved === base || resolved.startsWith(base + '/'));
  if (!logicalMatch) return false;

  // For existing paths, also verify realpath to prevent symlink escape
  try {
    const realResolved = await fs.realpath(resolved);
    return bases.some((base) => realResolved === base || realResolved.startsWith(base + '/'));
  } catch {
    // Path doesn't exist yet (e.g. creating a new file) — logical check is sufficient
    return true;
  }
}

/**
 * List the contents of a Claude config directory (rules/, skills/, etc.)
 * Validates the path is under an allowed Claude config base.
 */
export async function listClaudeConfigDirectory(
  dirPath: string,
  projectDirs: string[] = [],
): Promise<{ entries: Array<{ name: string; path: string; type: 'file' | 'directory' }> }> {
  if (!await isAllowedClaudePath(dirPath, projectDirs)) {
    return { entries: [] };
  }

  try {
    const dirExists = await isDir(dirPath);
    if (!dirExists) return { entries: [] };

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return {
      entries: entries
        .filter((e) => !e.name.startsWith('.'))
        .map((e) => ({
          name: e.name,
          path: path.join(dirPath, e.name),
          type: (e.isDirectory() ? 'directory' : 'file') as 'file' | 'directory',
        }))
        .sort((a, b) => {
          // Directories first, then alphabetical
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
    };
  } catch {
    return { entries: [] };
  }
}
