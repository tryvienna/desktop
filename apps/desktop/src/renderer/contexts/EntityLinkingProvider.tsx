/**
 * EntityLinkingProvider — Apollo-backed implementation of EntityLinkingAdapter.
 *
 * @ai-context
 * - Provides the data layer for @tryvienna/ui's entity-linking components
 * - Wraps all linked-entity GraphQL operations behind the adapter interface
 * - Mounted once in App.tsx so all drawers (including plugin drawers) can use it
 * - Navigation delegates to WorkstreamContext + DrawerActions
 */

import { useCallback, useMemo, type ReactNode } from 'react';
import {
  useApolloClient,
  GET_WORKSTREAMS_BY_ENTITY,
  GET_WORKSTREAM_LINKED_ENTITIES,
  GET_GROUP_LINKED_ENTITIES,
  LINK_WORKSTREAM_ENTITY,
  UNLINK_WORKSTREAM_ENTITY,
  LINK_GROUP_ENTITY,
  UNLINK_GROUP_ENTITY,
  SET_LINKED_ENTITY_CONTEXT_OVERRIDE,
  RESOLVE_LINKED_ENTITY_CONTEXT,
  ENTITY_SEARCH,
  GET_ENTITY_TYPES,
} from '@vienna/graphql/client';
import {
  EntityLinkingContext,
  type EntityLinkingAdapter,
  type EntityLinkedWorkstream,
  type EntitySearchResult,
  type EntityTypeInfo,
  type LinkedEntity,
} from '@tryvienna/ui';
import { useWorkstreamActions } from './WorkstreamContext';
import { useDrawerActions } from '../../lib/drawer';
import { entityDrawerTab } from '../../components/drawer/content';

export function EntityLinkingProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();
  const { setActiveWorkstream } = useWorkstreamActions();
  const { openTab } = useDrawerActions();

  const getWorkstreamsByEntity = useCallback(
    async (entityUri: string): Promise<EntityLinkedWorkstream[]> => {
      const { data } = await client.query({
        query: GET_WORKSTREAMS_BY_ENTITY,
        variables: { entityUri },
        fetchPolicy: 'network-only' as const,
      });
      const links = data?.workstreamsByEntity ?? [];
      const result: EntityLinkedWorkstream[] = [];
      for (const link of links) {
        if (!link.workstreamId || !link.workstream) continue;
        result.push({
          workstreamId: link.workstreamId,
          title: link.workstream.title || 'Untitled workstream',
          status: link.workstream.status ?? 'idle',
          groupId: link.groupId ?? null,
        });
      }
      return result;
    },
    [client],
  );

  const navigateToWorkstream = useCallback(
    (workstreamId: string) => {
      setActiveWorkstream(workstreamId);
    },
    [setActiveWorkstream],
  );

  const getLinkedEntities = useCallback(
    async (targetId: string, scope: 'workstream' | 'group'): Promise<LinkedEntity[]> => {
      if (scope === 'workstream') {
        const { data } = await client.query({
          query: GET_WORKSTREAM_LINKED_ENTITIES,
          variables: { workstreamId: targetId },
          fetchPolicy: 'network-only' as const,
        });
        return (data?.workstreamLinkedEntities ?? []).map((e) => ({
          entityUri: e.entityUri ?? '',
          entityType: e.entityType ?? '',
          entityTitle: e.entityTitle ?? null,
          contextOverride: e.contextOverride ?? null,
          isInherited: (e as { isInherited?: boolean }).isInherited ?? false,
        }));
      }
      const { data } = await client.query({
        query: GET_GROUP_LINKED_ENTITIES,
        variables: { groupId: targetId },
        fetchPolicy: 'network-only' as const,
      });
      return (data?.groupLinkedEntities ?? []).map((e) => ({
        entityUri: e.entityUri ?? '',
        entityType: e.entityType ?? '',
        entityTitle: e.entityTitle ?? null,
        contextOverride: e.contextOverride ?? null,
        isInherited: false,
      }));
    },
    [client],
  );

  const linkEntity = useCallback(
    async (targetId: string, scope: 'workstream' | 'group', entity: EntitySearchResult) => {
      if (scope === 'workstream') {
        await client.mutate({
          mutation: LINK_WORKSTREAM_ENTITY,
          variables: {
            workstreamId: targetId,
            entityUri: entity.uri,
            entityType: entity.type,
            entityTitle: entity.title,
          },
          refetchQueries: 'active',
        });
      } else {
        await client.mutate({
          mutation: LINK_GROUP_ENTITY,
          variables: {
            groupId: targetId,
            entityUri: entity.uri,
            entityType: entity.type,
            entityTitle: entity.title,
          },
          refetchQueries: 'active',
        });
      }
    },
    [client],
  );

  const unlinkEntity = useCallback(
    async (targetId: string, scope: 'workstream' | 'group', entityUri: string) => {
      if (scope === 'workstream') {
        await client.mutate({
          mutation: UNLINK_WORKSTREAM_ENTITY,
          variables: { workstreamId: targetId, entityUri },
          refetchQueries: 'active',
        });
      } else {
        await client.mutate({
          mutation: UNLINK_GROUP_ENTITY,
          variables: { groupId: targetId, entityUri },
          refetchQueries: 'active',
        });
      }
    },
    [client],
  );

  const resolveEntityContext = useCallback(
    async (entityUri: string): Promise<string> => {
      const { data } = await client.query({
        query: RESOLVE_LINKED_ENTITY_CONTEXT,
        variables: { entityUri },
        fetchPolicy: 'network-only' as const,
      });
      return data?.resolveLinkedEntityContext ?? '';
    },
    [client],
  );

  const setContextOverride = useCallback(
    async (workstreamId: string, entityUri: string, override: string | null) => {
      await client.mutate({
        mutation: SET_LINKED_ENTITY_CONTEXT_OVERRIDE,
        variables: { workstreamId, entityUri, contextOverride: override },
      });
    },
    [client],
  );

  const searchEntities = useCallback(
    async (query: string, types?: string[] | null, limit?: number): Promise<EntitySearchResult[]> => {
      const { data } = await client.query({
        query: ENTITY_SEARCH,
        variables: { query, types: types ?? null, limit: limit ?? 20 },
        fetchPolicy: 'network-only' as const,
      });
      const results: EntitySearchResult[] = [];
      for (const e of data?.entitySearch ?? []) {
        if (e.uri && e.id && e.type && e.title) {
          results.push({ id: e.id, type: e.type, uri: e.uri, title: e.title });
        }
      }
      return results;
    },
    [client],
  );

  const getEntityTypes = useCallback(
    async (): Promise<EntityTypeInfo[]> => {
      const { data } = await client.query({
        query: GET_ENTITY_TYPES,
        fetchPolicy: 'cache-first' as const,
      });
      return (data?.entityTypes ?? []).map((et) => ({
        type: et.type ?? '',
        displayName: et.displayName ?? et.type ?? '',
        icon: et.icon ?? null,
      }));
    },
    [client],
  );

  const openEntityDrawer = useCallback(
    (uri: string) => {
      openTab(entityDrawerTab(uri));
    },
    [openTab],
  );

  const adapter: EntityLinkingAdapter = useMemo(
    () => ({
      getWorkstreamsByEntity,
      navigateToWorkstream,
      getLinkedEntities,
      linkEntity,
      unlinkEntity,
      resolveEntityContext,
      setContextOverride,
      searchEntities,
      getEntityTypes,
      openEntityDrawer,
    }),
    [
      getWorkstreamsByEntity,
      navigateToWorkstream,
      getLinkedEntities,
      linkEntity,
      unlinkEntity,
      resolveEntityContext,
      setContextOverride,
      searchEntities,
      getEntityTypes,
      openEntityDrawer,
    ],
  );

  return (
    <EntityLinkingContext.Provider value={adapter}>
      {children}
    </EntityLinkingContext.Provider>
  );
}
