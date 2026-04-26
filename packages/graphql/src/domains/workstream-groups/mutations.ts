/**
 * WorkstreamGroup Mutations — GraphQL mutation fields for workstream groups.
 *
 * Follows Relay mutation convention: each mutation returns a unique
 * `[MutationName]Payload` type wrapping the entity.
 *
 * @module graphql/domains/workstream-groups/mutations
 */

import { GraphQLError } from 'graphql';
import type { WorkstreamGroupRecord } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { WorkstreamGroupRef } from './types';
import { WorkstreamRef } from '../workstreams/types';
import { validateString, validateOptionalString, validateDirectoryPath } from '../../validation';

// ─────────────────────────────────────────────────────────────────────────────
// Payload helpers
// ─────────────────────────────────────────────────────────────────────────────

type GroupPayloadShape = { group: WorkstreamGroupRecord | null };

function groupPayload(name: string) {
  return builder
    .objectRef<GroupPayloadShape>(`${name}Payload`)
    .implement({
      fields: (t) => ({
        group: t.field({
          type: WorkstreamGroupRef,
          nullable: true,
          resolve: (parent) => parent.group,
        }),
      }),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload types
// ─────────────────────────────────────────────────────────────────────────────

const CreateWorkstreamGroupPayload = groupPayload('CreateWorkstreamGroup');
const UpdateWorkstreamGroupPayload = groupPayload('UpdateWorkstreamGroup');
const DeleteWorkstreamGroupPayload = groupPayload('DeleteWorkstreamGroup');
const PinWorkstreamGroupPayload = groupPayload('PinWorkstreamGroup');
const UnpinWorkstreamGroupPayload = groupPayload('UnpinWorkstreamGroup');
const LinkGroupEntityPayload = groupPayload('LinkGroupEntity');
const UnlinkGroupEntityPayload = groupPayload('UnlinkGroupEntity');
const AddGroupDirectoryPayload = groupPayload('AddGroupDirectory');
const RemoveGroupDirectoryPayload = groupPayload('RemoveGroupDirectory');
const ArchiveWorkstreamGroupPayload = groupPayload('ArchiveWorkstreamGroup');
const SetGroupBranchSelectionPayload = groupPayload('SetGroupBranchSelection');
const RemoveGroupBranchSelectionPayload = groupPayload('RemoveGroupBranchSelection');

// Workstream move payload returns the workstream, not the group
import type { WorkstreamRecord } from '@vienna/app-db';
type MovePayloadShape = { workstream: WorkstreamRecord | null };

const AddWorkstreamToGroupPayload = builder
  .objectRef<MovePayloadShape>('AddWorkstreamToGroupPayload')
  .implement({
    fields: (t) => ({
      workstream: t.field({
        type: WorkstreamRef,
        nullable: true,
        resolve: (parent) => parent.workstream,
      }),
    }),
  });

const RemoveWorkstreamFromGroupPayload = builder
  .objectRef<MovePayloadShape>('RemoveWorkstreamFromGroupPayload')
  .implement({
    fields: (t) => ({
      workstream: t.field({
        type: WorkstreamRef,
        nullable: true,
        resolve: (parent) => parent.workstream,
      }),
    }),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

const CreateWorkstreamGroupInput = builder.inputType('CreateWorkstreamGroupInput', {
  fields: (t) => ({
    projectId: t.id({ required: true }),
    name: t.string({ required: true }),
    emoji: t.string(),
  }),
});

const UpdateWorkstreamGroupInput = builder.inputType('UpdateWorkstreamGroupInput', {
  fields: (t) => ({
    name: t.string(),
    emoji: t.string(),
    isPinned: t.boolean(),
    autoCreateWorktrees: t.boolean(),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  createWorkstreamGroup: t.field({
    type: CreateWorkstreamGroupPayload,
    description: 'Create a new workstream group in a project',
    args: { input: t.arg({ type: CreateWorkstreamGroupInput, required: true }) },
    resolve: (_root, args, ctx) => {
      validateString(args.input.name, 'name', { minLength: 1, maxLength: 200 });
      const projectId = String(args.input.projectId);
      const project = ctx.db.projects.getById(projectId);
      if (!project) {
        throw new GraphQLError('Project not found', { extensions: { code: 'NOT_FOUND' } });
      }
      const group = ctx.db.workstreamGroups.create({ projectId, name: args.input.name, emoji: args.input.emoji ?? null });
      // Inherit project directories into the new group
      const projectDirs = ctx.db.projectDirectories.getByProject(projectId);
      for (const dir of projectDirs) {
        ctx.db.groupDirectories.add(group.id, dir.path, dir.label ?? undefined);
      }
      return { group };
    },
  }),

  updateWorkstreamGroup: t.field({
    type: UpdateWorkstreamGroupPayload,
    description: 'Update a workstream group',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateWorkstreamGroupInput, required: true }),
    },
    resolve: (_root, args, ctx) => {
      validateOptionalString(args.input.name, 'name', { minLength: 1, maxLength: 200 });
      const group = ctx.db.workstreamGroups.update(String(args.id), {
        name: args.input.name ?? undefined,
        emoji: args.input.emoji !== undefined ? (args.input.emoji ?? null) : undefined,
        isPinned: args.input.isPinned ?? undefined,
        autoCreateWorktrees: args.input.autoCreateWorktrees ?? undefined,
      });
      if (!group) {
        throw new GraphQLError('Workstream group not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { group };
    },
  }),

  deleteWorkstreamGroup: t.field({
    type: DeleteWorkstreamGroupPayload,
    description: 'Delete a workstream group and all its workstreams permanently.',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const id = String(args.id);
      const group = ctx.db.workstreamGroups.getById(id);
      if (!group) return { group: null };

      // Stop agents, remove worktrees, and delete all workstreams in the group
      const workstreams = ctx.db.workstreams.getByGroup(id);
      for (const ws of workstreams) {
        if (ctx.workstream) {
          await ctx.workstream.stopAgent(ws.id);
        }
        if (ctx.gitOps) {
          const branchSelections = ctx.db.branchSelections.list(ws.id);
          for (const sel of branchSelections) {
            if (sel.worktreePath) {
              try {
                await ctx.gitOps.removeWorktree(sel.directoryPath, sel.worktreePath);
              } catch {
                // Worktree may already be gone — proceed with deletion
              }
            }
          }
        }
        ctx.db.workstreams.delete(ws.id);
      }

      ctx.db.workstreamGroups.delete(id);
      return { group };
    },
  }),

  archiveWorkstreamGroup: t.field({
    type: ArchiveWorkstreamGroupPayload,
    description: 'Archive a workstream group and all its workstreams',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const id = String(args.id);
      const group = ctx.db.workstreamGroups.getById(id);
      if (!group) {
        throw new GraphQLError('Workstream group not found', { extensions: { code: 'NOT_FOUND' } });
      }
      // Stop agents and archive all non-archived workstreams in the group
      const workstreams = ctx.db.workstreams.getByGroup(id);
      for (const ws of workstreams) {
        if (ws.archivedAt == null) {
          if (ctx.workstream) {
            await ctx.workstream.stopAgent(ws.id);
          }
          ctx.db.workstreams.update(ws.id, { archivedAt: Date.now() });
        }
      }
      // Delete the group itself (workstreams become ungrouped)
      ctx.db.workstreamGroups.delete(id);
      return { group };
    },
  }),

  pinWorkstreamGroup: t.field({
    type: PinWorkstreamGroupPayload,
    description: 'Pin a workstream group to the top of the nav',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const group = ctx.db.workstreamGroups.update(String(args.id), { isPinned: true });
      if (!group) {
        throw new GraphQLError('Workstream group not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { group };
    },
  }),

  unpinWorkstreamGroup: t.field({
    type: UnpinWorkstreamGroupPayload,
    description: 'Unpin a workstream group',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const group = ctx.db.workstreamGroups.update(String(args.id), { isPinned: false });
      if (!group) {
        throw new GraphQLError('Workstream group not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { group };
    },
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Workstream membership mutations
  // ───────────────────────────────────────────────────────────────────────

  addWorkstreamToGroup: t.field({
    type: AddWorkstreamToGroupPayload,
    description: 'Move a workstream into a group',
    args: {
      workstreamId: t.arg.id({ required: true }),
      groupId: t.arg.id({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const groupId = String(args.groupId);
      const group = ctx.db.workstreamGroups.getById(groupId);
      if (!group) {
        throw new GraphQLError('Workstream group not found', { extensions: { code: 'NOT_FOUND' } });
      }
      const workstream = ctx.db.workstreams.setGroup(String(args.workstreamId), groupId);
      if (!workstream) {
        throw new GraphQLError('Workstream not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { workstream };
    },
  }),

  removeWorkstreamFromGroup: t.field({
    type: RemoveWorkstreamFromGroupPayload,
    description: 'Remove a workstream from its group (ungroup)',
    args: { workstreamId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const workstream = ctx.db.workstreams.setGroup(String(args.workstreamId), null);
      if (!workstream) {
        throw new GraphQLError('Workstream not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { workstream };
    },
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Group entity linking mutations
  // ───────────────────────────────────────────────────────────────────────

  linkGroupEntity: t.field({
    type: LinkGroupEntityPayload,
    description: 'Link an entity to a workstream group (inherited by all workstreams)',
    args: {
      groupId: t.arg.id({ required: true }),
      entityUri: t.arg.string({ required: true }),
      entityType: t.arg.string({ required: true }),
      entityTitle: t.arg.string(),
    },
    resolve: (_root, args, ctx) => {
      const groupId = String(args.groupId);
      const group = ctx.db.workstreamGroups.getById(groupId);
      if (!group) {
        throw new GraphQLError('Workstream group not found', { extensions: { code: 'NOT_FOUND' } });
      }
      ctx.db.groupLinkedEntities.link(
        groupId,
        args.entityUri,
        args.entityType,
        args.entityTitle ?? undefined,
      );

      // Notify running agents in all member workstreams (without persisting to
      // workstream_linked_entities — these are group-inherited, not direct links)
      if (ctx.workstream) {
        const memberWorkstreams = ctx.db.workstreams.getByGroup(groupId);
        for (const ws of memberWorkstreams) {
          ctx.workstream.notifyEntityLinked(ws.id, args.entityUri, args.entityType, args.entityTitle ?? undefined);
        }
      }

      return { group: ctx.db.workstreamGroups.getById(groupId) };
    },
  }),

  unlinkGroupEntity: t.field({
    type: UnlinkGroupEntityPayload,
    description: 'Remove a linked entity from a workstream group',
    args: {
      groupId: t.arg.id({ required: true }),
      entityUri: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const groupId = String(args.groupId);
      const group = ctx.db.workstreamGroups.getById(groupId);
      if (!group) {
        throw new GraphQLError('Workstream group not found', { extensions: { code: 'NOT_FOUND' } });
      }
      ctx.db.groupLinkedEntities.unlink(groupId, args.entityUri);

      // Notify running agents (without persisting — these are group-inherited)
      if (ctx.workstream) {
        const memberWorkstreams = ctx.db.workstreams.getByGroup(groupId);
        for (const ws of memberWorkstreams) {
          ctx.workstream.notifyEntityUnlinked(ws.id, args.entityUri);
        }
      }

      return { group: ctx.db.workstreamGroups.getById(groupId) };
    },
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Group directory mutations
  // ───────────────────────────────────────────────────────────────────────

  addGroupDirectory: t.field({
    type: AddGroupDirectoryPayload,
    description: 'Add a shared directory to a workstream group (cascades to member workstreams)',
    args: {
      groupId: t.arg.id({ required: true }),
      path: t.arg.string({ required: true }),
      label: t.arg.string(),
    },
    resolve: (_root, args, ctx) => {
      validateDirectoryPath(args.path, 'path');
      const groupId = String(args.groupId);
      const group = ctx.db.workstreamGroups.getById(groupId);
      if (!group) {
        throw new GraphQLError('Workstream group not found', { extensions: { code: 'NOT_FOUND' } });
      }
      ctx.db.groupDirectories.add(groupId, args.path, args.label ?? undefined);
      return { group: ctx.db.workstreamGroups.getById(groupId) };
    },
  }),

  removeGroupDirectory: t.field({
    type: RemoveGroupDirectoryPayload,
    description: 'Remove a shared directory from a workstream group (cascades inherited copies)',
    args: {
      groupId: t.arg.id({ required: true }),
      path: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const groupId = String(args.groupId);
      ctx.db.groupDirectories.remove(groupId, args.path);
      // Also remove any branch selection for this directory
      ctx.db.groupBranchSelections.remove(groupId, args.path);
      return { group: ctx.db.workstreamGroups.getById(groupId) };
    },
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Group branch selection mutations
  // ───────────────────────────────────────────────────────────────────────

  setGroupBranchSelection: t.field({
    type: SetGroupBranchSelectionPayload,
    description: 'Set or update a default branch selection for a group directory',
    args: {
      groupId: t.arg.id({ required: true }),
      directoryPath: t.arg.string({ required: true }),
      branch: t.arg.string({ required: true }),
      baseBranch: t.arg.string(),
    },
    resolve: (_root, args, ctx) => {
      validateString(args.branch, 'branch', { minLength: 1, maxLength: 250 });
      if (args.branch.startsWith('-') || args.branch.includes('..')) {
        throw new GraphQLError('Invalid branch name', {
          extensions: { code: 'BAD_USER_INPUT', field: 'branch' },
        });
      }
      const groupId = String(args.groupId);
      const group = ctx.db.workstreamGroups.getById(groupId);
      if (!group) {
        throw new GraphQLError('Workstream group not found', { extensions: { code: 'NOT_FOUND' } });
      }
      if (!ctx.db.groupDirectories.exists(groupId, args.directoryPath)) {
        throw new GraphQLError('Directory not registered for this group', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      ctx.db.groupBranchSelections.set(
        groupId,
        args.directoryPath,
        args.branch,
        args.baseBranch ?? undefined,
      );
      return { group: ctx.db.workstreamGroups.getById(groupId) };
    },
  }),

  removeGroupBranchSelection: t.field({
    type: RemoveGroupBranchSelectionPayload,
    description: 'Remove a default branch selection for a group directory',
    args: {
      groupId: t.arg.id({ required: true }),
      directoryPath: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const groupId = String(args.groupId);
      ctx.db.groupBranchSelections.remove(groupId, args.directoryPath);
      return { group: ctx.db.workstreamGroups.getById(groupId) };
    },
  }),
}));
