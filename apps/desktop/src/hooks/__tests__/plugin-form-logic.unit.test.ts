/**
 * Plugin Form Logic Unit Tests
 *
 * Tests the pure logic used by useNewPluginForm:
 * - expandTilde with IPC-resolved home directory
 * - command building for vcli scaffold
 * - form definition validation (kebab-case, canvas normalization)
 * - Browse value interception
 *
 * These tests verify the core logic independent of React hooks and IPC.
 */

import { describe, it, expect } from 'vitest';

// ─── Extracted pure functions (same logic as in useNewPluginForm) ────────────

const KEBAB_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const BROWSE_VALUE = '__browse__';

function expandTilde(p: string, home: string): string {
  if (!p.startsWith('~') || !home) return p;
  return p.replace(/^~/, home);
}

function normalizeCanvases(raw: string): string {
  return (raw || 'sidebar').split(', ').join(',');
}

function buildScaffoldArgs(params: {
  name: string;
  auth: string;
  canvases: string;
  description: string;
  directory: string;
  entities: string;
}): string[] {
  const args = [
    'plugin', 'scaffold',
    `--name=${params.name}`,
    `--auth=${params.auth}`,
    `--canvas=${params.canvases}`,
    `--description=${JSON.stringify(params.description)}`,
    `--output=${params.directory}`,
  ];
  if (params.entities) {
    args.push(`--entity=${params.entities}`);
  }
  return args;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('expandTilde', () => {
  it('expands ~ at the start of a path', () => {
    expect(expandTilde('~/Documents', '/Users/will')).toBe('/Users/will/Documents');
  });

  it('expands ~/nested/path correctly', () => {
    expect(expandTilde('~/a/b/c', '/home/user')).toBe('/home/user/a/b/c');
  });

  it('does not expand ~ in the middle of a path', () => {
    expect(expandTilde('/some/~/path', '/Users/will')).toBe('/some/~/path');
  });

  it('returns path unchanged when it does not start with ~', () => {
    expect(expandTilde('/absolute/path', '/Users/will')).toBe('/absolute/path');
  });

  it('returns path unchanged when home is empty', () => {
    expect(expandTilde('~/Documents', '')).toBe('~/Documents');
  });

  it('handles bare ~ (just home directory)', () => {
    expect(expandTilde('~', '/Users/will')).toBe('/Users/will');
  });
});

describe('KEBAB_PATTERN validation', () => {
  it('accepts valid kebab-case names', () => {
    expect(KEBAB_PATTERN.test('my-plugin')).toBe(true);
    expect(KEBAB_PATTERN.test('slack-notifier')).toBe(true);
    expect(KEBAB_PATTERN.test('a')).toBe(true);
    expect(KEBAB_PATTERN.test('weather-dashboard')).toBe(true);
    expect(KEBAB_PATTERN.test('plugin123')).toBe(true);
    expect(KEBAB_PATTERN.test('my-cool-plugin')).toBe(true);
  });

  it('rejects invalid names', () => {
    expect(KEBAB_PATTERN.test('MyPlugin')).toBe(false);
    expect(KEBAB_PATTERN.test('my plugin')).toBe(false);
    expect(KEBAB_PATTERN.test('my_plugin')).toBe(false);
    expect(KEBAB_PATTERN.test('-leading-dash')).toBe(false);
    expect(KEBAB_PATTERN.test('trailing-')).toBe(false);
    expect(KEBAB_PATTERN.test('ALLCAPS')).toBe(false);
    expect(KEBAB_PATTERN.test('123-starts-with-number')).toBe(false);
    expect(KEBAB_PATTERN.test('')).toBe(false);
    expect(KEBAB_PATTERN.test('Hacker News')).toBe(false);
  });
});

describe('normalizeCanvases', () => {
  it('normalizes multi-select format to comma-separated (no spaces)', () => {
    expect(normalizeCanvases('sidebar, menu-bar')).toBe('sidebar,menu-bar');
  });

  it('handles single value', () => {
    expect(normalizeCanvases('sidebar')).toBe('sidebar');
  });

  it('defaults to sidebar when empty', () => {
    expect(normalizeCanvases('')).toBe('sidebar');
  });

  it('handles three values', () => {
    expect(normalizeCanvases('sidebar, menu-bar, feed')).toBe('sidebar,menu-bar,feed');
  });
});

describe('buildScaffoldArgs', () => {
  it('builds correct args for a basic plugin', () => {
    const args = buildScaffoldArgs({
      name: 'my-plugin',
      auth: 'none',
      canvases: 'sidebar,menu-bar',
      description: 'A test plugin',
      directory: '/Users/will/Documents/dev/plugins',
      entities: '',
    });

    expect(args).toContain('plugin');
    expect(args).toContain('scaffold');
    expect(args).toContain('--name=my-plugin');
    expect(args).toContain('--auth=none');
    expect(args).toContain('--canvas=sidebar,menu-bar');
    expect(args).toContain('--output=/Users/will/Documents/dev/plugins');
    // --auto-load is NOT included — handled separately via loadLocalPlugin IPC
    expect(args.some(a => a === '--auto-load')).toBe(false);
    // No --entity when empty
    expect(args.some(a => a.startsWith('--entity='))).toBe(false);
  });

  it('includes --entity when entities are provided', () => {
    const args = buildScaffoldArgs({
      name: 'issue-tracker',
      auth: 'oauth',
      canvases: 'sidebar',
      description: 'Tracks issues',
      directory: '/tmp/plugins',
      entities: 'issue,comment',
    });

    expect(args).toContain('--entity=issue,comment');
  });

  it('JSON-stringifies the description for shell safety', () => {
    const args = buildScaffoldArgs({
      name: 'test',
      auth: 'none',
      canvases: 'sidebar',
      description: 'A plugin with "quotes" and special chars',
      directory: '/tmp',
      entities: '',
    });

    const descArg = args.find(a => a.startsWith('--description='));
    expect(descArg).toBeDefined();
    // Should be JSON-stringified (wrapped in quotes)
    expect(descArg).toContain('"A plugin with \\"quotes\\" and special chars"');
  });
});

describe('BROWSE_VALUE handling', () => {
  it('identifies the browse sentinel value', () => {
    expect(BROWSE_VALUE).toBe('__browse__');
    expect('__browse__' === BROWSE_VALUE).toBe(true);
    expect('/some/path' === BROWSE_VALUE).toBe(false);
  });
});

describe('end-to-end command construction', () => {
  it('constructs correct pnpm exec command with expanded tilde', () => {
    const home = '/Users/will';
    const directory = expandTilde('~/Documents/dev/plugins', home);
    const canvases = normalizeCanvases('sidebar, menu-bar');
    const args = buildScaffoldArgs({
      name: 'hacker-news',
      auth: 'none',
      canvases,
      description: 'Shows HN stories',
      directory,
      entities: '',
    });

    const registryRoot = '/Users/will/Documents/dev/registry';
    const command = `pnpm exec vcli ${args.join(' ')}`;
    const cwd = registryRoot;

    expect(cwd).toBe('/Users/will/Documents/dev/registry');
    expect(command).toContain('--output=/Users/will/Documents/dev/plugins');
    expect(command).not.toContain('~');
    expect(command).toContain('--canvas=sidebar,menu-bar');
    expect(command).toContain('--name=hacker-news');
  });

  it('constructs correct npx fallback command when no registry', () => {
    const home = '/Users/will';
    const directory = '/tmp/my-plugin';
    const args = buildScaffoldArgs({
      name: 'test-plugin',
      auth: 'api-key',
      canvases: 'sidebar',
      description: 'Test',
      directory,
      entities: 'task,note',
    });

    const command = `npx @tryvienna/cli ${args.join(' ')}`;
    const cwd = home; // fallback uses resolved home, not '~'

    expect(cwd).toBe('/Users/will');
    expect(command).toContain('npx @tryvienna/cli');
    expect(command).toContain('--entity=task,note');
    expect(command).toContain('--auth=api-key');
  });

  it('properly handles directory with trailing slash', () => {
    let directory = '/Users/will/Documents/dev/plugins/';
    // Strip trailing slash
    if (directory.endsWith('/') && directory.length > 1) {
      directory = directory.slice(0, -1);
    }
    const pluginDir = `${directory}/my-plugin`;
    expect(pluginDir).toBe('/Users/will/Documents/dev/plugins/my-plugin');
  });
});
