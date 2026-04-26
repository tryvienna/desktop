/**
 * useEntity — Fetch a single entity by URI.
 *
 * Thin wrapper around Apollo's useQuery with SDK-native BaseEntity typing.
 * Reads the Apollo client from PluginDataContext (set by host app).
 *
 * @example
 * ```tsx
 * const { entity, loading, error, refetch } = useEntity(uri, {
 *   fetchPolicy: 'network-only',
 * });
 * ```
 */
import { useQuery } from '@apollo/client/react/hooks';
import type { WatchQueryFetchPolicy } from '@apollo/client/core';
import type { BaseEntity } from '../schemas';
import { usePluginClient } from './PluginDataContext';
import { GET_ENTITY } from './operations';

export interface UseEntityOptions {
  fetchPolicy?: WatchQueryFetchPolicy;
  pollInterval?: number;
  skip?: boolean;
}

export interface UseEntityResult {
  entity: BaseEntity | null;
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<unknown>;
}

interface GetEntityData {
  entity: BaseEntity | null;
}

export function useEntity(uri: string, options: UseEntityOptions = {}): UseEntityResult {
  const client = usePluginClient();
  const { data, loading, error, refetch } = useQuery<GetEntityData>(GET_ENTITY, {
    client,
    variables: { uri },
    fetchPolicy: options.fetchPolicy,
    pollInterval: options.pollInterval,
    skip: options.skip,
  });

  return {
    entity: data?.entity ?? null,
    loading,
    error,
    refetch,
  };
}
