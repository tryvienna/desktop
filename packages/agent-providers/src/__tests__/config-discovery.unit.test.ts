/**
 * config-discovery unit tests
 *
 * Tests the security boundary (isAllowedClaudePath) and path utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';

// Mock fs.realpath to avoid filesystem access in unit tests
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    // Default: realpath returns the input (no symlinks)
    realpath: vi.fn(async (p: string) => p),
    access: vi.fn(async () => { throw new Error('ENOENT'); }),
    stat: vi.fn(async () => { throw new Error('ENOENT'); }),
    readdir: vi.fn(async () => []),
  };
});

// Mock child_process to avoid git calls
vi.mock('node:child_process', () => ({
  execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null, result: { stdout: string }) => void) => {
    cb(new Error('not a git repo'), { stdout: '' });
  }),
}));

import { isAllowedClaudePath, listClaudeConfigDirectory } from '../claude-code/config-discovery';
import * as fsPromises from 'node:fs/promises';

const home = os.homedir();

describe('isAllowedClaudePath', () => {
  beforeEach(() => {
    vi.mocked(fsPromises.realpath).mockImplementation(async (p) => p as string);
  });

  it('allows paths under ~/.claude', async () => {
    expect(await isAllowedClaudePath(path.join(home, '.claude', 'settings.json'))).toBe(true);
    expect(await isAllowedClaudePath(path.join(home, '.claude', 'rules', 'foo.md'))).toBe(true);
  });

  it('allows project .claude paths', async () => {
    const projectDirs = ['/Users/test/project'];
    expect(await isAllowedClaudePath('/Users/test/project/.claude/settings.json', projectDirs)).toBe(true);
    expect(await isAllowedClaudePath('/Users/test/project/.claude/rules/custom.md', projectDirs)).toBe(true);
  });

  it('allows project CLAUDE.md', async () => {
    const projectDirs = ['/Users/test/project'];
    expect(await isAllowedClaudePath('/Users/test/project/CLAUDE.md', projectDirs)).toBe(true);
  });

  it('allows project .mcp.json', async () => {
    const projectDirs = ['/Users/test/project'];
    expect(await isAllowedClaudePath('/Users/test/project/.mcp.json', projectDirs)).toBe(true);
  });

  it('rejects paths outside allowed bases', async () => {
    expect(await isAllowedClaudePath('/etc/passwd')).toBe(false);
    expect(await isAllowedClaudePath('/tmp/evil.json')).toBe(false);
  });

  it('rejects path traversal attacks', async () => {
    expect(await isAllowedClaudePath(path.join(home, '.claude', '..', '..', 'etc', 'passwd'))).toBe(false);
  });

  it('rejects paths in non-project directories', async () => {
    const projectDirs = ['/Users/test/project'];
    expect(await isAllowedClaudePath('/Users/test/other-project/.claude/settings.json', projectDirs)).toBe(false);
  });

  it('rejects symlink escape when realpath differs', async () => {
    vi.mocked(fsPromises.realpath).mockResolvedValueOnce('/etc/shadow');
    const projectDirs = ['/Users/test/project'];
    expect(await isAllowedClaudePath('/Users/test/project/.claude/evil', projectDirs)).toBe(false);
  });

  it('allows new files when realpath throws ENOENT', async () => {
    vi.mocked(fsPromises.realpath).mockRejectedValueOnce(new Error('ENOENT'));
    expect(await isAllowedClaudePath(path.join(home, '.claude', 'new-file.json'))).toBe(true);
  });

  it('works with empty projectDirs', async () => {
    expect(await isAllowedClaudePath(path.join(home, '.claude', 'settings.json'), [])).toBe(true);
    expect(await isAllowedClaudePath('/some/random/path', [])).toBe(false);
  });
});

describe('listClaudeConfigDirectory', () => {
  it('returns empty for unauthorized paths', async () => {
    const result = await listClaudeConfigDirectory('/etc', []);
    expect(result.entries).toEqual([]);
  });
});
