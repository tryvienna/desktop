/**
 * Apollo Cache Configuration — Type policies and cache invalidation utilities.
 *
 * Type policies tell Apollo's InMemoryCache how to normalize and merge entities.
 * The invalidation utilities provide structured patterns for updating the cache
 * from IPC events.
 *
 * @module graphql/client/cache-config
 */

import type { TypePolicies, ApolloClient, NormalizedCacheObject } from '@apollo/client/core';

// ─────────────────────────────────────────────────────────────────────────────
// Type Policies
// ─────────────────────────────────────────────────────────────────────────────

/** Replace list — always use the incoming data, never merge with stale entries. */
function replaceIncoming(_existing: unknown, incoming: unknown) {
  return incoming;
}

export const typePolicies: TypePolicies = {
  Project: { keyFields: ['id'] },
  Workstream: { keyFields: ['id'] },
  Routine: { keyFields: ['id'] },
  RoutineRun: { keyFields: ['id'] },
  RoutineSchedule: { keyFields: false },
  WorkstreamLinkedEntity: { keyFields: ['workstreamId', 'entityUri'] },
  WorkstreamDirectory: { keyFields: ['id'] },
  BranchSelection: { keyFields: ['id'] },
  Registry: { keyFields: ['id'] },
  QuickAction: { keyFields: ['id'] },
  QuickActionOption: { keyFields: false },
  Entity: {
    keyFields: ['uri'],
  },
  // Settings is a singleton (no ID) — merge by replacing entire object
  Settings: { keyFields: [] },
  AppearanceSettings: { keyFields: false },
  AiSettings: { keyFields: false },
  AdvancedSettings: { keyFields: false },

  // ── GitHub entity types ──────────────────────────────────────────────────
  // Synthetic `id` field (owner/repo#number) enables Apollo normalization:
  // the same PR/Issue is stored once regardless of which query returned it.
  GitHubPR: { keyFields: ['id'] },
  GitHubIssue: { keyFields: ['id'] },
  GitHubRepo: { keyFields: ['id'] },
  GitHubWorkflowRun: { keyFields: ['id'] },
  // Embedded types — not normalized separately
  GitHubLabel: { keyFields: false },
  GitHubPRFile: { keyFields: false },
  GitHubWorkflowStep: { keyFields: false },

  // ── Plugin types ──────────────────────────────────────────────────────────
  InstalledPlugin: { keyFields: ['id'] },
  RegistryPlugin: { keyFields: ['id'] },
  RegistryPluginAuthor: { keyFields: false },

  Query: {
    fields: {
      workstreamsByProject: { merge: replaceIncoming },
      archivedWorkstreams: { merge: replaceIncoming },
      routines: { merge: replaceIncoming },
      routineRunHistory: { merge: replaceIncoming },
      registries: { merge: replaceIncoming },
      registryQuickActions: { merge: replaceIncoming },
      settings: { merge: replaceIncoming },
      // GitHub list queries — always replace (items are normalized individually)
      githubMyPRs: { merge: replaceIncoming },
      githubPRs: { merge: replaceIncoming },
      searchGithubPRs: { merge: replaceIncoming },
      githubMyIssues: { merge: replaceIncoming },
      githubIssues: { merge: replaceIncoming },
      searchGithubIssues: { merge: replaceIncoming },
      githubWorkflowRuns: { merge: replaceIncoming },
      // Plugin list queries — always replace
      installedPlugins: { merge: replaceIncoming },
      registryPlugins: { merge: replaceIncoming },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Cache Invalidation Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evict a specific entity from the cache and refetch active queries.
 *
 * Used for out-of-band changes pushed from the main process (routine executor
 * completing, scheduler updating nextRunAt, workstream status transitions) where
 * we don't know which specific queries are affected. Refetching all active queries
 * is intentional — these events are infrequent and correctness matters more than
 * avoiding a few extra fetches.
 *
 * For types with non-standard keyFields (e.g., Entity uses 'uri'), pass `keyFields`
 * with the appropriate key-value pairs.
 */
export function invalidateEntity(
  client: ApolloClient<NormalizedCacheObject>,
  typename: string,
  id?: string,
  keyFields?: Record<string, string>
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
 * Use for granular updates from IPC events (e.g., status changes, message count bumps).
 * For types with non-standard keyFields (e.g., Entity uses 'uri'), pass `keyFields`
 * with the appropriate key-value pairs.
 */
export function updateCachedEntity(
  client: ApolloClient<NormalizedCacheObject>,
  typename: string,
  id: string,
  fields: Record<string, unknown>,
  keyFields?: Record<string, string>
): void {
  const identifyObj = keyFields
    ? { __typename: typename, ...keyFields }
    : { __typename: typename, id };
  const cacheId = client.cache.identify(identifyObj);
  if (!cacheId) return;

  client.cache.modify({
    id: cacheId,
    fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, () => value])),
  });
}
