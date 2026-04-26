/**
 * WorkstreamGroup GraphQL Types — Pothos object types for workstream groups.
 *
 * Groups are named collections of related workstreams within a project.
 * They share linked entities and directories across their workstreams,
 * and appear as collapsible sub-sections in the nav sidebar.
 *
 * @module graphql/domains/workstream-groups/types
 */

import type {
  WorkstreamGroupRecord,
  GroupLinkedEntityRecord,
  GroupDirectoryRecord,
  GroupBranchSelectionRecord,
  WorkstreamStatus,
} from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { ProjectRef } from '../projects/types';
import { WorkstreamRef, WorkstreamStatusEnum } from '../workstreams/types';

// ─────────────────────────────────────────────────────────────────────────────
// Derived status priority (highest priority status wins for collapsed view)
// NOTE: Keep in sync with STATUS_PRIORITY in apps/desktop/src/renderer/hooks/useWorkstreamsNavSections.tsx
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_PRIORITY: Record<WorkstreamStatus, number> = {
  needs_review: 7,
  waiting_permission: 6,
  completed_unviewed: 5,
  processing: 4,
  active: 3,
  idle: 2,
};

function derivedGroupStatus(statuses: WorkstreamStatus[]): WorkstreamStatus | null {
  if (statuses.length === 0) return null;
  let best: WorkstreamStatus = statuses[0]!;
  for (const s of statuses) {
    if ((STATUS_PRIORITY[s] ?? 0) > (STATUS_PRIORITY[best] ?? 0)) {
      best = s;
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Object types
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamGroupRef = builder.objectRef<WorkstreamGroupRecord>('WorkstreamGroup');

builder.objectType(WorkstreamGroupRef, {
  description: 'A named collection of related workstreams within a project',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    emoji: t.exposeString('emoji', { nullable: true }),
    isPinned: t.exposeBoolean('isPinned'),
    autoCreateWorktrees: t.exposeBoolean('autoCreateWorktrees'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    project: t.field({
      type: ProjectRef,
      description: 'The project this group belongs to',
      resolve: (group, _args, ctx) => {
        const project = ctx.db.projects.getById(group.projectId);
        if (!project) {
          throw new Error(`Project ${group.projectId} not found for group ${group.id}`);
        }
        return project;
      },
    }),
    workstreams: t.field({
      type: [WorkstreamRef],
      description: 'Non-archived workstreams in this group',
      resolve: (group, _args, ctx) => ctx.db.workstreams.getByGroup(group.id),
    }),
    linkedEntities: t.field({
      type: [GroupLinkedEntityRef],
      description: 'Entities linked to this group (inherited by all workstreams)',
      resolve: (group, _args, ctx) => ctx.db.groupLinkedEntities.getByGroup(group.id),
    }),
    directories: t.field({
      type: [GroupDirectoryRef],
      description: 'Shared directories for this group (inherited by workstreams on creation)',
      resolve: (group, _args, ctx) => ctx.db.groupDirectories.getByGroup(group.id),
    }),
    branchSelections: t.field({
      type: [GroupBranchSelectionRef],
      description: 'Default branch selections for group directories (inherited on workstream creation)',
      resolve: (group, _args, ctx) => ctx.db.groupBranchSelections.list(group.id),
    }),
    derivedStatus: t.field({
      type: WorkstreamStatusEnum,
      nullable: true,
      description: 'Priority-derived status from child workstreams (highest priority wins). Used for collapsed nav display.',
      resolve: (group, _args, ctx) => {
        const workstreams = ctx.db.workstreams.getByGroup(group.id);
        const statuses = workstreams.map((w) => w.status);
        return derivedGroupStatus(statuses);
      },
    }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Group Linked Entity type
// ─────────────────────────────────────────────────────────────────────────────

export const GroupLinkedEntityRef =
  builder.objectRef<GroupLinkedEntityRecord>('GroupLinkedEntity');

builder.objectType(GroupLinkedEntityRef, {
  description: 'An entity linked to a workstream group — inherited by all workstreams in the group',
  fields: (t) => ({
    groupId: t.exposeID('groupId'),
    entityUri: t.exposeString('entityUri'),
    entityType: t.exposeString('entityType'),
    entityTitle: t.exposeString('entityTitle', { nullable: true }),
    contextOverride: t.exposeString('contextOverride', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Group Directory type
// ─────────────────────────────────────────────────────────────────────────────

export const GroupDirectoryRef =
  builder.objectRef<GroupDirectoryRecord>('GroupDirectory');

builder.objectType(GroupDirectoryRef, {
  description: 'A shared working directory at the group level',
  fields: (t) => ({
    id: t.exposeID('id'),
    groupId: t.exposeID('groupId'),
    path: t.exposeString('path'),
    label: t.exposeString('label', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Group Branch Selection type
// ─────────────────────────────────────────────────────────────────────────────

export const GroupBranchSelectionRef =
  builder.objectRef<GroupBranchSelectionRecord>('GroupBranchSelection');

builder.objectType(GroupBranchSelectionRef, {
  description: 'A default branch selection at the group level — inherited by workstreams on creation',
  fields: (t) => ({
    id: t.exposeID('id'),
    groupId: t.exposeID('groupId'),
    directoryPath: t.exposeString('directoryPath'),
    branch: t.exposeString('branch'),
    baseBranch: t.exposeString('baseBranch'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});
