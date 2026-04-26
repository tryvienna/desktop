/**
 * useEntities — Fetch a list of entities by type, with optional query/filters.
 *
 * @example
 * ```tsx
 * const { entities, loading, error } = useEntities({
 *   type: 'google_gmail_thread',
 *   query: 'in:inbox',
 *   limit: 20,
 *   pollInterval: 30_000,
 * });
 * ```
 */
import { useQuery } from '@apollo/client/react/hooks';
import type { WatchQueryFetchPolicy } from '@apollo/client/core';
import type { BaseEntity } from '../schemas';
import { usePluginClient } from './PluginDataContext';
import { GET_ENTITIES } from './operations';

export interface UseEntitiesOptions {
  type: string;
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  fetchPolicy?: WatchQueryFetchPolicy;
  pollInterval?: number;
  skip?: boolean;
}

export interface UseEntitiesResult {
  entities: BaseEntity[];
  loading: boolean;
  error: Error | undefined;
}

interface GetEntitiesData {
  entities: BaseEntity[];
}

export function useEntities(options: UseEntitiesOptions): UseEntitiesResult {
  const client = usePluginClient();
  const { data, loading, error } = useQuery<GetEntitiesData>(GET_ENTITIES, {
    client,
    variables: {
      type: options.type,
      query: options.query,
      filters: options.filters,
      limit: options.limit,
    },
    fetchPolicy: options.fetchPolicy,
    pollInterval: options.pollInterval,
    skip: options.skip,
  });

  return {
    entities: data?.entities ?? [],
    loading,
    error,
  };
}
