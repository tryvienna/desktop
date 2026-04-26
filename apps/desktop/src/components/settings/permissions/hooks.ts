/**
 * Permission Settings Hooks — Read and write permission settings via GraphQL.
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@vienna/graphql/client';
import { GET_SETTINGS, UPDATE_PERMISSIONS_SETTINGS, GET_ENTITY_MUTATION_CATALOG } from '@vienna/graphql/client';
import { BUILT_IN_PRESETS, ALL_STATIC_TOOLS } from './constants';
import { ENTITY_MUTATION_PREFIX } from './EntityActionsGroup';
import { ruleKey, cleanRule, computeUpdatedRules, computeBatchUpdatedRules } from './permission-rules';
import type { PermissionRuleConfig, PermissionPreset } from './permission-rules';

export function usePermissions() {
  const { data, loading } = useQuery(GET_SETTINGS);
  const { data: catalogData } = useQuery(GET_ENTITY_MUTATION_CATALOG);
  const [updatePermissions] = useMutation(UPDATE_PERMISSIONS_SETTINGS);

  // Build list of all tools including dynamically discovered entity mutations
  const allTools = useMemo(() => {
    const mutationTools = (catalogData?.entityMutationCatalog ?? []).flatMap((g) =>
      g.mutations.map((m) => `${ENTITY_MUTATION_PREFIX}${m.name}`),
    );
    return [...ALL_STATIC_TOOLS, ...mutationTools];
  }, [catalogData]);

  const permissions = data?.settings?.permissions;
  const activePreset = (permissions?.activePreset ?? 'balanced') as PermissionPreset;

  // Build the effective rules map from the active preset or custom rules
  const rulesMap = useMemo(() => {
    const map = new Map<string, PermissionRuleConfig>();
    if (!permissions) return map;

    const rules = activePreset === 'custom'
      ? (permissions.rules ?? [])
      : BUILT_IN_PRESETS[activePreset] ?? [];

    for (const rule of rules) {
      const cleaned = cleanRule(rule);
      map.set(ruleKey(cleaned.tool, cleaned.entityType), cleaned);
    }
    return map;
  }, [permissions, activePreset]);

  const getPermission = useCallback(
    (tool: string, entityType?: string): 'allow' | 'ask' => {
      // Check for exact match first
      const exact = rulesMap.get(ruleKey(tool, entityType));
      if (exact) return exact.behavior;

      // Check for wildcard match
      const wildcard = rulesMap.get(ruleKey('*'));
      if (wildcard) return wildcard.behavior;

      return 'ask';
    },
    [rulesMap],
  );

  const setPermission = useCallback(
    (tool: string, behavior: 'allow' | 'ask', entityType?: string) => {
      const newRules = computeUpdatedRules(
        activePreset,
        permissions?.rules ?? [],
        tool,
        behavior,
        allTools,
        BUILT_IN_PRESETS,
        entityType,
      );

      updatePermissions({
        variables: {
          input: {
            activePreset: 'custom',
            rules: newRules,
          },
        },
      });
    },
    [permissions, activePreset, updatePermissions, allTools],
  );

  const setBatchPermissions = useCallback(
    (changes: Array<{ tool: string; behavior: 'allow' | 'ask'; entityType?: string }>) => {
      const newRules = computeBatchUpdatedRules(
        activePreset,
        permissions?.rules ?? [],
        changes,
        allTools,
        BUILT_IN_PRESETS,
      );

      updatePermissions({
        variables: {
          input: {
            activePreset: 'custom',
            rules: newRules,
          },
        },
      });
    },
    [permissions, activePreset, updatePermissions, allTools],
  );

  const applyPreset = useCallback(
    (presetId: PermissionPreset) => {
      updatePermissions({
        variables: {
          input: {
            activePreset: presetId,
            rules: BUILT_IN_PRESETS[presetId] ?? [],
          },
        },
      });
    },
    [updatePermissions],
  );

  const resetAll = useCallback(() => {
    applyPreset('restrictive');
  }, [applyPreset]);

  // Count how many tools are allowed vs total
  const counts = useMemo(() => {
    const total = allTools.length;
    let allowed = 0;
    for (const tool of allTools) {
      if (getPermission(tool) === 'allow') allowed++;
    }
    return { total, allowed };
  }, [getPermission, allTools]);

  return {
    loading,
    activePreset,
    getPermission,
    setPermission,
    setBatchPermissions,
    applyPreset,
    resetAll,
    counts,
  };
}
