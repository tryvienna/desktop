/**
 * Apollo Client Factory — Creates the renderer-side Apollo Client.
 *
 * Uses the IPC Link for transport and InMemoryCache for normalization.
 * No HTTP, no WebSocket — all operations route through Electron IPC.
 *
 * @module graphql/client/create-client
 */

import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { GraphQLError } from 'graphql';
import { createIpcLink } from './ipc-link';
import type { GraphQLExecuteFn } from './ipc-link';
import { typePolicies } from './cache-config';

/**
 * Execute function type that matches the IPC contract output.
 * Wider than GraphQLExecuteFn — accepts `data: unknown` from Zod-validated IPC.
 */
export type IpcGraphQLExecuteFn = (input: {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
  callerPluginId?: string;
}) => Promise<{
  data?: unknown;
  errors?: Array<{
    message: string;
    path?: Array<string | number>;
    locations?: Array<{ line: number; column: number }>;
    extensions?: Record<string, unknown>;
  }>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Adapt an IPC execute function to the Apollo Link's GraphQLExecuteFn type.
 *
 * Bridges two type systems: the Zod-validated IPC contract (data: unknown,
 * errors: plain objects) and Apollo's FetchResult (data: Record, errors: GraphQLError[]).
 * Uses type guards for data and constructs real GraphQLError instances for errors.
 */
function adaptIpcExecute(fn: IpcGraphQLExecuteFn): GraphQLExecuteFn {
  return (input) =>
    fn(input).then((result) => ({
      data: isRecord(result.data) ? result.data : result.data === null ? null : undefined,
      errors: result.errors?.map(
        (e) => new GraphQLError(e.message, { path: e.path, extensions: e.extensions }),
      ),
    }));
}

/**
 * Create an Apollo Client connected to the main process via IPC.
 *
 * @param executeFn - The IPC function (e.g., `getApi(api).graphql.execute`)
 */
export function createApolloClient(executeFn: IpcGraphQLExecuteFn) {
  return new ApolloClient({
    link: createIpcLink(adaptIpcExecute(executeFn)),
    cache: new InMemoryCache({ typePolicies }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      },
      mutate: {
        // 'none' ensures mutation errors throw and are caught by error boundaries.
        // 'all' would silently return { data, errors } requiring every callsite to check.
        errorPolicy: 'none',
      },
    },
  });
}
