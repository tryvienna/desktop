/**
 * Cache utilities for plugin entity operations.
 *
 * These mirror the implementations in @vienna/graphql/client/cache-config.ts
 * but are owned by the SDK so plugins don't depend on @vienna/graphql.
 *
 * @example
 * ```tsx
 * import { usePluginClient, invalidateEntity } from '@tryvienna/sdk/react';
 *
 * const client = usePluginClient();
 * invalidateEntity(client, 'Entity', undefined, { uri });
 * ```
 */
import type { ApolloClient } from '@apollo/client/core';

/**
 * Evict a cached entity and refetch all active queries.
 *
 * For types with non-standard keyFields (e.g., Entity uses 'uri'), pass
 * `keyFields` with the appropriate key-value pairs instead of `id`.
 */
export function invalidateEntity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ApolloClient requires `any` for its cache shape generic
  client: ApolloClient<any>,
  typename: string,
  id?: string,
  keyFields?: Record<string, string>,
): void {
  if (id || keyFields) {
    const identifyObj = keyFields
      ? { __typename: typename, ...keyFields }
      : { __typename: typename, id };
    const cacheId = client.cache.identify(identifyObj);
    if (cacheId) {
      client.cache.evict({ id: cacheId });
    }
  }
  client.cache.gc();
  void client.refetchQueries({ include: 'active' });
}

/**
 * Update specific fields on a cached entity without a network request.
 *
 * For types with non-standard keyFields (e.g., Entity uses 'uri'), pass
 * `keyFields` with the appropriate key-value pairs instead of `id`.
 */
export function updateCachedEntity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ApolloClient requires `any` for its cache shape generic
  client: ApolloClient<any>,
  typename: string,
  id: string,
  fields: Record<string, unknown>,
  keyFields?: Record<string, string>,
): void {
  const identifyObj = keyFields
    ? { __typename: typename, ...keyFields }
    : { __typename: typename, id };
  const cacheId = client.cache.identify(identifyObj);
  if (!cacheId) return;

  client.cache.modify({
    id: cacheId,
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, () => value]),
    ),
  });
}
