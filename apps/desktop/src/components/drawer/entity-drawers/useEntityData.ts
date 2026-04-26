/**
 * useEntityData — Fetches a single entity by URI via GraphQL.
 *
 * @ai-context
 * - Wraps GET_ENTITY query with cache-and-network policy
 * - Returns entity, loading, error, and refetch
 * - Used by all entity drawer components
 */

import { useQuery, GET_ENTITY } from '@vienna/graphql/client';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useEntityData(uri: string) {
  const result = useQuery(GET_ENTITY, {
    variables: { uri },
    fetchPolicy: 'cache-and-network',
  });

  // Destructure after to avoid TS2742 (non-portable inferred type from @apollo/client internals)
  const entity = result.data?.entity ?? null;
  const loading = result.loading;
  const error: Error | undefined = result.error;
  const refetch = () => { void result.refetch(); };

  return { entity, loading, error, refetch };
}
