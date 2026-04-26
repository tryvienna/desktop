/**
 * IPC Link — Apollo Link that routes GraphQL operations through Electron IPC.
 *
 * Instead of HTTP, operations are sent via typed IPC calls to the main process,
 * which executes them against the Pothos schema using graphql-js.
 *
 * @module graphql/client/ipc-link
 */

import { ApolloLink, Observable } from '@apollo/client/core';
import type { FetchResult, Operation } from '@apollo/client/core';
import { print } from 'graphql';

/** Function that sends a GraphQL request via IPC and returns the result. */
export type GraphQLExecuteFn = (input: {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
  callerPluginId?: string;
}) => Promise<FetchResult>;

/**
 * Create an Apollo Link that routes operations through Electron IPC.
 *
 * @param executeFn - The IPC function to call (e.g., `getApi(api).graphql.execute`)
 */
export function createIpcLink(executeFn: GraphQLExecuteFn): ApolloLink {
  return new ApolloLink((operation: Operation) => {
    return new Observable((observer) => {
      const { query, variables, operationName } = operation;

      const callerPluginId = (operation.getContext() as { callerPluginId?: string }).callerPluginId;

      executeFn({
        query: print(query),
        variables: variables as Record<string, unknown> | undefined,
        operationName: operationName ?? undefined,
        ...(callerPluginId ? { callerPluginId } : {}),
      })
        .then((result) => {
          observer.next(result);
          observer.complete();
        })
        .catch((err: unknown) => {
          observer.error(err);
        });
    });
  });
}
