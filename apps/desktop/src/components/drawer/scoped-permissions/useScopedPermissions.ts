/**
 * useScopedPermissions — Read and write scoped permission overrides via GraphQL.
 *
 * Fetches the resolved parent permissions (from all scopes above the current one)
 * and the scope-specific policy overrides. Shows inherited vs overridden state.
 *
 * For a workstream: parent = global → project → group
 * For a group: parent = global → project
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@vienna/graphql/client';
import {
  GET_PERMISSION_POLICY,
  GET_RESOLVED_PARENT_PERMISSIONS,
  SET_PERMISSION_POLICY,
  DELETE_PERMISSION_POLICY,
  GET_ENTITY_MUTATION_CATALOG,
} from '@vienna/graphql/client';
import { ALL_STATIC_TOOLS } from '../../settings/permissions/constants';
import { ENTITY_MUTATION_PREFIX } from '../../settings/permissions/EntityActionsGroup';

interface PermissionRuleConfig {
  tool: string;
  behavior: 'allow' | 'ask';
  entityType?: string;
}

function ruleKey(tool: string, entityType?: string | null): string {
  return `${tool}:${entityType ?? '*'}`;
}

function cleanRule(r: { tool?: string | null; behavior?: string | null; entityType?: string | null }): PermissionRuleConfig {
  return {
    tool: r.tool ?? '',
    behavior: (r.behavior as 'allow' | 'ask') ?? 'ask',
    ...(r.entityType ? { entityType: r.entityType } : {}),
  };
}

export interface ToolPermissionState {
  behavior: 'allow' | 'ask';
  inherited: boolean; // true = from parent chain, false = overridden at this scope
  inheritedBehavior: 'allow' | 'ask'; // what the parent chain resolves to
}

export function useScopedPermissions(scopeType: 'workstream' | 'group' | 'project', scopeId: string | null) {
  // Fetch entity mutations for dynamic tool list
  const { data: catalogData } = useQuery(GET_ENTITY_MUTATION_CATALOG);
  const allTools = useMemo(() => {
    const mutationTools = (catalogData?.entityMutationCatalog ?? []).flatMap((g) =>
      g.mutations.map((m) => `${ENTITY_MUTATION_PREFIX}${m.name}`),
    );
    return [...ALL_STATIC_TOOLS, ...mutationTools];
  }, [catalogData]);

  // Fetch resolved permissions from all parent scopes (e.g. global → project → group for a workstream)
  const { data: parentData, loading: parentLoading } = useQuery(GET_RESOLVED_PARENT_PERMISSIONS, {
    variables: { scopeType: scopeType as 'workstream' | 'group' | 'project', scopeId: scopeId ?? '' },
    skip: !scopeId,
  });

  // Fetch this scope's own policy overrides
  const { data: policyData, loading: policyLoading } = useQuery(GET_PERMISSION_POLICY, {
    variables: { scopeType: scopeType as 'workstream' | 'group' | 'project', scopeId: scopeId ?? '' },
    skip: !scopeId,
  });

  const [setPolicy] = useMutation(SET_PERMISSION_POLICY, {
    refetchQueries: ['GetPermissionPolicy', 'GetResolvedParentPermissions'],
  });
  const [deletePolicy] = useMutation(DELETE_PERMISSION_POLICY, {
    refetchQueries: ['GetPermissionPolicy', 'GetResolvedParentPermissions'],
  });

  const loading = parentLoading || policyLoading;

  // Build parent rules map (resolved from all scopes above this one)
  const parentRulesMap = useMemo(() => {
    const map = new Map<string, PermissionRuleConfig>();
    const parentRules = parentData?.resolvedParentPermissions;
    if (!parentRules) return map;

    for (const rule of parentRules) {
      const cleaned = cleanRule(rule);
      map.set(ruleKey(cleaned.tool, cleaned.entityType), cleaned);
    }
    return map;
  }, [parentData]);

  // Build scope override rules map
  const scopeRulesMap = useMemo(() => {
    const map = new Map<string, PermissionRuleConfig>();
    const policy = policyData?.permissionPolicy;
    if (!policy?.rules) return map;

    for (const rule of policy.rules) {
      const cleaned = cleanRule(rule);
      map.set(ruleKey(cleaned.tool, cleaned.entityType), cleaned);
    }
    return map;
  }, [policyData]);

  const getParentBehavior = useCallback(
    (tool: string): 'allow' | 'ask' => {
      const exact = parentRulesMap.get(ruleKey(tool));
      if (exact) return exact.behavior;
      const wildcard = parentRulesMap.get(ruleKey('*'));
      if (wildcard) return wildcard.behavior;
      return 'ask';
    },
    [parentRulesMap],
  );

  const getToolState = useCallback(
    (tool: string): ToolPermissionState => {
      const inheritedBehavior = getParentBehavior(tool);
      const override = scopeRulesMap.get(ruleKey(tool));

      if (override) {
        return {
          behavior: override.behavior,
          inherited: false,
          inheritedBehavior,
        };
      }

      return {
        behavior: inheritedBehavior,
        inherited: true,
        inheritedBehavior,
      };
    },
    [getParentBehavior, scopeRulesMap],
  );

  const setPermission = useCallback(
    (tool: string, behavior: 'allow' | 'ask') => {
      if (!scopeId) return;

      // Build updated rules: start from current overrides
      const currentOverrides = [...scopeRulesMap.values()];
      const key = ruleKey(tool);
      const existingIndex = currentOverrides.findIndex(
        (r) => ruleKey(r.tool, r.entityType) === key,
      );

      const parentBehavior = getParentBehavior(tool);

      if (behavior === parentBehavior) {
        // Same as parent — remove the override
        if (existingIndex >= 0) {
          currentOverrides.splice(existingIndex, 1);
        }
      } else {
        // Different from parent — add/update the override
        const newRule: PermissionRuleConfig = { tool, behavior };
        if (existingIndex >= 0) {
          currentOverrides[existingIndex] = newRule;
        } else {
          currentOverrides.push(newRule);
        }
      }

      if (currentOverrides.length === 0) {
        // No overrides left — delete the policy entirely
        deletePolicy({ variables: { scopeType, scopeId } });
      } else {
        setPolicy({
          variables: {
            scopeType,
            scopeId,
            rules: currentOverrides.map(cleanRule),
          },
        });
      }
    },
    [scopeId, scopeType, scopeRulesMap, getParentBehavior, setPolicy, deletePolicy],
  );

  const resetOverrides = useCallback(() => {
    if (!scopeId) return;
    deletePolicy({ variables: { scopeType, scopeId } });
  }, [scopeId, scopeType, deletePolicy]);

  // Count overrides
  const overrideCount = scopeRulesMap.size;

  // Count allowed tools (effective — includes dynamic entity mutations)
  const counts = useMemo(() => {
    const total = allTools.length;
    let allowed = 0;
    for (const tool of allTools) {
      if (getToolState(tool).behavior === 'allow') allowed++;
    }
    return { total, allowed };
  }, [getToolState, allTools]);

  return {
    loading,
    getToolState,
    setPermission,
    resetOverrides,
    overrideCount,
    counts,
  };
}
