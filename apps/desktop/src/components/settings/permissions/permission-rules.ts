/**
 * Pure helpers for computing permission rule changes.
 *
 * Extracted from hooks.ts so the logic can be unit-tested
 * without React or GraphQL dependencies.
 *
 * These functions are dependency-free — tool lists and presets are
 * passed in as arguments so this module does not import constants.tsx
 * (which pulls in lucide-react / React).
 */

export interface PermissionRuleConfig {
  tool: string;
  behavior: 'allow' | 'ask';
  entityType?: string;
}

export type PermissionPreset = 'restrictive' | 'balanced' | 'autonomous' | 'custom';

export function ruleKey(tool: string, entityType?: string | null): string {
  return `${tool}:${entityType ?? '*'}`;
}

/** Strip __typename and null optional fields so rules can be used as mutation input. */
export function cleanRule(r: { tool?: string | null; behavior?: string | null; entityType?: string | null }): PermissionRuleConfig {
  return {
    tool: r.tool ?? '',
    behavior: (r.behavior as 'allow' | 'ask') ?? 'ask',
    ...(r.entityType ? { entityType: r.entityType } : {}),
  };
}

/**
 * Compute the new rules array after toggling a single tool's permission.
 *
 * This handles wildcard expansion: if the current rules contain a wildcard
 * `{ tool: '*', behavior }`, it is expanded into per-tool rules first so
 * that individual tools can be overridden.
 */
export function computeUpdatedRules(
  activePreset: PermissionPreset,
  currentCustomRules: PermissionRuleConfig[],
  tool: string,
  behavior: 'allow' | 'ask',
  allTools: readonly string[],
  builtInPresets: Record<string, PermissionRuleConfig[]>,
  entityType?: string,
): PermissionRuleConfig[] {
  let rules: PermissionRuleConfig[] = activePreset === 'custom'
    ? currentCustomRules.map(cleanRule)
    : [...(builtInPresets[activePreset] ?? [])];

  // Expand wildcard rules into per-tool rules so individual tools can be toggled off.
  const wildcardIndex = rules.findIndex((r) => r.tool === '*');
  if (wildcardIndex >= 0) {
    const wildcardBehavior = rules[wildcardIndex].behavior;
    rules.splice(wildcardIndex, 1);
    for (const t of allTools) {
      if (!rules.some((r) => ruleKey(r.tool, r.entityType) === ruleKey(t))) {
        rules.push({ tool: t, behavior: wildcardBehavior });
      }
    }
  }

  const key = ruleKey(tool, entityType);
  const existingIndex = rules.findIndex(
    (r) => ruleKey(r.tool, r.entityType) === key,
  );

  const newRule: PermissionRuleConfig = {
    tool,
    behavior,
    ...(entityType && { entityType }),
  };

  if (existingIndex >= 0) {
    if (behavior === 'ask') {
      rules.splice(existingIndex, 1);
    } else {
      rules[existingIndex] = newRule;
    }
  } else if (behavior === 'allow') {
    rules.push(newRule);
  }

  return rules;
}

/**
 * Compute the new rules array after toggling multiple tools at once.
 * Same as computeUpdatedRules but applies all changes in a single pass.
 */
export function computeBatchUpdatedRules(
  activePreset: PermissionPreset,
  currentCustomRules: PermissionRuleConfig[],
  toolChanges: Array<{ tool: string; behavior: 'allow' | 'ask'; entityType?: string }>,
  allTools: readonly string[],
  builtInPresets: Record<string, PermissionRuleConfig[]>,
): PermissionRuleConfig[] {
  let rules: PermissionRuleConfig[] = activePreset === 'custom'
    ? currentCustomRules.map(cleanRule)
    : [...(builtInPresets[activePreset] ?? [])];

  // Expand wildcard rules into per-tool rules so individual tools can be toggled off.
  const wildcardIndex = rules.findIndex((r) => r.tool === '*');
  if (wildcardIndex >= 0) {
    const wildcardBehavior = rules[wildcardIndex].behavior;
    rules.splice(wildcardIndex, 1);
    for (const t of allTools) {
      if (!rules.some((r) => ruleKey(r.tool, r.entityType) === ruleKey(t))) {
        rules.push({ tool: t, behavior: wildcardBehavior });
      }
    }
  }

  for (const change of toolChanges) {
    const key = ruleKey(change.tool, change.entityType);
    const existingIndex = rules.findIndex(
      (r) => ruleKey(r.tool, r.entityType) === key,
    );

    const newRule: PermissionRuleConfig = {
      tool: change.tool,
      behavior: change.behavior,
      ...(change.entityType && { entityType: change.entityType }),
    };

    if (existingIndex >= 0) {
      if (change.behavior === 'ask') {
        rules.splice(existingIndex, 1);
      } else {
        rules[existingIndex] = newRule;
      }
    } else if (change.behavior === 'allow') {
      rules.push(newRule);
    }
  }

  return rules;
}
