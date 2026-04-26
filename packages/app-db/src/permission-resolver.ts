/**
 * Permission Resolver — Cascade resolution across scopes.
 *
 * Merges permission rules from global settings through scoped
 * overrides (project → group → workstream). More specific scopes
 * override less specific ones for the same tool+entity key.
 *
 * @module app-db/permission-resolver
 */

import type { PermissionsSettings, PermissionRuleConfig, PermissionPolicyRecord } from './schemas';
import { BUILT_IN_PRESETS } from './permission-constants';

/**
 * Build a unique key for a permission rule.
 * Rules with the same key are considered to be for the same "slot" —
 * a more specific scope's rule replaces a less specific one.
 */
function ruleKey(rule: PermissionRuleConfig): string {
  const entity = rule.entityType ?? '*';
  return `${rule.tool}:${entity}`;
}

/**
 * Resolve effective permissions by merging global defaults with scoped overrides.
 *
 * @param globalSettings  Global permission settings from settings.json
 * @param scopeOverrides  Scoped overrides ordered from least to most specific
 *                        (e.g. project → group → workstream)
 * @returns Flat array of resolved permission rules
 */
export function resolvePermissions(
  globalSettings: PermissionsSettings,
  scopeOverrides: PermissionPolicyRecord[],
): PermissionRuleConfig[] {
  // Step 1: Expand global preset into base rules
  const baseRules = globalSettings.activePreset === 'custom'
    ? globalSettings.rules
    : BUILT_IN_PRESETS[globalSettings.activePreset] ?? [];

  // Step 2: Build map from base rules
  const ruleMap = new Map<string, PermissionRuleConfig>();
  for (const rule of baseRules) {
    ruleMap.set(ruleKey(rule), rule);
  }

  // Step 3: Apply each scope override in order (more specific wins)
  for (const policy of scopeOverrides) {
    for (const rule of policy.rules) {
      ruleMap.set(ruleKey(rule), rule);
    }
  }

  return [...ruleMap.values()];
}
