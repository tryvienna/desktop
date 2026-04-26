/**
 * usePluginMutation — Run custom GraphQL mutations through the plugin's data context.
 *
 * Wraps Apollo's useMutation with the pre-configured plugin client so plugins
 * can run integration-specific mutations without importing Apollo directly.
 *
 * With TypedDocumentNode from codegen, types are inferred automatically:
 * ```tsx
 * import { usePluginMutation } from '@tryvienna/sdk/react';
 * import { UPDATE_GITHUB_ISSUE } from '../client/operations';
 *
 * const [updateIssue, { loading }] = usePluginMutation(UPDATE_GITHUB_ISSUE);
 * // updateIssue({ variables: { input: ... } }) is fully typed
 * ```
 *
 * For untyped DocumentNode, pass type parameters manually:
 * ```tsx
 * const [mergePR] = usePluginMutation<{ githubMergePR: boolean }>(MERGE_PR);
 * ```
 */
import { useMutation } from '@apollo/client/react/hooks';
import type { DocumentNode } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type {
  MutationHookOptions,
  MutationTuple,
} from '@apollo/client/react/types/types';
import { usePluginClient, usePluginId } from './PluginDataContext';

// Overload 1: TypedDocumentNode — full type inference from codegen
export function usePluginMutation<TData, TVariables extends Record<string, unknown>>(
  mutation: TypedDocumentNode<TData, TVariables>,
  options?: Omit<MutationHookOptions<NoInfer<TData>, NoInfer<TVariables>>, 'client'>,
): MutationTuple<TData, TVariables>;

// Overload 2: plain DocumentNode — manual generic parameters
export function usePluginMutation<TData = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  mutation: DocumentNode,
  options?: Omit<MutationHookOptions<TData, TVariables>, 'client'>,
): MutationTuple<TData, TVariables>;

// Implementation
export function usePluginMutation<TData, TVariables extends Record<string, unknown>>(
  mutation: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: Omit<MutationHookOptions<TData, TVariables>, 'client'>,
): MutationTuple<TData, TVariables> {
  const client = usePluginClient();
  const pluginId = usePluginId();

  // Inject callerPluginId into Apollo operation context so the IPC link
  // forwards it to the main process. This lets the server auto-populate
  // fields like inbox item `source` without plugins needing to set it.
  const merged = pluginId
    ? { ...options, context: { ...options?.context, callerPluginId: pluginId } }
    : options;

  return useMutation<TData, TVariables>(mutation, { ...merged, client });
}
