/**
 * usePluginQuery — Run custom GraphQL queries through the plugin's data context.
 *
 * Wraps Apollo's useQuery with the pre-configured plugin client so plugins
 * can run integration-specific queries without importing Apollo directly.
 *
 * With TypedDocumentNode from codegen, types are inferred automatically:
 * ```tsx
 * import { usePluginQuery } from '@tryvienna/sdk/react';
 * import { GET_GITHUB_ISSUE } from '../client/operations';
 *
 * const { data } = usePluginQuery(GET_GITHUB_ISSUE, {
 *   variables: { owner: 'foo', repo: 'bar', issueNumber: 1 },
 * });
 * // data?.githubIssue is fully typed — no manual type imports needed
 * ```
 *
 * For untyped DocumentNode, pass type parameters manually:
 * ```tsx
 * const { data } = usePluginQuery<{ repos: Repo[] }>(GET_REPOS);
 * ```
 */
import { useQuery } from '@apollo/client/react/hooks';
import type { DocumentNode } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type {
  QueryHookOptions,
  QueryResult,
} from '@apollo/client/react/types/types';
import { usePluginClient } from './PluginDataContext';

// Overload 1: TypedDocumentNode — full type inference from codegen
export function usePluginQuery<TData, TVariables extends Record<string, unknown>>(
  query: TypedDocumentNode<TData, TVariables>,
  options?: Omit<QueryHookOptions<NoInfer<TData>, NoInfer<TVariables>>, 'client'>,
): QueryResult<TData, TVariables>;

// Overload 2: plain DocumentNode — manual generic parameters
export function usePluginQuery<TData = unknown, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  query: DocumentNode,
  options?: Omit<QueryHookOptions<TData, TVariables>, 'client'>,
): QueryResult<TData, TVariables>;

// Implementation
export function usePluginQuery<TData, TVariables extends Record<string, unknown>>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: Omit<QueryHookOptions<TData, TVariables>, 'client'>,
): QueryResult<TData, TVariables> {
  const client = usePluginClient();
  return useQuery<TData, TVariables>(query, { ...options, client });
}
