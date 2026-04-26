/**
 * PermissionEngine unit tests
 *
 * Tests the full permission evaluation pipeline: trusted tools,
 * rule matching, specificity scoring, path extraction, and directory matching.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { PermissionCheckRequest, PermissionRule } from '@vienna/agent-core';
import { PermissionEngine } from '../engine';
import {
  extractPath,
  matchesDirectory,
  computeSpecificity,
  ruleMatches,
  isTrustedTool,
} from '../rules';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<PermissionCheckRequest> = {}): PermissionCheckRequest {
  return {
    toolName: 'Read',
    input: { file_path: '/src/index.ts' },
    sessionId: 'session-1',
    providerId: 'claude-code',
    ...overrides,
  };
}

function makeRule(overrides: Partial<PermissionRule> = {}): PermissionRule {
  return {
    toolName: 'Read',
    behavior: 'allow',
    scope: 'session',
    sessionId: 'session-1',
    directoryPattern: null,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// extractPath
// ─────────────────────────────────────────────────────────────────────────────

describe('extractPath', () => {
  it('extracts file_path field', () => {
    expect(extractPath('Read', { file_path: '/src/index.ts' })).toBe('/src/index.ts');
  });

  it('extracts path field', () => {
    expect(extractPath('Glob', { path: '/src', pattern: '**/*.ts' })).toBe('/src');
  });

  it('extracts directory field', () => {
    expect(extractPath('Glob', { directory: '/lib' })).toBe('/lib');
  });

  it('extracts notebook_path field', () => {
    expect(extractPath('NotebookEdit', { notebook_path: '/work/notebook.ipynb' })).toBe(
      '/work/notebook.ipynb'
    );
  });

  it('returns cwd for Bash tool', () => {
    expect(extractPath('Bash', { command: 'ls -la' }, '/home/user')).toBe('/home/user');
  });

  it('returns null for Bash without cwd', () => {
    expect(extractPath('Bash', { command: 'ls' })).toBeNull();
  });

  it('returns null when no path field found', () => {
    expect(extractPath('WebSearch', { query: 'test' })).toBeNull();
  });

  it('prioritizes file_path over path', () => {
    expect(extractPath('Read', { file_path: '/a.ts', path: '/b.ts' })).toBe('/a.ts');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// matchesDirectory
// ─────────────────────────────────────────────────────────────────────────────

describe('matchesDirectory', () => {
  it('exact match', () => {
    expect(matchesDirectory('/src', '/src')).toBe(true);
  });

  it('prefix match with child path', () => {
    expect(matchesDirectory('/src/index.ts', '/src')).toBe(true);
  });

  it('prefix match with deeper path', () => {
    expect(matchesDirectory('/src/lib/utils.ts', '/src')).toBe(true);
  });

  it('does not match partial directory names', () => {
    expect(matchesDirectory('/src-backup/file.ts', '/src')).toBe(false);
  });

  it('handles trailing slash in pattern', () => {
    expect(matchesDirectory('/src/index.ts', '/src/')).toBe(true);
  });

  it('glob pattern with **', () => {
    expect(matchesDirectory('/src/lib/deep/file.ts', '/src/**')).toBe(true);
  });

  it('glob pattern with *', () => {
    expect(matchesDirectory('/src/index.ts', '/src/*.ts')).toBe(true);
    expect(matchesDirectory('/src/index.js', '/src/*.ts')).toBe(false);
  });

  it('glob pattern with ?', () => {
    expect(matchesDirectory('/src/a.ts', '/src/?.ts')).toBe(true);
    expect(matchesDirectory('/src/ab.ts', '/src/?.ts')).toBe(false);
  });

  it('glob pattern with braces', () => {
    expect(matchesDirectory('/src/index.ts', '/src/*.{ts,tsx}')).toBe(true);
    expect(matchesDirectory('/src/index.tsx', '/src/*.{ts,tsx}')).toBe(true);
    expect(matchesDirectory('/src/index.js', '/src/*.{ts,tsx}')).toBe(false);
  });

  it('handles dot files with glob', () => {
    expect(matchesDirectory('/src/.env', '/src/*')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeSpecificity
// ─────────────────────────────────────────────────────────────────────────────

describe('computeSpecificity', () => {
  it('base score is 0 for wildcard allow', () => {
    expect(computeSpecificity(makeRule({ toolName: '*', behavior: 'allow' }))).toBe(0);
  });

  it('specific tool adds 1', () => {
    expect(computeSpecificity(makeRule({ toolName: 'Read', behavior: 'allow' }))).toBe(1);
  });

  it('deny adds 0.5', () => {
    expect(computeSpecificity(makeRule({ toolName: '*', behavior: 'deny' }))).toBe(0.5);
  });

  it('directory pattern adds 10', () => {
    expect(computeSpecificity(makeRule({ directoryPattern: '/src', behavior: 'allow' }))).toBe(11); // 10 (dir) + 1 (specific tool)
  });

  it('directory + deny is highest', () => {
    expect(computeSpecificity(makeRule({ directoryPattern: '/src', behavior: 'deny' }))).toBe(11.5); // 10 + 1 + 0.5
  });

  it('deny beats allow at same specificity', () => {
    const allow = computeSpecificity(makeRule({ behavior: 'allow' }));
    const deny = computeSpecificity(makeRule({ behavior: 'deny' }));
    expect(deny).toBeGreaterThan(allow);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ruleMatches
// ─────────────────────────────────────────────────────────────────────────────

describe('ruleMatches', () => {
  it('matches exact tool name', () => {
    expect(ruleMatches(makeRule({ toolName: 'Read' }), 'Read', null, 'claude-code')).toBe(true);
  });

  it('matches wildcard tool name', () => {
    expect(ruleMatches(makeRule({ toolName: '*' }), 'Read', null, 'claude-code')).toBe(true);
  });

  it('rejects wrong tool name', () => {
    expect(ruleMatches(makeRule({ toolName: 'Write' }), 'Read', null, 'claude-code')).toBe(false);
  });

  it('matches when no directory pattern and no path', () => {
    expect(
      ruleMatches(
        makeRule({ toolName: 'Read', directoryPattern: null }),
        'Read',
        null,
        'claude-code'
      )
    ).toBe(true);
  });

  it('matches directory pattern', () => {
    expect(
      ruleMatches(
        makeRule({ toolName: 'Read', directoryPattern: '/src' }),
        'Read',
        '/src/index.ts',
        'claude-code'
      )
    ).toBe(true);
  });

  it('rejects non-matching directory', () => {
    expect(
      ruleMatches(
        makeRule({ toolName: 'Read', directoryPattern: '/src' }),
        'Read',
        '/lib/index.ts',
        'claude-code'
      )
    ).toBe(false);
  });

  it('rejects directory rule when no path available', () => {
    expect(
      ruleMatches(
        makeRule({ toolName: 'Read', directoryPattern: '/src' }),
        'Read',
        null,
        'claude-code'
      )
    ).toBe(false);
  });

  it('matches any provider when rule has no providerId', () => {
    expect(ruleMatches(makeRule({ providerId: null }), 'Read', null, 'codex-cli')).toBe(true);
  });

  it('matches specific provider', () => {
    expect(ruleMatches(makeRule({ providerId: 'claude-code' }), 'Read', null, 'claude-code')).toBe(
      true
    );
  });

  it('rejects wrong provider', () => {
    expect(ruleMatches(makeRule({ providerId: 'claude-code' }), 'Read', null, 'codex-cli')).toBe(
      false
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isTrustedTool
// ─────────────────────────────────────────────────────────────────────────────

describe('isTrustedTool', () => {
  it('direct match', () => {
    const trusted = new Set(['Read', 'Glob']);
    expect(isTrustedTool(trusted, 'Read', {})).toBe(true);
    expect(isTrustedTool(trusted, 'Write', {})).toBe(false);
  });

  it('prefix wildcard match', () => {
    const trusted = new Set(['mcp__vienna__*']);
    expect(isTrustedTool(trusted, 'mcp__vienna__read_docs', {})).toBe(true);
    expect(isTrustedTool(trusted, 'mcp__github__issues', {})).toBe(false);
  });

  it('Bash command pattern', () => {
    const trusted = new Set(['Bash(ls:*)', 'Bash(cat:*)']);
    expect(isTrustedTool(trusted, 'Bash', { command: 'ls -la' })).toBe(true);
    expect(isTrustedTool(trusted, 'Bash', { command: 'cat /etc/passwd' })).toBe(true);
    expect(isTrustedTool(trusted, 'Bash', { command: 'rm -rf /' })).toBe(false);
  });

  it('Bash pattern ignores pipes and chains', () => {
    const trusted = new Set(['Bash(ls:*)']);
    expect(isTrustedTool(trusted, 'Bash', { command: 'ls | grep test' })).toBe(true);
    expect(isTrustedTool(trusted, 'Bash', { command: 'ls && rm file' })).toBe(true);
  });

  it('returns false for empty trusted set', () => {
    expect(isTrustedTool(new Set(), 'Read', {})).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PermissionEngine
// ─────────────────────────────────────────────────────────────────────────────

describe('PermissionEngine', () => {
  let engine: PermissionEngine;

  beforeEach(() => {
    engine = new PermissionEngine();
  });

  describe('no rules', () => {
    it('returns no_match when no rules exist', () => {
      const result = engine.check(makeRequest());
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('no_match');
      expect(result.matchedRule).toBeNull();
    });
  });

  describe('trusted tools', () => {
    it('bypasses all rules for trusted tools', () => {
      engine.addTrustedTool('Read');
      engine.denyTool('Read', 'session', 'session-1'); // Even with a deny rule

      const result = engine.check(makeRequest({ toolName: 'Read' }));
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('rule_match');
    });

    it('prefix wildcard for MCP tools', () => {
      engine.addTrustedTools(['mcp__vienna__*']);

      const result = engine.check(makeRequest({ toolName: 'mcp__vienna__read_docs', input: {} }));
      expect(result.allowed).toBe(true);
    });

    it('removeTrustedTool works', () => {
      engine.addTrustedTool('Read');
      engine.removeTrustedTool('Read');

      const result = engine.check(makeRequest());
      expect(result.reason).toBe('no_match');
    });

    it('clearTrustedTools works', () => {
      engine.addTrustedTools(['Read', 'Write', 'Bash']);
      engine.clearTrustedTools();
      expect(engine.getTrustedTools().size).toBe(0);
    });
  });

  describe('simple allow/deny', () => {
    it('allows when matching allow rule exists', () => {
      engine.allowTool('Read', 'session', 'session-1');

      const result = engine.check(makeRequest());
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('rule_match');
      expect(result.matchedRule?.toolName).toBe('Read');
    });

    it('denies when matching deny rule exists', () => {
      engine.denyTool('Read', 'session', 'session-1');

      const result = engine.check(makeRequest());
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('rule_match');
      expect(result.matchedRule?.behavior).toBe('deny');
    });

    it('session rule only matches its session', () => {
      engine.allowTool('Read', 'session', 'session-1');

      const result = engine.check(makeRequest({ sessionId: 'session-2' }));
      expect(result.reason).toBe('no_match');
    });

    it('persistent rule matches all sessions', () => {
      engine.allowTool('Read', 'persistent', null);

      const result1 = engine.check(makeRequest({ sessionId: 'session-1' }));
      const result2 = engine.check(makeRequest({ sessionId: 'session-2' }));
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('directory-scoped rules', () => {
    it('allows tool in specified directory', () => {
      engine.allowToolInDirectories('Read', ['/src'], 'session', 'session-1');

      const result = engine.check(makeRequest({ input: { file_path: '/src/index.ts' } }));
      expect(result.allowed).toBe(true);
    });

    it('denies tool outside directory scope', () => {
      engine.allowToolInDirectories('Read', ['/src'], 'session', 'session-1');

      const result = engine.check(makeRequest({ input: { file_path: '/etc/passwd' } }));
      expect(result.reason).toBe('no_match');
    });

    it('multiple directories create multiple rules', () => {
      engine.allowToolInDirectories('Read', ['/src', '/lib'], 'session', 'session-1');

      const r1 = engine.check(makeRequest({ input: { file_path: '/src/a.ts' } }));
      const r2 = engine.check(makeRequest({ input: { file_path: '/lib/b.ts' } }));
      const r3 = engine.check(makeRequest({ input: { file_path: '/etc/c.ts' } }));

      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
      expect(r3.reason).toBe('no_match');
    });
  });

  describe('specificity-based precedence', () => {
    it('directory-scoped deny overrides global allow', () => {
      engine.allowTool('Read', 'session', 'session-1'); // specificity: 1
      engine.addRule(
        makeRule({
          toolName: 'Read',
          behavior: 'deny',
          directoryPattern: '/secret',
        })
      ); // specificity: 11.5

      // /src/a.ts → allow (global rule, no directory deny match)
      const r1 = engine.check(makeRequest({ input: { file_path: '/src/a.ts' } }));
      expect(r1.allowed).toBe(true);

      // /secret/key.pem → deny (directory deny is more specific)
      const r2 = engine.check(makeRequest({ input: { file_path: '/secret/key.pem' } }));
      expect(r2.allowed).toBe(false);
    });

    it('directory-scoped allow overrides global deny', () => {
      engine.denyTool('Write', 'session', 'session-1'); // specificity: 1.5
      engine.addRule(
        makeRule({
          toolName: 'Write',
          behavior: 'allow',
          directoryPattern: '/tmp',
        })
      ); // specificity: 11

      const result = engine.check(
        makeRequest({ toolName: 'Write', input: { file_path: '/tmp/test.txt' } })
      );
      expect(result.allowed).toBe(true);
    });

    it('deny wins over allow at same specificity', () => {
      engine.allowTool('Bash', 'session', 'session-1'); // specificity: 1
      engine.denyTool('Bash', 'session', 'session-1'); // specificity: 1.5

      const result = engine.check(
        makeRequest({ toolName: 'Bash', input: { command: 'ls' }, cwd: '/tmp' })
      );
      expect(result.allowed).toBe(false);
    });

    it('specific tool beats wildcard', () => {
      engine.addRule(makeRule({ toolName: '*', behavior: 'deny' })); // specificity: 0.5
      engine.allowTool('Read', 'session', 'session-1'); // specificity: 1

      const result = engine.check(makeRequest());
      expect(result.allowed).toBe(true);
    });
  });

  describe('Bash with cwd', () => {
    it('matches Bash rules using cwd', () => {
      engine.allowToolInDirectories('Bash', ['/home/user/project'], 'session', 'session-1');

      const result = engine.check(
        makeRequest({
          toolName: 'Bash',
          input: { command: 'npm install' },
          cwd: '/home/user/project',
        })
      );
      expect(result.allowed).toBe(true);
    });

    it('denies Bash outside allowed cwd', () => {
      engine.allowToolInDirectories('Bash', ['/home/user/project'], 'session', 'session-1');

      const result = engine.check(
        makeRequest({
          toolName: 'Bash',
          input: { command: 'npm install' },
          cwd: '/etc',
        })
      );
      expect(result.reason).toBe('no_match');
    });
  });

  describe('provider-specific rules', () => {
    it('provider-specific rule matches correct provider', () => {
      engine.addRule(makeRule({ providerId: 'claude-code' }));

      const result = engine.check(makeRequest({ providerId: 'claude-code' }));
      expect(result.allowed).toBe(true);
    });

    it('provider-specific rule does not match other providers', () => {
      engine.addRule(makeRule({ providerId: 'claude-code' }));

      const result = engine.check(makeRequest({ providerId: 'codex-cli' }));
      expect(result.reason).toBe('no_match');
    });

    it('provider-agnostic rule matches all providers', () => {
      engine.addRule(makeRule({ providerId: null }));

      const r1 = engine.check(makeRequest({ providerId: 'claude-code' }));
      const r2 = engine.check(makeRequest({ providerId: 'codex-cli' }));
      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
    });
  });

  describe('rule management', () => {
    it('loadRules replaces all rules', () => {
      engine.allowTool('Read', 'session', 'session-1');
      engine.loadRules([makeRule({ toolName: 'Write' })]);

      expect(engine.getRules()).toHaveLength(1);
      expect(engine.getRules()[0].toolName).toBe('Write');
    });

    it('clearSessionRules removes only session rules for that session', () => {
      engine.allowTool('Read', 'session', 'session-1');
      engine.allowTool('Write', 'session', 'session-2');
      engine.allowTool('Bash', 'persistent', null);

      engine.clearSessionRules('session-1');

      const rules = engine.getRules();
      expect(rules).toHaveLength(2);
      expect(rules.map((r) => r.toolName).sort()).toEqual(['Bash', 'Write']);
    });

    it('clearAllRules removes everything', () => {
      engine.allowTool('Read', 'session', 'session-1');
      engine.allowTool('Write', 'persistent', null);
      engine.clearAllRules();
      expect(engine.getRules()).toHaveLength(0);
    });

    it('removeRules by criteria', () => {
      engine.allowTool('Read', 'session', 'session-1');
      engine.denyTool('Read', 'session', 'session-1');
      engine.allowTool('Write', 'session', 'session-1');

      const removed = engine.removeRules({ toolName: 'Read' });
      expect(removed).toBe(2);
      expect(engine.getRules()).toHaveLength(1);
      expect(engine.getRules()[0].toolName).toBe('Write');
    });

    it('removeRules by behavior', () => {
      engine.allowTool('Read', 'session', 'session-1');
      engine.denyTool('Write', 'session', 'session-1');
      engine.allowTool('Bash', 'session', 'session-1');

      const removed = engine.removeRules({ behavior: 'allow' });
      expect(removed).toBe(2);
      expect(engine.getRules()).toHaveLength(1);
      expect(engine.getRules()[0].behavior).toBe('deny');
    });
  });

  describe('complex scenarios', () => {
    it('auto-allow file tools in project directories', () => {
      // Simulates the DirectoryManager auto-allow pattern
      const dirs = ['/Users/will/project', '/Users/will/libs'];
      for (const tool of ['Read', 'Write', 'Edit']) {
        engine.allowToolInDirectories(tool, dirs, 'session', 'session-1');
      }

      // Project file → allowed
      expect(
        engine.check(
          makeRequest({
            toolName: 'Read',
            input: { file_path: '/Users/will/project/src/index.ts' },
          })
        ).allowed
      ).toBe(true);

      // Libs file → allowed
      expect(
        engine.check(
          makeRequest({
            toolName: 'Write',
            input: { file_path: '/Users/will/libs/util.ts' },
          })
        ).allowed
      ).toBe(true);

      // System file → not allowed
      expect(
        engine.check(
          makeRequest({
            toolName: 'Read',
            input: { file_path: '/etc/passwd' },
          })
        ).reason
      ).toBe('no_match');

      // Unrelated tool → not allowed
      expect(
        engine.check(
          makeRequest({
            toolName: 'Bash',
            input: { command: 'ls' },
            cwd: '/Users/will/project',
          })
        ).reason
      ).toBe('no_match');
    });

    it('layered rules: global deny + directory allow + secret deny', () => {
      // Layer 1: Deny Write globally
      engine.denyTool('Write', 'session', 'session-1');

      // Layer 2: Allow Write in /project
      engine.addRule(
        makeRule({ toolName: 'Write', behavior: 'allow', directoryPattern: '/project' })
      );

      // Layer 3: Deny Write in /project/secrets (more specific path)
      engine.addRule(
        makeRule({ toolName: 'Write', behavior: 'deny', directoryPattern: '/project/secrets' })
      );

      // /project/src/main.ts → Both dir rules match, both have specificity ~11
      // But /project is not as specific as /project/secrets for the secrets path
      const r1 = engine.check(
        makeRequest({ toolName: 'Write', input: { file_path: '/project/src/main.ts' } })
      );
      expect(r1.allowed).toBe(true); // directory allow beats global deny

      // /project/secrets/key.pem → Both directory rules match
      // Both have same specificity (11 for allow, 11.5 for deny)
      // deny wins due to +0.5 tie-breaker
      const r2 = engine.check(
        makeRequest({ toolName: 'Write', input: { file_path: '/project/secrets/key.pem' } })
      );
      expect(r2.allowed).toBe(false);

      // /etc/config → Only global deny matches
      const r3 = engine.check(
        makeRequest({ toolName: 'Write', input: { file_path: '/etc/config' } })
      );
      expect(r3.allowed).toBe(false);
    });

    it('MCP tools trusted by prefix', () => {
      engine.addTrustedTools(['mcp__vienna__*']);
      engine.denyTool('*', 'session', 'session-1'); // Global deny

      // Vienna MCP → trusted, bypasses deny
      expect(
        engine.check(
          makeRequest({ toolName: 'mcp__vienna__entity_search', input: { query: 'test' } })
        ).allowed
      ).toBe(true);

      // Non-vienna MCP → hits global deny
      expect(
        engine.check(makeRequest({ toolName: 'mcp__github__issues', input: {} })).allowed
      ).toBe(false);
    });
  });
});
