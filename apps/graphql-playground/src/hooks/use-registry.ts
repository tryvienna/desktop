/**
 * useRegistry — Fetches entity types and integrations from the registry
 */

import { useState, useEffect } from 'react';
import { executeQuery } from '@/lib/graphql-client';

export interface EntityDisplayInfo {
  emoji?: string;
  colors?: { bg: string; text: string; border: string };
  description?: string;
  filterDescriptions?: Array<{ name: string; type: string; description: string }>;
  outputFields?: Array<{ key: string; label: string; metadataPath: string; format?: string }>;
}

export interface EntityTypeInfo {
  type: string;
  displayName: string;
  icon: string;
  source: 'builtin' | 'integration';
  uriExample: string;
  display: EntityDisplayInfo | null;
}

export interface IntegrationInfo {
  id: string;
  displayName: string;
  icon?: string;
}

interface RegistryState {
  entityTypes: EntityTypeInfo[];
  integrations: IntegrationInfo[];
  loading: boolean;
  error: string | null;
}

const ENTITY_TYPES_QUERY = `
  query RegistryEntityTypes {
    entityTypes {
      type displayName icon source uriExample display
    }
  }
`;

const INTEGRATIONS_QUERY = `
  query RegistryIntegrations {
    integrations {
      id displayName icon
    }
  }
`;

export function useRegistry(): RegistryState {
  const [state, setState] = useState<RegistryState>({
    entityTypes: [],
    integrations: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const [entityResult, integrationResult] = await Promise.all([
          executeQuery(ENTITY_TYPES_QUERY),
          executeQuery(INTEGRATIONS_QUERY),
        ]);

        if (cancelled) return;

        const entityTypes =
          ((entityResult.result.data as Record<string, unknown>)?.entityTypes as
            | EntityTypeInfo[]
            | undefined) ?? [];

        const integrations =
          ((integrationResult.result.data as Record<string, unknown>)?.integrations as
            | IntegrationInfo[]
            | undefined) ?? [];

        setState({ entityTypes, integrations, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch registry',
        }));
      }
    }

    void fetch();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
