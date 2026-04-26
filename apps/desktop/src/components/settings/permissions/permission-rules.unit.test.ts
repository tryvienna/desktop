import { describe, it, expect } from 'vitest';
import { computeUpdatedRules, ruleKey, cleanRule, type PermissionRuleConfig } from './permission-rules';

// Minimal constants mirroring the real ones — enough to exercise the logic.
const TEST_TOOLS = ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash', 'ExitPlanMode'] as const;

function allow(tool: string): PermissionRuleConfig {
  return { tool, behavior: 'allow' };
}

const TEST_PRESETS: Record<string, PermissionRuleConfig[]> = {
  restrictive: [],
  balanced: [allow('Read'), allow('Glob'), allow('Grep')],
  autonomous: [{ tool: '*', behavior: 'allow' }],
};

describe('ruleKey', () => {
  it('uses * as default entityType', () => {
    expect(ruleKey('Read')).toBe('Read:*');
  });

  it('includes entityType when provided', () => {
    expect(ruleKey('Read', 'project')).toBe('Read:project');
  });
});

describe('cleanRule', () => {
  it('strips null entityType', () => {
    expect(cleanRule({ tool: 'Read', behavior: 'allow', entityType: null }))
      .toEqual({ tool: 'Read', behavior: 'allow' });
  });

  it('defaults missing fields', () => {
    expect(cleanRule({ tool: null, behavior: null }))
      .toEqual({ tool: '', behavior: 'ask' });
  });
});

describe('computeUpdatedRules', () => {
  // ── Autonomous preset (wildcard) — the original bug ──────────────────

  it('sets a tool to ask when starting from autonomous preset', () => {
    const result = computeUpdatedRules(
      'autonomous', [], 'ExitPlanMode', 'ask',
      TEST_TOOLS, TEST_PRESETS,
    );

    // ExitPlanMode should NOT appear (ask = default = no rule)
    expect(result.find((r) => r.tool === 'ExitPlanMode')).toBeUndefined();

    // All other tools should still be allowed
    for (const tool of TEST_TOOLS) {
      if (tool === 'ExitPlanMode') continue;
      const rule = result.find((r) => r.tool === tool);
      expect(rule, `expected ${tool} to still be allowed`).toBeDefined();
      expect(rule!.behavior).toBe('allow');
    }

    // No wildcard should remain
    expect(result.find((r) => r.tool === '*')).toBeUndefined();
  });

  it('keeps everything allowed when toggling a tool to allow from autonomous', () => {
    const result = computeUpdatedRules(
      'autonomous', [], 'Bash', 'allow',
      TEST_TOOLS, TEST_PRESETS,
    );

    for (const tool of TEST_TOOLS) {
      const rule = result.find((r) => r.tool === tool);
      expect(rule, `expected ${tool} to be allowed`).toBeDefined();
      expect(rule!.behavior).toBe('allow');
    }
  });

  // ── Restrictive preset ───────────────────────────────────────────────

  it('adds a tool to allow from restrictive preset', () => {
    const result = computeUpdatedRules(
      'restrictive', [], 'Read', 'allow',
      TEST_TOOLS, TEST_PRESETS,
    );

    expect(result).toEqual([allow('Read')]);
  });

  it('does nothing when setting ask on already-ask tool from restrictive', () => {
    const result = computeUpdatedRules(
      'restrictive', [], 'Bash', 'ask',
      TEST_TOOLS, TEST_PRESETS,
    );

    expect(result).toEqual([]);
  });

  // ── Balanced preset ──────────────────────────────────────────────────

  it('removes a tool from balanced preset', () => {
    const result = computeUpdatedRules(
      'balanced', [], 'Read', 'ask',
      TEST_TOOLS, TEST_PRESETS,
    );

    expect(result.find((r) => r.tool === 'Read')).toBeUndefined();
    expect(result.find((r) => r.tool === 'Glob')?.behavior).toBe('allow');
    expect(result.find((r) => r.tool === 'Grep')?.behavior).toBe('allow');
  });

  // ── Custom preset ────────────────────────────────────────────────────

  it('adds a tool to an existing custom ruleset', () => {
    const existing = [allow('Read')];
    const result = computeUpdatedRules(
      'custom', existing, 'Bash', 'allow',
      TEST_TOOLS, TEST_PRESETS,
    );

    expect(result).toContainEqual(allow('Read'));
    expect(result).toContainEqual(allow('Bash'));
  });

  it('removes a tool from an existing custom ruleset', () => {
    const existing = [allow('Read'), allow('Bash')];
    const result = computeUpdatedRules(
      'custom', existing, 'Bash', 'ask',
      TEST_TOOLS, TEST_PRESETS,
    );

    expect(result).toEqual([allow('Read')]);
  });

  it('handles custom rules that include a wildcard', () => {
    const existing = [{ tool: '*', behavior: 'allow' as const }];
    const result = computeUpdatedRules(
      'custom', existing, 'Bash', 'ask',
      TEST_TOOLS, TEST_PRESETS,
    );

    expect(result.find((r) => r.tool === 'Bash')).toBeUndefined();
    expect(result.find((r) => r.tool === '*')).toBeUndefined();
    expect(result.find((r) => r.tool === 'Read')?.behavior).toBe('allow');
  });

  // ── entityType handling ──────────────────────────────────────────────

  it('preserves entityType when setting a scoped rule', () => {
    const result = computeUpdatedRules(
      'restrictive', [], 'Read', 'allow',
      TEST_TOOLS, TEST_PRESETS, 'project',
    );

    expect(result).toEqual([{ tool: 'Read', behavior: 'allow', entityType: 'project' }]);
  });
});
