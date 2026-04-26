/**
 * rules.ts — pure-function tests for the permission rule matching logic.
 *
 * This is a security-critical module. Tests cover:
 * - Path extraction across tool types (Bash, file tools, other)
 * - Directory matching with globs, exact paths, prefixes
 * - Rule specificity scoring (directory > tool specificity > deny-preference)
 * - Rule-level matching (tool + provider + directory combined)
 * - Trusted tool bypass (direct, prefix, Bash-command pattern)
 */

import { describe, it, expect } from 'vitest';
import {
  extractPath,
  matchesDirectory,
  computeSpecificity,
  ruleMatches,
  isTrustedTool,
} from '../rules';
import type { PermissionRule } from '@vienna/agent-core';

function rule(overrides: Partial<PermissionRule> = {}): PermissionRule {
  return {
    toolName: '*',
    behavior: 'allow',
    scope: 'session',
    sessionId: null,
    directoryPattern: null,
    providerId: null,
    createdAt: 0,
    ...overrides,
  };
}

describe('extractPath', () => {
  it('returns cwd for Bash', () => {
    expect(extractPath('Bash', { command: 'ls' }, '/tmp')).toBe('/tmp');
  });

  it('returns null for Bash without cwd', () => {
    expect(extractPath('Bash', { command: 'ls' })).toBeNull();
  });

  it('extracts file_path for file tools', () => {
    expect(extractPath('Read', { file_path: '/src/index.ts' })).toBe('/src/index.ts');
    expect(extractPath('Write', { file_path: '/a.ts', content: 'x' })).toBe('/a.ts');
  });

  it('falls back to `path`, `directory`, `notebook_path` in order', () => {
    expect(extractPath('Glob', { path: '/repo' })).toBe('/repo');
    expect(extractPath('LS', { directory: '/dir' })).toBe('/dir');
    expect(extractPath('NotebookRead', { notebook_path: '/nb.ipynb' })).toBe('/nb.ipynb');
  });

  it('returns null when no path field present', () => {
    expect(extractPath('WebFetch', { url: 'https://example.com' })).toBeNull();
  });

  it('ignores empty string paths', () => {
    expect(extractPath('Read', { file_path: '' })).toBeNull();
  });

  it('ignores non-string path values', () => {
    expect(extractPath('Read', { file_path: 123 })).toBeNull();
    expect(extractPath('Read', { file_path: null })).toBeNull();
  });
});

describe('matchesDirectory', () => {
  describe('glob patterns', () => {
    it('matches ** anywhere', () => {
      expect(matchesDirectory('/src/foo/bar.ts', '/src/**')).toBe(true);
    });

    it('matches * single segment', () => {
      expect(matchesDirectory('/src/foo.ts', '/src/*')).toBe(true);
      expect(matchesDirectory('/src/foo/bar.ts', '/src/*')).toBe(false);
    });

    it('matches ? single char', () => {
      expect(matchesDirectory('/src/a.ts', '/src/?.ts')).toBe(true);
      expect(matchesDirectory('/src/ab.ts', '/src/?.ts')).toBe(false);
    });

    it('matches brace expansion', () => {
      expect(matchesDirectory('/src/foo.ts', '/src/{foo,bar}.ts')).toBe(true);
      expect(matchesDirectory('/src/bar.ts', '/src/{foo,bar}.ts')).toBe(true);
      expect(matchesDirectory('/src/baz.ts', '/src/{foo,bar}.ts')).toBe(false);
    });

    it('respects dot files via { dot: true }', () => {
      expect(matchesDirectory('/src/.env', '/src/**')).toBe(true);
    });
  });

  describe('prefix matching', () => {
    it('matches exact path', () => {
      expect(matchesDirectory('/Users/alice/project', '/Users/alice/project')).toBe(true);
    });

    it('matches children', () => {
      expect(matchesDirectory('/Users/alice/project/src/a.ts', '/Users/alice/project')).toBe(true);
    });

    it('does not match siblings', () => {
      expect(matchesDirectory('/Users/alice/project-other', '/Users/alice/project')).toBe(false);
    });

    it('normalizes trailing slash in pattern', () => {
      expect(matchesDirectory('/src/a.ts', '/src/')).toBe(true);
    });

    it('does not match parent when path is shorter', () => {
      expect(matchesDirectory('/Users', '/Users/alice')).toBe(false);
    });
  });
});

describe('computeSpecificity', () => {
  it('gives base score 0 for a wildcard-tool allow rule', () => {
    expect(computeSpecificity(rule())).toBe(0);
  });

  it('adds 10 for directory constraint', () => {
    expect(computeSpecificity(rule({ directoryPattern: '/src' }))).toBe(10);
  });

  it('adds 1 for specific tool name', () => {
    expect(computeSpecificity(rule({ toolName: 'Read' }))).toBe(1);
  });

  it('adds 0.5 for deny behavior (tie-breaker)', () => {
    expect(computeSpecificity(rule({ behavior: 'deny' }))).toBe(0.5);
  });

  it('combines all criteria (deny > allow at same scope)', () => {
    const allowRule = rule({
      toolName: 'Read',
      directoryPattern: '/src',
      behavior: 'allow',
    });
    const denyRule = rule({
      toolName: 'Read',
      directoryPattern: '/src',
      behavior: 'deny',
    });
    expect(computeSpecificity(allowRule)).toBe(11);
    expect(computeSpecificity(denyRule)).toBe(11.5);
    expect(computeSpecificity(denyRule)).toBeGreaterThan(computeSpecificity(allowRule));
  });
});

describe('ruleMatches', () => {
  it('matches a wildcard rule to anything', () => {
    expect(ruleMatches(rule(), 'Read', '/any/path', 'claude-code')).toBe(true);
  });

  it('matches a specific tool name', () => {
    expect(ruleMatches(rule({ toolName: 'Read' }), 'Read', null, 'claude-code')).toBe(true);
  });

  it('does not match a different tool name', () => {
    expect(ruleMatches(rule({ toolName: 'Read' }), 'Write', null, 'claude-code')).toBe(false);
  });

  it('enforces provider when specified', () => {
    const r = rule({ providerId: 'claude-code' });
    expect(ruleMatches(r, 'Read', null, 'claude-code')).toBe(true);
    expect(ruleMatches(r, 'Read', null, 'codex-cli')).toBe(false);
  });

  it('is provider-agnostic when providerId is null', () => {
    const r = rule({ providerId: null });
    expect(ruleMatches(r, 'Read', null, 'any-provider')).toBe(true);
  });

  it('requires matching directory when rule has one', () => {
    const r = rule({ directoryPattern: '/src' });
    expect(ruleMatches(r, 'Read', '/src/a.ts', 'claude-code')).toBe(true);
    expect(ruleMatches(r, 'Read', '/etc/passwd', 'claude-code')).toBe(false);
  });

  it('fails directory-scoped rule when path is null', () => {
    const r = rule({ directoryPattern: '/src' });
    expect(ruleMatches(r, 'Read', null, 'claude-code')).toBe(false);
  });

  it('skips directory check when pattern is null', () => {
    const r = rule({ directoryPattern: null });
    expect(ruleMatches(r, 'Read', null, 'claude-code')).toBe(true);
  });
});

describe('isTrustedTool', () => {
  it('direct match', () => {
    const trusted = new Set(['Read']);
    expect(isTrustedTool(trusted, 'Read', {})).toBe(true);
    expect(isTrustedTool(trusted, 'Write', {})).toBe(false);
  });

  it('prefix wildcard matches', () => {
    const trusted = new Set(['mcp__vienna__*']);
    expect(isTrustedTool(trusted, 'mcp__vienna__read_docs', {})).toBe(true);
    expect(isTrustedTool(trusted, 'mcp__vienna__search', {})).toBe(true);
    expect(isTrustedTool(trusted, 'mcp__other__read_docs', {})).toBe(false);
  });

  it('bash command pattern: Bash(ls:*)', () => {
    const trusted = new Set(['Bash(ls:*)']);
    expect(isTrustedTool(trusted, 'Bash', { command: 'ls -la' })).toBe(true);
    expect(isTrustedTool(trusted, 'Bash', { command: 'rm -rf /' })).toBe(false);
  });

  it('bash command pattern splits on spaces, pipes, ampersands, semicolons', () => {
    const trusted = new Set(['Bash(ls:*)']);
    expect(isTrustedTool(trusted, 'Bash', { command: 'ls|grep foo' })).toBe(true);
    expect(isTrustedTool(trusted, 'Bash', { command: 'ls;rm -rf /' })).toBe(true);
    expect(isTrustedTool(trusted, 'Bash', { command: 'ls&cat' })).toBe(true);
    expect(isTrustedTool(trusted, 'Bash', { command: 'ls&&cat' })).toBe(true);
  });

  it('bash pattern does not match when command is not a string', () => {
    const trusted = new Set(['Bash(ls:*)']);
    expect(isTrustedTool(trusted, 'Bash', { command: 123 })).toBe(false);
    expect(isTrustedTool(trusted, 'Bash', {})).toBe(false);
  });

  it('bash pattern does not match other tools', () => {
    const trusted = new Set(['Bash(ls:*)']);
    expect(isTrustedTool(trusted, 'Read', { command: 'ls' })).toBe(false);
  });

  it('empty trusted set never matches', () => {
    const trusted = new Set<string>();
    expect(isTrustedTool(trusted, 'Read', {})).toBe(false);
    expect(isTrustedTool(trusted, 'Bash', { command: 'ls' })).toBe(false);
  });
});
