/**
 * Workstream Queries — GraphQL query fields for workstreams.
 *
 * @module graphql/domains/workstreams/queries
 */

import { GraphQLError } from 'graphql';
import { getEntityTypeFromURI } from '@tryvienna/sdk';
import { builder } from '../../schema/builder';
import {
  WorkstreamRef,
  WorkstreamLinkedEntityRef,
  WorkstreamReferenceRef,
  WorkstreamDirectoryRef,
  BranchSelectionRef,
  DirectoryWithBranchInfoRef,
  WorkstreamEntityLinkRef,
  UserMessageHistoryConnectionRef,
  mergeWorkstreamAndGroupLinkedEntities,
  type WorkstreamEntityLinkShape,
} from './types';

builder.queryFields((t) => ({
  workstream: t.field({
    type: WorkstreamRef,
    nullable: true,
    description: 'Get a workstream by ID',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => ctx.db.workstreams.getById(String(args.id)),
  }),

  workstreamsByProject: t.field({
    type: [WorkstreamRef],
    description: 'List non-archived workstreams for a project (pinned first)',
    args: { projectId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => ctx.db.workstreams.getByProject(String(args.projectId)),
  }),

  archivedWorkstreams: t.field({
    type: [WorkstreamRef],
    description: 'List archived workstreams for a project',
    args: { projectId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => ctx.db.workstreams.getArchivedByProject(String(args.projectId)),
  }),

  isWorkstreamAgentRunning: t.field({
    type: 'Boolean',
    description: 'Check if the agent is running for a workstream',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      return ctx.workstream.isAgentRunning(String(args.id));
    },
  }),

  workstreamLinkedEntities: t.field({
    type: [WorkstreamLinkedEntityRef],
    description: 'Get entities linked to a workstream (includes group-inherited entities)',
    args: { workstreamId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const wsId = String(args.workstreamId);
      const direct = ctx.db.workstreamLinkedEntities.getByWorkstream(wsId);
      const ws = ctx.db.workstreams.getById(wsId);
      const group = ws?.groupId
        ? ctx.db.groupLinkedEntities.getByGroup(ws.groupId)
        : [];
      return mergeWorkstreamAndGroupLinkedEntities(wsId, direct, group);
    },
  }),

  workstreamReferences: t.field({
    type: [WorkstreamReferenceRef],
    description: 'Get entity references detected in or added to a workstream conversation',
    args: { workstreamId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      ctx.db.workstreamReferences.getByWorkstream(String(args.workstreamId)),
  }),

  workstreamDirectories: t.field({
    type: [WorkstreamDirectoryRef],
    description: 'Get working directories for a workstream',
    args: { workstreamId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      ctx.db.workstreamDirectories.getByWorkstream(String(args.workstreamId)),
  }),

  branchSelections: t.field({
    type: [BranchSelectionRef],
    description: 'Get branch selections for a workstream',
    args: { workstreamId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      ctx.db.branchSelections.list(String(args.workstreamId)),
  }),

  directoriesWithBranchInfo: t.field({
    type: [DirectoryWithBranchInfoRef],
    description: 'Get directories with computed branch/worktree info for a workstream',
    args: { workstreamId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      ctx.db.branchSelections.getDirectoriesWithBranchInfo(String(args.workstreamId)),
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Reverse entity → workstream lookup
  // ───────────────────────────────────────────────────────────────────────

  workstreamsByEntity: t.field({
    type: [WorkstreamEntityLinkRef],
    description: 'Find all workstreams linked to a given entity URI (includes group-inherited links)',
    args: { entityUri: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => {
      const results: WorkstreamEntityLinkShape[] = [];
      const seenWorkstreamIds = new Set<string>();

      // 1. Direct workstream links
      const wsLinks = ctx.db.workstreamLinkedEntities.getByEntity(args.entityUri);
      for (const link of wsLinks) {
        const ws = ctx.db.workstreams.getById(link.workstreamId);
        if (ws && ws.archivedAt == null) {
          seenWorkstreamIds.add(ws.id);
          results.push({
            entityUri: link.entityUri,
            entityType: link.entityType,
            entityTitle: link.entityTitle,
            workstreamId: ws.id,
            groupId: ws.groupId,
            createdAt: link.createdAt,
          });
        }
      }

      // 2. Group-inherited links: find groups that have this entity, then all workstreams in those groups
      const groupLinks = ctx.db.groupLinkedEntities.getByEntity(args.entityUri);
      for (const groupLink of groupLinks) {
        const groupWorkstreams = ctx.db.workstreams.getByGroup(groupLink.groupId);
        for (const ws of groupWorkstreams) {
          if (!seenWorkstreamIds.has(ws.id) && ws.archivedAt == null) {
            seenWorkstreamIds.add(ws.id);
            results.push({
              entityUri: groupLink.entityUri,
              entityType: groupLink.entityType,
              entityTitle: groupLink.entityTitle,
              workstreamId: ws.id,
              groupId: ws.groupId,
              createdAt: groupLink.createdAt,
            });
          }
        }
      }

      return results;
    },
  }),

  resolveLinkedEntityContext: t.field({
    type: 'String',
    nullable: true,
    description: 'Resolve context text for a linked entity. Uses the entity definition\'s resolveContext if available, otherwise builds generic context from metadata.',
    args: { entityUri: t.arg.string({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.entityRegistry) return null;

      // Require real integration clients — no silent fallback to mocks
      let entityType: string;
      try {
        entityType = getEntityTypeFromURI(args.entityUri);
      } catch {
        return null;
      }
      if (!ctx.entityContextFactory) {
        throw new GraphQLError('Entity context factory not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const entityCtx = ctx.entityContextFactory(entityType);

      // Try resolveContext from registered handlers first
      const contextResult = await ctx.entityRegistry.resolveContext(args.entityUri, entityCtx);
      if (contextResult) return contextResult;

      // Fallback: resolve entity and build generic context
      const entity = await ctx.entityRegistry.getByURI(args.entityUri, entityCtx);
      if (!entity) return null;

      const parts: string[] = [];
      const title = entity.title || entity.id;
      parts.push(`### ${entity.type}: ${title}`);
      parts.push(`- URI: ${args.entityUri}`);
      if (entity.title) parts.push(`- Title: ${entity.title}`);
      return parts.join('\n');
    },
  }),

  // ───────────────────────────────────────────────────────────────────────
  // User message history (for input up-arrow navigation)
  // ───────────────────────────────────────────────────────────────────────

  userMessageHistory: t.field({
    type: UserMessageHistoryConnectionRef,
    description:
      'Get user-sent message history for a workstream (newest first). ' +
      'Used to populate the chat input\'s up-arrow message history and ' +
      'supports cursor-based pagination for preemptive loading.',
    args: {
      workstreamId: t.arg.id({ required: true }),
      limit: t.arg.int({
        required: false,
        defaultValue: 10,
        description: 'Maximum number of messages to return (default 10)',
      }),
      before: t.arg.int({
        required: false,
        description: 'Cursor: only return messages with event ID less than this value',
      }),
    },
    resolve: (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
      return ctx.workstream.getUserMessageHistory(
        String(args.workstreamId),
        limit,
        args.before ?? undefined,
      );
    },
  }),
}));
