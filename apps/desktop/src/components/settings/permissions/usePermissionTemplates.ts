/**
 * usePermissionTemplates — CRUD operations for permission templates via GraphQL.
 */

import { useCallback } from 'react';
import { useQuery, useMutation } from '@vienna/graphql/client';
import { GET_PERMISSION_TEMPLATES, CREATE_PERMISSION_TEMPLATE, UPDATE_PERMISSION_TEMPLATE, DELETE_PERMISSION_TEMPLATE } from '@vienna/graphql/client';

interface PermissionRuleConfig {
  tool: string;
  behavior: 'allow' | 'ask';
  entityType?: string;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  rules: PermissionRuleConfig[];
  createdAt: number;
  updatedAt: number;
}

/** Strip __typename and null optional fields so rules can be used as mutation input. */
function cleanRule(r: { tool?: string | null; behavior?: string | null; entityType?: string | null }): PermissionRuleConfig {
  return {
    tool: r.tool ?? '',
    behavior: (r.behavior as 'allow' | 'ask') ?? 'ask',
    ...(r.entityType ? { entityType: r.entityType } : {}),
  };
}

export function usePermissionTemplates() {
  const { data, loading } = useQuery(GET_PERMISSION_TEMPLATES);
  const [createMutation] = useMutation(CREATE_PERMISSION_TEMPLATE, {
    refetchQueries: [{ query: GET_PERMISSION_TEMPLATES }],
  });
  const [updateMutation] = useMutation(UPDATE_PERMISSION_TEMPLATE, {
    refetchQueries: [{ query: GET_PERMISSION_TEMPLATES }],
  });
  const [deleteMutation] = useMutation(DELETE_PERMISSION_TEMPLATE, {
    refetchQueries: [{ query: GET_PERMISSION_TEMPLATES }],
  });

  const templates: PermissionTemplate[] = (data?.permissionTemplates ?? []).map((t) => ({
    id: String(t.id ?? ''),
    name: String(t.name ?? ''),
    description: String(t.description ?? ''),
    rules: (t.rules ?? []).map(cleanRule),
    createdAt: typeof t.createdAt === 'string' ? Number(t.createdAt) : (t.createdAt as number),
    updatedAt: typeof t.updatedAt === 'string' ? Number(t.updatedAt) : (t.updatedAt as number),
  }));

  const createTemplate = useCallback(
    async (name: string, description: string, rules: PermissionRuleConfig[]) => {
      await createMutation({
        variables: { name, description, rules: rules.map(cleanRule) },
      });
    },
    [createMutation],
  );

  const updateTemplate = useCallback(
    async (id: string, updates: { name?: string; description?: string; rules?: PermissionRuleConfig[] }) => {
      await updateMutation({
        variables: {
          id,
          name: updates.name,
          description: updates.description,
          rules: updates.rules?.map(cleanRule),
        },
      });
    },
    [updateMutation],
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await deleteMutation({ variables: { id } });
    },
    [deleteMutation],
  );

  return {
    loading,
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
