/**
 * Workstream GraphQL Type — Pothos object type backed by WorkstreamRecord.
 *
 * @module graphql/domains/workstreams/types
 */

import type {
  WorkstreamRecord,
  WorkstreamLinkedEntityRecord,
  WorkstreamReferenceRecord,
  WorkstreamDirectoryRecord,
  GroupLinkedEntityRecord,
  BranchSelectionRecord,
  DirectoryWithBranchInfo,
} from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { ProjectRef } from '../projects/types';

// ─────────────────────────────────────────────────────────────────────────────
// Enum
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamStatusEnum = builder.enumType('WorkstreamStatus', {
  values: ['idle', 'processing', 'waiting_permission', 'completed_unviewed', 'active', 'needs_review'] as const,
});

// ─────────────────────────────────────────────────────────────────────────────
// Object type
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamRef = builder.objectRef<WorkstreamRecord>('Workstream');

builder.objectType(WorkstreamRef, {
  description: 'A conversation within a project',
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    status: t.expose('status', { type: WorkstreamStatusEnum }),
    model: t.exposeString('model', { nullable: true }),
    isPinned: t.exposeBoolean('isPinned'),
    isRoutineWorkstream: t.exposeBoolean('isRoutineWorkstream'),
    activeSessionId: t.exposeString('activeSessionId', { nullable: true }),
    groupId: t.exposeID('groupId', { nullable: true }),
    messageCount: t.exposeInt('messageCount'),
    lastActivityAt: t.expose('lastActivityAt', { type: 'DateTime', nullable: true }),
    archivedAt: t.expose('archivedAt', { type: 'DateTime', nullable: true }),
    forkedFromWorkstreamId: t.exposeID('forkedFromWorkstreamId', {
      nullable: true,
      description: 'ID of the workstream this was forked from (null if not a fork)',
    }),
    forkedAtMessageId: t.exposeString('forkedAtMessageId', {
      nullable: true,
      description: 'Vienna message ID at the fork point (null if not a fork)',
    }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    inFocus: t.boolean({
      description: 'Whether this workstream is currently focused in the UI',
      resolve: (workstream, _args, ctx) =>
        ctx.workstream?.getFocusedWorkstreamId() === workstream.id,
    }),
    project: t.field({
      type: ProjectRef,
      description: 'The project this workstream belongs to',
      resolve: (workstream, _args, ctx) => {
        const project = ctx.db.projects.getById(workstream.projectId);
        if (!project) {
          throw new Error(
            `Project ${workstream.projectId} not found for workstream ${workstream.id}`
          );
        }
        return project;
      },
    }),
    group: t.field({
      // Uses WorkstreamGroupRef from workstream-groups/types (circular import is safe
      // because Pothos resolves field types lazily at schema build time)
      type: WorkstreamGroupRef,
      nullable: true,
      description: 'The workstream group this workstream belongs to (if any)',
      resolve: (workstream, _args, ctx) =>
        workstream.groupId ? ctx.db.workstreamGroups.getById(workstream.groupId) : null,
    }),
    linkedEntities: t.field({
      type: [WorkstreamLinkedEntityRef],
      description: 'Entities linked to this workstream as persistent context (includes group-inherited)',
      resolve: (workstream, _args, ctx) => {
        const direct = ctx.db.workstreamLinkedEntities.getByWorkstream(workstream.id);
        const group = workstream.groupId
          ? ctx.db.groupLinkedEntities.getByGroup(workstream.groupId)
          : [];
        return mergeWorkstreamAndGroupLinkedEntities(workstream.id, direct, group);
      },
    }),
    directories: t.field({
      type: [WorkstreamDirectoryRef],
      description: 'Working directories for this workstream',
      resolve: (workstream, _args, ctx) =>
        ctx.db.workstreamDirectories.getByWorkstream(workstream.id),
    }),
    branchSelections: t.field({
      type: [BranchSelectionRef],
      description: 'Branch selections for this workstream\'s directories',
      resolve: (workstream, _args, ctx) =>
        ctx.db.branchSelections.list(workstream.id),
    }),
    directoriesWithBranchInfo: t.field({
      type: [DirectoryWithBranchInfoRef],
      description: 'Directories with computed branch/worktree info',
      resolve: (workstream, _args, ctx) =>
        ctx.db.branchSelections.getDirectoriesWithBranchInfo(workstream.id),
    }),
    tags: t.field({
      type: [WorkstreamTagRef],
      description: 'Tags applied to this workstream with execution status',
      resolve: (workstream, _args, ctx) =>
        ctx.db.tags.getWorkstreamTags(workstream.id),
    }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Linked Entity type
// ─────────────────────────────────────────────────────────────────────────────

/** Extended shape that includes computed isInherited flag for group-inherited entities. */
interface LinkedEntityShape extends WorkstreamLinkedEntityRecord {
  isInherited: boolean;
}

/**
 * Merge workstream-level and group-level linked entities into a single list.
 * Workstream entities take precedence (dedup by URI). Group entities are marked
 * as inherited. Used by both Workstream.linkedEntities field and
 * workstreamLinkedEntities query to avoid duplicated logic.
 */
export function mergeWorkstreamAndGroupLinkedEntities(
  workstreamId: string,
  directEntities: WorkstreamLinkedEntityRecord[],
  groupEntities: GroupLinkedEntityRecord[],
): LinkedEntityShape[] {
  const results: LinkedEntityShape[] = directEntities.map((e) => ({ ...e, isInherited: false }));
  const seenUris = new Set(results.map((e) => e.entityUri));

  for (const ge of groupEntities) {
    if (!seenUris.has(ge.entityUri)) {
      seenUris.add(ge.entityUri);
      results.push({
        workstreamId,
        entityUri: ge.entityUri,
        entityType: ge.entityType,
        entityTitle: ge.entityTitle,
        contextOverride: ge.contextOverride,
        createdAt: ge.createdAt,
        isInherited: true,
      });
    }
  }

  return results;
}

export const WorkstreamLinkedEntityRef =
  builder.objectRef<LinkedEntityShape>('WorkstreamLinkedEntity');

builder.objectType(WorkstreamLinkedEntityRef, {
  description: 'An entity linked to a workstream as persistent context',
  fields: (t) => ({
    workstreamId: t.exposeID('workstreamId'),
    entityUri: t.exposeString('entityUri'),
    entityType: t.exposeString('entityType'),
    entityTitle: t.exposeString('entityTitle', { nullable: true }),
    contextOverride: t.exposeString('contextOverride', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    isInherited: t.exposeBoolean('isInherited'),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Reference type (auto-detected or agent-added entity references)
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamReferenceRef =
  builder.objectRef<WorkstreamReferenceRecord>('WorkstreamReference');

builder.objectType(WorkstreamReferenceRef, {
  description: 'An entity reference detected in or added to a workstream conversation',
  fields: (t) => ({
    workstreamId: t.exposeID('workstreamId'),
    entityUri: t.exposeString('entityUri'),
    entityType: t.exposeString('entityType'),
    entityTitle: t.exposeString('entityTitle', { nullable: true }),
    externalUrl: t.exposeString('externalUrl', { nullable: true }),
    firstReferencedAt: t.expose('firstReferencedAt', { type: 'DateTime' }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Directory type
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamDirectoryRef =
  builder.objectRef<WorkstreamDirectoryRecord>('WorkstreamDirectory');

builder.objectType(WorkstreamDirectoryRef, {
  description: 'A working directory associated with a workstream',
  fields: (t) => ({
    id: t.exposeID('id'),
    workstreamId: t.exposeID('workstreamId'),
    path: t.exposeString('path'),
    label: t.exposeString('label', { nullable: true }),
    isInherited: t.exposeBoolean('isInherited'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Branch Selection type
// ─────────────────────────────────────────────────────────────────────────────

export const BranchSelectionRef =
  builder.objectRef<BranchSelectionRecord>('BranchSelection');

builder.objectType(BranchSelectionRef, {
  description: 'A per-directory branch override with optional worktree',
  fields: (t) => ({
    id: t.exposeID('id'),
    workstreamId: t.exposeID('workstreamId'),
    directoryPath: t.exposeString('directoryPath'),
    branch: t.exposeString('branch'),
    worktreePath: t.exposeString('worktreePath', { nullable: true }),
    baseBranch: t.exposeString('baseBranch'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Directory with Branch Info (computed view)
// ─────────────────────────────────────────────────────────────────────────────

export const DirectoryWithBranchInfoRef =
  builder.objectRef<DirectoryWithBranchInfo>('DirectoryWithBranchInfo');

builder.objectType(DirectoryWithBranchInfoRef, {
  description: 'A directory with its branch selection and computed effective path',
  fields: (t) => ({
    path: t.exposeString('path'),
    effectivePath: t.exposeString('effectivePath'),
    label: t.exposeString('label', { nullable: true }),
    branch: t.exposeString('branch', { nullable: true }),
    baseBranch: t.exposeString('baseBranch'),
    worktreePath: t.exposeString('worktreePath', { nullable: true }),
    isInherited: t.exposeBoolean('isInherited'),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// WorkstreamEntityLink — Reverse lookup: entity → workstreams
// ─────────────────────────────────────────────────────────────────────────────

/** Backing shape for a reverse entity→workstream link result. */
interface WorkstreamEntityLinkShape {
  entityUri: string;
  entityType: string;
  entityTitle: string | null;
  workstreamId: string;
  groupId: string | null;
  createdAt: number;
}

export const WorkstreamEntityLinkRef =
  builder.objectRef<WorkstreamEntityLinkShape>('WorkstreamEntityLink');

builder.objectType(WorkstreamEntityLinkRef, {
  description: 'A link from an entity to a workstream (reverse lookup result)',
  fields: (t) => ({
    entityUri: t.exposeString('entityUri'),
    entityType: t.exposeString('entityType'),
    entityTitle: t.exposeString('entityTitle', { nullable: true }),
    workstreamId: t.exposeID('workstreamId'),
    groupId: t.exposeID('groupId', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    workstream: t.field({
      type: WorkstreamRef,
      description: 'The linked workstream',
      resolve: (link, _args, ctx) => {
        const ws = ctx.db.workstreams.getById(link.workstreamId);
        if (!ws) throw new Error(`Workstream ${link.workstreamId} not found`);
        return ws;
      },
    }),
  }),
});

export type { WorkstreamEntityLinkShape };

// ─────────────────────────────────────────────────────────────────────────────
// User Message History — lightweight items for input up-arrow navigation
// ─────────────────────────────────────────────────────────────────────────────

/** Backing shape for a single user message history item. */
export interface UserMessageHistoryItemShape {
  /** Event row ID — used as cursor for pagination. */
  eventId: number;
  /** The application-level message ID (for scroll targeting in chat UI). */
  messageId: string | null;
  /** The plain-text message the user sent. */
  text: string;
  /** Millisecond timestamp of when the message was sent. */
  timestamp: number;
}

/** Backing shape for the paginated user message history response. */
export interface UserMessageHistoryConnectionShape {
  /** User messages, newest first. */
  items: UserMessageHistoryItemShape[];
  /** Whether older messages exist beyond the returned items. */
  hasMore: boolean;
}

export const UserMessageHistoryItemRef =
  builder.objectRef<UserMessageHistoryItemShape>('UserMessageHistoryItem');

builder.objectType(UserMessageHistoryItemRef, {
  description: 'A user-sent message extracted from the event log (for input history)',
  fields: (t) => ({
    eventId: t.exposeInt('eventId'),
    messageId: t.exposeString('messageId', { nullable: true }),
    text: t.exposeString('text'),
    timestamp: t.expose('timestamp', { type: 'DateTime' }),
  }),
});

export const UserMessageHistoryConnectionRef =
  builder.objectRef<UserMessageHistoryConnectionShape>('UserMessageHistoryConnection');

builder.objectType(UserMessageHistoryConnectionRef, {
  description: 'Paginated user message history for a workstream',
  fields: (t) => ({
    items: t.field({
      type: [UserMessageHistoryItemRef],
      resolve: (parent) => parent.items,
    }),
    hasMore: t.exposeBoolean('hasMore'),
  }),
});

// Lazy imports AFTER all builder.objectType calls — avoids circular import at module evaluation time.
// Pothos resolves field types lazily at schema build time, so this works.
import { WorkstreamGroupRef } from '../workstream-groups/types';
import { WorkstreamTagRef } from '../tags/types';
