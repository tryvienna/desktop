/**
 * GraphQL IPC Handlers — Main process implementation
 *
 * Executes GraphQL operations against the Pothos schema using
 * graphql-js execute() directly — no Apollo Server, no HTTP.
 */

import { getSchema, execute, parse, type DocumentNode } from '@vienna/graphql/schema';
import type { GraphQLContext, WorkstreamActions, RoutineActions, TagActions, RegistryActions, GitOps, CommandActions, SkillActions, PluginActions, EventActions, ContentProfileActions, InboxActions } from '@vienna/graphql';
import type { ApiHandlers } from '@vienna/ipc';
import type { AppDb, TagFileStore, EntityToolStore } from '@vienna/app-db';
import type { EntityRegistry, IntegrationRegistry, EntityContext } from '@tryvienna/sdk';
import type { AuthManager } from '../../main/auth/AuthManager';
import type { graphqlApi } from './contract';
import type { Logger } from '@vienna/logger';
import { BrowserWindow } from 'electron';

/** Emitter for GraphQL cache invalidation events sent to the renderer. */
export interface GraphqlCacheEmitter {
  onInvalidate: (payload: { typename: string; id?: string }) => void;
}

export interface GraphqlHandlerOptions {
  entityRegistry?: EntityRegistry;
  integrationRegistry?: IntegrationRegistry;
  workstream?: WorkstreamActions;
  routine?: RoutineActions;
  tag?: TagActions;
  tagFileStore?: TagFileStore;
  entityToolStore?: EntityToolStore;
  registry?: RegistryActions;
  skills?: SkillActions;
  plugins?: PluginActions;
  events?: EventActions;
  gitOps?: GitOps;
  authManager?: AuthManager;
  command?: CommandActions;
  /** Emitter for auto-invalidating the renderer cache after mutations. */
  emitter?: GraphqlCacheEmitter;
  /** Logger for mutation execution tracking. */
  logger?: Logger;
  /**
   * Factory that creates a real EntityContext (with live integration clients)
   * for a given entity type. Injected from PluginLoader.createEntityContext().
   */
  entityContextFactory?: (entityType: string) => EntityContext;
  /** Get an integration's authenticated client by integration ID. */
  getIntegrationClient?: (integrationId: string) => Promise<unknown>;
  /** Content profile operations. */
  contentProfiles?: ContentProfileActions;
  /** Inbox action operations. */
  inbox?: InboxActions;
}

/** Cache parsed documents to avoid re-parsing on every IPC call. */
const documentCache = new Map<string, DocumentNode>();

function getDocument(query: string): DocumentNode {
  let doc = documentCache.get(query);
  if (!doc) {
    doc = parse(query);
    documentCache.set(query, doc);
  }
  return doc;
}

const INBOX_MUTATIONS = new Set([
  'PushInboxItem', 'MarkInboxItemRead', 'MarkAllInboxItemsRead',
  'ArchiveInboxItem', 'DeleteInboxItem', 'ExecuteInboxAction',
]);

/** Broadcast inbox changes to all renderer windows so they refetch. */
function broadcastInboxChanged(excludeSender?: Electron.WebContents): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    if (excludeSender && win.webContents === excludeSender) continue;
    win.webContents.send('inbox:changed');
  }
}

/** Check if a document contains a mutation operation. */
function isMutationDocument(document: DocumentNode, operationName?: string): boolean {
  return document.definitions.some((def) => {
    if (def.kind !== 'OperationDefinition') return false;
    const op = def as unknown as { operation: string; name?: { value: string } };
    return op.operation === 'mutation' && (!operationName || op.name?.value === operationName);
  });
}

export function createGraphqlHandlers(
  db: AppDb,
  options: GraphqlHandlerOptions = {}
): ApiHandlers<typeof graphqlApi> {
  return {
    graphql: {
      execute: async ({ query, variables, operationName, callerPluginId }) => {
        const document = getDocument(query);
        const context: GraphQLContext = {
          db,
          userId: options.authManager?.getUserId() ?? null,
          entityRegistry: options.entityRegistry,
          integrationRegistry: options.integrationRegistry,
          workstream: options.workstream,
          routine: options.routine,
          tag: options.tag,
          tagFileStore: options.tagFileStore,
          entityToolStore: options.entityToolStore,
          registry: options.registry,
          skills: options.skills,
          plugins: options.plugins,
          events: options.events,
          gitOps: options.gitOps,
          command: options.command,
          entityContextFactory: options.entityContextFactory,
          getIntegrationClient: options.getIntegrationClient,
          contentProfiles: options.contentProfiles,
          inbox: options.inbox,
          callerPluginId: callerPluginId ?? undefined,
        };
        const isMutation = isMutationDocument(document, operationName ?? undefined);
        const result = await execute({
          schema: getSchema(),
          document,
          contextValue: context,
          variableValues: variables,
          operationName,
        });

        if (isMutation && options.logger) {
          if (result.errors?.length) {
            options.logger.warn('IPC mutation failed', {
              operationName: operationName ?? 'unknown',
              errors: result.errors.map((e) => e.message),
            });
          } else {
            options.logger.debug('IPC mutation completed', {
              operationName: operationName ?? 'unknown',
            });
          }
        }

        // Auto-invalidate: after a successful mutation, emit an event so the
        // renderer refetches all active queries. This keeps plugin nav sections,
        // entity drawers, and other query-driven UI automatically consistent
        // without plugin authors needing to wire cache invalidation.
        if (
          options.emitter &&
          isMutation &&
          result.data &&
          !result.errors?.length
        ) {
          options.emitter.onInvalidate({ typename: 'Query' });
        }

        // Broadcast inbox changes to all other windows (tray popover,
        // detached panel) so they refetch immediately instead of waiting
        // for their next poll tick.
        if (
          isMutation &&
          result.data &&
          !result.errors?.length &&
          operationName &&
          INBOX_MUTATIONS.has(operationName)
        ) {
          broadcastInboxChanged();
        }

        // JSON round-trip to guarantee structured-clone compatibility
        // (extensions / data may contain non-serializable values like Error instances)
        return JSON.parse(JSON.stringify({
          data: result.data ?? null,
          errors: result.errors?.map((e) => ({
            message: e.message,
            locations: e.locations?.map((l) => ({
              line: l.line,
              column: l.column,
            })),
            path: e.path as (string | number)[] | undefined,
            extensions: e.extensions ? (e.extensions as Record<string, unknown>) : undefined,
          })),
        }));
      },
    },
  };
}
