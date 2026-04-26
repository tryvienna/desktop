/**
 * Workstream Mutations — GraphQL mutation fields for workstreams.
 *
 * Each mutation returns a unique `[MutationName]Payload` type wrapping the
 * entity, following the Relay mutation convention for future extensibility.
 *
 * @module graphql/domains/workstreams/mutations
 */

import { GraphQLError } from 'graphql';
import type { WorkstreamRecord, BranchSelectionRecord, AppDb } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import type { GitOps } from '../../schema/builder';
import { WorkstreamRef, WorkstreamStatusEnum, BranchSelectionRef } from './types';
import { validateString, validateOptionalString, validateDirectoryPath } from '../../validation';

// ─────────────────────────────────────────────────────────────────────────────
// Payload helper
// ─────────────────────────────────────────────────────────────────────────────

type WorkstreamPayloadShape = { workstream: WorkstreamRecord | null };

/** Create a `[name]Payload` type with a nullable `workstream` field. */
function workstreamPayload(name: string) {
  return builder
    .objectRef<WorkstreamPayloadShape>(`${name}Payload`)
    .implement({
      fields: (t) => ({
        workstream: t.field({
          type: WorkstreamRef,
          nullable: true,
          resolve: (parent) => parent.workstream,
        }),
      }),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload types
// ─────────────────────────────────────────────────────────────────────────────

// CreateWorkstream has a richer payload with optional worktree results
type WorktreeResultShape = { directoryPath: string; branch: string; worktreePath: string | null; error: string | null };

const WorktreeResultRef = builder
  .objectRef<WorktreeResultShape>('WorktreeResult')
  .implement({
    fields: (t) => ({
      directoryPath: t.exposeString('directoryPath'),
      branch: t.exposeString('branch'),
      worktreePath: t.string({ nullable: true, resolve: (parent) => parent.worktreePath }),
      error: t.string({ nullable: true, resolve: (parent) => parent.error }),
    }),
  });

type CreateWorkstreamPayloadShape = {
  workstream: WorkstreamRecord | null;
  worktrees: WorktreeResultShape[] | null;
};

const CreateWorkstreamPayload = builder
  .objectRef<CreateWorkstreamPayloadShape>('CreateWorkstreamPayload')
  .implement({
    fields: (t) => ({
      workstream: t.field({
        type: WorkstreamRef,
        nullable: true,
        resolve: (parent) => parent.workstream,
      }),
      worktrees: t.field({
        type: [WorktreeResultRef],
        nullable: true,
        description: 'Results of worktree creation (only present when createWorktrees was true)',
        resolve: (parent) => parent.worktrees,
      }),
    }),
  });
const UpdateWorkstreamPayload = workstreamPayload('UpdateWorkstream');
const ArchiveWorkstreamPayload = workstreamPayload('ArchiveWorkstream');
const UnarchiveWorkstreamPayload = workstreamPayload('UnarchiveWorkstream');
const PinWorkstreamPayload = workstreamPayload('PinWorkstream');
const UnpinWorkstreamPayload = workstreamPayload('UnpinWorkstream');
const DeleteWorkstreamPayload = workstreamPayload('DeleteWorkstream');
const SendWorkstreamMessagePayload = workstreamPayload('SendWorkstreamMessage');
const StopWorkstreamAgentPayload = workstreamPayload('StopWorkstreamAgent');
const RestartWorkstreamAgentPayload = workstreamPayload('RestartWorkstreamAgent');
const RespondWorkstreamPermissionPayload = workstreamPayload('RespondWorkstreamPermission');
const InterruptWorkstreamAgentPayload = workstreamPayload('InterruptWorkstreamAgent');
const ClearWorkstreamConversationPayload = workstreamPayload('ClearWorkstreamConversation');
const CompactWorkstreamConversationPayload = workstreamPayload('CompactWorkstreamConversation');
const RewindWorkstreamConversationPayload = workstreamPayload('RewindWorkstreamConversation');
const SetWorkstreamInFocusPayload = workstreamPayload('SetWorkstreamInFocus');
type ReplayHistoryPayloadShape = { workstream: WorkstreamRecord | null; hasMore: boolean; oldestEventId: number | null };

const ReplayHistoryPayload = builder
  .objectRef<ReplayHistoryPayloadShape>('ReplayHistoryPayload')
  .implement({
    fields: (t) => ({
      workstream: t.field({
        type: WorkstreamRef,
        nullable: true,
        resolve: (parent) => parent.workstream,
      }),
      hasMore: t.exposeBoolean('hasMore'),
      oldestEventId: t.exposeInt('oldestEventId', { nullable: true }),
    }),
  });
const SwitchWorkstreamModelPayload = workstreamPayload('SwitchWorkstreamModel');
const LinkWorkstreamEntityPayload = workstreamPayload('LinkWorkstreamEntity');
const UnlinkWorkstreamEntityPayload = workstreamPayload('UnlinkWorkstreamEntity');
const SetLinkedEntityContextOverridePayload = workstreamPayload('SetLinkedEntityContextOverride');
const AddWorkstreamReferencePayload = workstreamPayload('AddWorkstreamReference');
const RemoveWorkstreamReferencePayload = workstreamPayload('RemoveWorkstreamReference');
const PromoteWorkstreamReferencePayload = workstreamPayload('PromoteWorkstreamReference');
const RevokePermissionRulePayload = workstreamPayload('RevokePermissionRule');
const AddWorkstreamDirectoryPayload = workstreamPayload('AddWorkstreamDirectory');
const RemoveWorkstreamDirectoryPayload = workstreamPayload('RemoveWorkstreamDirectory');

// ForkWorkstream reuses the same shape as CreateWorkstream
const ForkWorkstreamPayload = builder
  .objectRef<CreateWorkstreamPayloadShape>('ForkWorkstreamPayload')
  .implement({
    fields: (t) => ({
      workstream: t.field({
        type: WorkstreamRef,
        nullable: true,
        resolve: (parent) => parent.workstream,
      }),
      worktrees: t.field({
        type: [WorktreeResultRef],
        nullable: true,
        description: 'Results of worktree creation (only present when createWorktrees was true)',
        resolve: (parent) => parent.worktrees,
      }),
    }),
  });

// Branch selection payloads use a different shape (returns the selection, not the workstream)
type BranchSelectionPayloadShape = { branchSelection: BranchSelectionRecord | null; worktreeError?: string | null };

const SetBranchSelectionPayload = builder
  .objectRef<BranchSelectionPayloadShape>('SetBranchSelectionPayload')
  .implement({
    fields: (t) => ({
      branchSelection: t.field({
        type: BranchSelectionRef,
        nullable: true,
        resolve: (parent) => parent.branchSelection,
      }),
      worktreeError: t.string({
        nullable: true,
        description: 'Error if worktree creation failed (branch selection still saved without worktree)',
        resolve: (parent) => parent.worktreeError ?? null,
      }),
    }),
  });

type RemoveBranchSelectionPayloadShape = { removed: boolean };

const RemoveBranchSelectionPayload = builder
  .objectRef<RemoveBranchSelectionPayloadShape>('RemoveBranchSelectionPayload')
  .implement({
    fields: (t) => ({
      removed: t.exposeBoolean('removed'),
    }),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

const CreateWorkstreamInput = builder.inputType('CreateWorkstreamInput', {
  fields: (t) => ({
    projectId: t.id({ required: true }),
    groupId: t.id(),
    groupName: t.string({ description: 'Name of the group (alternative to groupId — resolved by case-insensitive match)' }),
    title: t.string({ required: true }),
    model: t.string(),
    createWorktrees: t.boolean({ description: 'If true, create git worktrees for each inherited directory' }),
    branchName: t.string({ description: 'Custom branch name for worktrees (auto-generated from title if omitted)' }),
    baseBranch: t.string({ description: 'Base branch for worktrees (e.g. "main"). Uses repo default if omitted' }),
  }),
});

const ForkWorkstreamInput = builder.inputType('ForkWorkstreamInput', {
  fields: (t) => ({
    sourceWorkstreamId: t.id({ required: true, description: 'ID of the workstream to fork from' }),
    messageId: t.id({ description: 'Vienna message ID at the fork point. If omitted, forks at the latest message.' }),
    providerUuid: t.string({ description: 'JSONL uuid from the Claude Code session file at the fork point. If omitted, copies the entire provider session.' }),
    title: t.string({ description: "Title for the forked workstream (defaults to 'Fork of <source title>')" }),
    createWorktrees: t.boolean({ description: 'If true, create new git worktrees for the forked workstream' }),
  }),
});

const UpdateWorkstreamInput = builder.inputType('UpdateWorkstreamInput', {
  fields: (t) => ({
    title: t.string(),
    status: t.field({ type: WorkstreamStatusEnum }),
    model: t.string(),
    isPinned: t.boolean(),
    groupId: t.id(),
  }),
});

const PermissionBehaviorEnum = builder.enumType('PermissionBehavior', {
  values: ['allow', 'deny'] as const,
});

const PermissionScopeEnum = builder.enumType('PermissionScope', {
  values: ['once', 'session', 'permanent'] as const,
});

const PermissionRuleScopeEnum = builder.enumType('PermissionRuleScope', {
  values: ['session', 'persistent'] as const,
});

const PermissionResponseInput = builder.inputType('PermissionResponseInput', {
  description: 'Response to a tool permission request',
  fields: (t) => ({
    behavior: t.field({ type: PermissionBehaviorEnum, required: true }),
    scope: t.field({ type: PermissionScopeEnum, required: true }),
    directories: t.stringList({ required: false }),
    updatedInput: t.field({ type: 'JSON', required: false }),
    message: t.string({ required: false }),
  }),
});

const ImageAttachmentInput = builder.inputType('ImageAttachmentInput', {
  description: 'Metadata for an image attached to a user message',
  fields: (t) => ({
    name: t.string({ required: true }),
    mimeType: t.string({ required: true }),
    size: t.int({ required: true }),
    previewUrl: t.string({ required: true }),
  }),
});

const ImageContentBlockInput = builder.inputType('ImageContentBlockInput', {
  description: 'Base64-encoded image content block for the Claude API',
  fields: (t) => ({
    mediaType: t.string({ required: true }),
    data: t.string({ required: true }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Slugify a string for use in branch names */
function slugify(text: string, maxLength = 50): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
}

/** Create a worktree for a branch selection, falling back to branch-only on error */
async function createWorktreeWithFallback(
  gitOps: GitOps,
  db: AppDb,
  opts: {
    workstreamId: string;
    directoryPath: string;
    branch: string;
    baseBranch?: string;
  },
): Promise<WorktreeResultShape> {
  const targetPath = gitOps.generateWorktreePath(opts.directoryPath, opts.branch);
  try {
    await gitOps.createWorktree(opts.directoryPath, opts.branch, targetPath);
    db.branchSelections.set({
      workstreamId: opts.workstreamId,
      directoryPath: opts.directoryPath,
      branch: opts.branch,
      worktreePath: targetPath,
      baseBranch: opts.baseBranch,
    });
    return { directoryPath: opts.directoryPath, branch: opts.branch, worktreePath: targetPath, error: null };
  } catch (err) {
    db.branchSelections.set({
      workstreamId: opts.workstreamId,
      directoryPath: opts.directoryPath,
      branch: opts.branch,
      baseBranch: opts.baseBranch,
    });
    return {
      directoryPath: opts.directoryPath,
      branch: opts.branch,
      worktreePath: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  createWorkstream: t.field({
    type: CreateWorkstreamPayload,
    description: 'Create a new workstream in a project. Optionally resolve group by name, and create git worktrees for inherited directories.',
    args: { input: t.arg({ type: CreateWorkstreamInput, required: true }) },
    resolve: async (_root, args, ctx) => {
      validateString(args.input.title, 'title', { minLength: 1, maxLength: 200 });
      const projectId = String(args.input.projectId);
      const project = ctx.db.projects.getById(projectId);
      if (!project) {
        throw new GraphQLError('Project not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // Resolve group: groupId takes precedence, then groupName (case-insensitive lookup, auto-create if missing)
      let groupId = args.input.groupId ? String(args.input.groupId) : null;
      if (!groupId && args.input.groupName) {
        const groups = ctx.db.workstreamGroups.getByProject(projectId);
        const match = groups.find(
          (g) => g.name.toLowerCase() === args.input.groupName!.toLowerCase(),
        );
        if (match) {
          groupId = match.id;
        } else {
          // Auto-create the group with inherited project directories
          const newGroup = ctx.db.workstreamGroups.create({ projectId, name: args.input.groupName });
          const projectDirs = ctx.db.projectDirectories.getByProject(projectId);
          for (const dir of projectDirs) {
            ctx.db.groupDirectories.add(newGroup.id, dir.path, dir.label ?? undefined);
          }
          groupId = newGroup.id;
        }
      }
      if (groupId) {
        const group = ctx.db.workstreamGroups.getById(groupId);
        if (!group) {
          throw new GraphQLError('Workstream group not found', { extensions: { code: 'NOT_FOUND' } });
        }
      }

      const workstream = ctx.db.workstreams.create({
        projectId,
        groupId,
        title: args.input.title,
        model: args.input.model ?? null,
      });

      // ── Directory inheritance ─────────────────────────────────────────────
      ctx.db.projectDirectories.inheritToWorkstream(projectId, workstream.id);

      if (groupId) {
        ctx.db.groupDirectories.inheritToWorkstream(groupId, workstream.id);
        const group = ctx.db.workstreamGroups.getById(groupId)!;
        const groupBranchSelections = ctx.db.groupBranchSelections.list(groupId);

        if (group.autoCreateWorktrees && ctx.gitOps && groupBranchSelections.length > 0) {
          const uniqueBranch = `${slugify(group.name)}-${slugify(args.input.title)}-${workstream.id.slice(0, 8)}`;
          for (const sel of groupBranchSelections) {
            await createWorktreeWithFallback(ctx.gitOps, ctx.db, {
              workstreamId: workstream.id,
              directoryPath: sel.directoryPath,
              branch: uniqueBranch,
              baseBranch: sel.baseBranch,
            });
          }
        } else if (groupBranchSelections.length > 0) {
          ctx.db.groupBranchSelections.inheritToWorkstream(groupId, workstream.id);
        }
      }

      // ── Explicit worktree creation (MCP / programmatic callers) ───────────
      let worktrees: WorktreeResultShape[] | null = null;

      if (args.input.createWorktrees) {
        if (!ctx.gitOps) {
          throw new GraphQLError('Git operations not available — cannot create worktrees', {
            extensions: { code: 'SERVICE_UNAVAILABLE' },
          });
        }
        worktrees = [];
        const dirs = ctx.db.workstreamDirectories.getByWorkstream(workstream.id);

        if (dirs.length > 0) {
          const branchName = args.input.branchName
            ?? `workstream-${slugify(args.input.title)}-${workstream.id.slice(0, 8)}`;

          for (const dir of dirs) {
            const result = await createWorktreeWithFallback(ctx.gitOps, ctx.db, {
              workstreamId: workstream.id,
              directoryPath: dir.path,
              branch: branchName,
              baseBranch: args.input.baseBranch ?? undefined,
            });
            worktrees.push(result);
          }
        }
      }

      return { workstream, worktrees };
    },
  }),

  forkWorkstream: t.field({
    type: ForkWorkstreamPayload,
    description: 'Fork a workstream at a specific message, creating a new workstream with conversation context up to that point. If messageId is omitted, forks at the latest message (copies entire conversation).',
    args: { input: t.arg({ type: ForkWorkstreamInput, required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream actions not available', { extensions: { code: 'SERVICE_UNAVAILABLE' } });
      }
      const result = await ctx.workstream.forkWorkstream({
        sourceWorkstreamId: String(args.input.sourceWorkstreamId),
        messageId: args.input.messageId ? String(args.input.messageId) : undefined,
        providerUuid: args.input.providerUuid ?? undefined,
        title: args.input.title ?? undefined,
        createWorktrees: args.input.createWorktrees ?? undefined,
      });
      const workstream = ctx.db.workstreams.getById(result.workstream.id);
      const worktrees: WorktreeResultShape[] | null = result.worktrees
        ? result.worktrees.map((wt) => ({
            directoryPath: wt.directoryPath,
            branch: wt.branch,
            worktreePath: wt.worktreePath ?? null,
            error: wt.error ?? null,
          }))
        : null;
      return { workstream, worktrees };
    },
  }),

  updateWorkstream: t.field({
    type: UpdateWorkstreamPayload,
    description: 'Update a workstream',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateWorkstreamInput, required: true }),
    },
    resolve: (_root, args, ctx) => {
      validateOptionalString(args.input.title, 'title', { minLength: 1, maxLength: 200 });
      const workstream = ctx.db.workstreams.update(String(args.id), {
        title: args.input.title ?? undefined,
        status: args.input.status ?? undefined,
        model: args.input.model !== undefined ? args.input.model : undefined,
        isPinned: args.input.isPinned ?? undefined,
        groupId: args.input.groupId !== undefined ? (args.input.groupId ? String(args.input.groupId) : null) : undefined,
      });
      if (!workstream) {
        throw new GraphQLError('Workstream not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { workstream };
    },
  }),

  archiveWorkstream: t.field({
    type: ArchiveWorkstreamPayload,
    description: 'Archive a workstream',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const id = String(args.id);
      // Stop the agent before archiving so shutdown doesn't reset status to idle
      if (ctx.workstream) {
        await ctx.workstream.stopAgent(id);
      }
      const workstream = ctx.db.workstreams.update(id, { archivedAt: Date.now() });
      if (!workstream) {
        throw new GraphQLError('Workstream not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { workstream };
    },
  }),

  unarchiveWorkstream: t.field({
    type: UnarchiveWorkstreamPayload,
    description: 'Restore an archived workstream',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const workstream = ctx.db.workstreams.update(String(args.id), { archivedAt: null });
      if (!workstream) {
        throw new GraphQLError('Workstream not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { workstream };
    },
  }),

  pinWorkstream: t.field({
    type: PinWorkstreamPayload,
    description: 'Pin a workstream to the top of the list',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const workstream = ctx.db.workstreams.update(String(args.id), { isPinned: true });
      if (!workstream) {
        throw new GraphQLError('Workstream not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { workstream };
    },
  }),

  unpinWorkstream: t.field({
    type: UnpinWorkstreamPayload,
    description: 'Unpin a workstream',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const workstream = ctx.db.workstreams.update(String(args.id), { isPinned: false });
      if (!workstream) {
        throw new GraphQLError('Workstream not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return { workstream };
    },
  }),

  deleteWorkstream: t.field({
    type: DeleteWorkstreamPayload,
    description: 'Permanently delete a workstream and return it for cache eviction',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const id = String(args.id);
      const workstream = ctx.db.workstreams.getById(id);
      if (!workstream) return { workstream: null };

      // Remove any worktrees from disk before the DB cascade deletes the branch selection records
      if (ctx.gitOps) {
        const branchSelections = ctx.db.branchSelections.list(id);
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

      // Stop the agent before deleting — otherwise the running agent's tool results
      // will be silently dropped by WorkstreamManager.handleSessionEvent() when it
      // can't find the workstream record in the DB.
      if (ctx.workstream) {
        await ctx.workstream.stopAgent(id);
      }

      ctx.db.workstreams.delete(id);
      return { workstream };
    },
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Agent command mutations (delegate to ctx.workstream)
  // ───────────────────────────────────────────────────────────────────────

  sendWorkstreamMessage: t.field({
    type: SendWorkstreamMessagePayload,
    description: 'Send a message to a workstream agent (auto-starts if needed)',
    args: {
      workstreamId: t.arg.id({ required: true }),
      text: t.arg.string({ required: true }),
      imageAttachments: t.arg({ type: [ImageAttachmentInput], required: false }),
      imageContentBlocks: t.arg({ type: [ImageContentBlockInput], required: false }),
    },
    resolve: async (_root, args, ctx) => {
      validateString(args.text, 'text', { minLength: 1 });
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.workstreamId);

      // Build content blocks for the provider (base64 image blocks)
      const contentBlocks = args.imageContentBlocks?.map((b) => ({
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: b.mediaType, data: b.data },
      }));

      // Image attachment metadata for UI display / replay
      const imageAttachments = args.imageAttachments?.map((a) => {
        if (!a.previewUrl.startsWith('data:image/')) {
          throw new GraphQLError('previewUrl must be a data:image/ URL', {
            extensions: { code: 'BAD_USER_INPUT', field: 'previewUrl' },
          });
        }
        return {
          name: a.name,
          mimeType: a.mimeType,
          size: a.size,
          previewUrl: a.previewUrl,
        };
      });

      const hasOptions = contentBlocks?.length || imageAttachments?.length;
      await ctx.workstream.sendMessage(
        id,
        args.text,
        hasOptions ? { contentBlocks, imageAttachments } : undefined,
      );
      return { workstream: ctx.db.workstreams.getById(id) };
    },
  }),

  stopWorkstreamAgent: t.field({
    type: StopWorkstreamAgentPayload,
    description: 'Stop the agent for a workstream',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.id);
      await ctx.workstream.stopAgent(id);
      return { workstream: ctx.db.workstreams.getById(id) };
    },
  }),

  restartWorkstreamAgent: t.field({
    type: RestartWorkstreamAgentPayload,
    description: 'Restart the agent for a workstream',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.id);
      await ctx.workstream.restartAgent(id);
      return { workstream: ctx.db.workstreams.getById(id) };
    },
  }),

  respondWorkstreamPermission: t.field({
    type: RespondWorkstreamPermissionPayload,
    description: 'Respond to a tool permission request',
    args: {
      workstreamId: t.arg.id({ required: true }),
      requestId: t.arg.string({ required: true }),
      response: t.arg({ type: PermissionResponseInput, required: true }),
    },
    resolve: (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.workstreamId);
      ctx.workstream.respondPermission(id, args.requestId, {
        behavior: args.response.behavior,
        scope: args.response.scope,
        directories: args.response.directories ?? undefined,
        updatedInput: args.response.updatedInput as Record<string, unknown> | undefined,
        message: args.response.message ?? undefined,
      });
      return { workstream: ctx.db.workstreams.getById(id) };
    },
  }),

  revokePermissionRule: t.field({
    type: RevokePermissionRulePayload,
    description: 'Revoke a permission rule for a workstream agent',
    args: {
      workstreamId: t.arg.id({ required: true }),
      toolName: t.arg.string({ required: true }),
      scope: t.arg({ type: PermissionRuleScopeEnum, required: true }),
    },
    resolve: (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.workstreamId);
      ctx.workstream.revokePermissionRule(id, args.toolName, args.scope);
      return { workstream: ctx.db.workstreams.getById(id) };
    },
  }),

  interruptWorkstreamAgent: t.field({
    type: InterruptWorkstreamAgentPayload,
    description: 'Interrupt the agent current generation',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.id);
      ctx.workstream.interrupt(id);
      return { workstream: ctx.db.workstreams.getById(id) };
    },
  }),

  clearWorkstreamConversation: t.field({
    type: ClearWorkstreamConversationPayload,
    description: 'Clear conversation history and stop the agent',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.id);
      await ctx.workstream.clearConversation(id);
      return { workstream: ctx.db.workstreams.getById(id) };
    },
  }),

  compactWorkstreamConversation: t.field({
    type: CompactWorkstreamConversationPayload,
    description: 'Trigger context compaction for a workstream',
    args: {
      id: t.arg.id({ required: true }),
      instructions: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.id);
      await ctx.workstream.compactConversation(id, args.instructions ?? undefined);
      return { workstream: ctx.db.workstreams.getById(id) };
    },
  }),

  rewindWorkstreamConversation: t.field({
    type: RewindWorkstreamConversationPayload,
    description: 'Rewind a workstream conversation to a specific point, restoring files and forgetting subsequent messages',
    args: {
      id: t.arg.id({ required: true }),
      eventId: t.arg.int({ required: true }),
      /** Role of the message being rewound to — determines checkpoint lookup direction */
      role: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.id);
      await ctx.workstream.rewindConversation(id, args.eventId, args.role ?? undefined);
      return { workstream: ctx.db.workstreams.getById(id) };
    },
  }),

  setWorkstreamInFocus: t.field({
    type: SetWorkstreamInFocusPayload,
    description: 'Set which workstream is visible to the user (null to clear)',
    args: { id: t.arg.id() },
    resolve: (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = args.id ? String(args.id) : null;
      ctx.workstream.setInFocus(id);
      return { workstream: id ? ctx.db.workstreams.getById(id) : null };
    },
  }),

  replayWorkstreamHistory: t.field({
    type: ReplayHistoryPayload,
    description: 'Replay event history for a workstream (events stream via IPC)',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.id);
      const { hasMore, oldestEventId } = ctx.workstream.replayHistory(id);
      return { workstream: ctx.db.workstreams.getById(id), hasMore, oldestEventId };
    },
  }),

  loadMoreWorkstreamHistory: t.field({
    type: ReplayHistoryPayload,
    description: 'Load older event history for a workstream before a cursor (scroll-back pagination)',
    args: {
      id: t.arg.id({ required: true }),
      beforeEventId: t.arg.int({ required: true }),
      limit: t.arg.int({ required: false }),
    },
    resolve: (_root, args, ctx) => {
      if (!ctx.workstream) {
        throw new GraphQLError('Workstream manager not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const id = String(args.id);
      const limit = args.limit ?? 400;
      const { hasMore, oldestEventId } = ctx.workstream.replayHistoryBefore(id, args.beforeEventId, limit);
      return { workstream: ctx.db.workstreams.getById(id), hasMore, oldestEventId };
    },
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Hybrid mutations (DB write + agent side-effect)
  // ───────────────────────────────────────────────────────────────────────

  switchWorkstreamModel: t.field({
    type: SwitchWorkstreamModelPayload,
    description: 'Switch the model for a workstream (persists + restarts agent)',
    args: {
      id: t.arg.id({ required: true }),
      model: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      validateString(args.model, 'model', { minLength: 1 });
      const id = String(args.id);
      const workstream = ctx.db.workstreams.update(id, { model: args.model });
      if (!workstream) {
        throw new GraphQLError('Workstream not found', { extensions: { code: 'NOT_FOUND' } });
      }
      if (ctx.workstream) {
        await ctx.workstream.switchModel(id, args.model);
      }
      return { workstream };
    },
  }),

  linkWorkstreamEntity: t.field({
    type: LinkWorkstreamEntityPayload,
    description: 'Link an entity to a workstream as persistent context',
    args: {
      workstreamId: t.arg.id({ required: true }),
      entityUri: t.arg.string({ required: true }),
      entityType: t.arg.string({ required: true }),
      entityTitle: t.arg.string(),
    },
    resolve: (_root, args, ctx) => {
      const wsId = String(args.workstreamId);
      ctx.db.workstreamLinkedEntities.link(
        wsId,
        args.entityUri,
        args.entityType,
        args.entityTitle ?? undefined,
      );
      if (ctx.workstream) {
        ctx.workstream.linkEntity(wsId, args.entityUri, args.entityType, args.entityTitle ?? undefined);
      }
      return { workstream: ctx.db.workstreams.getById(wsId) };
    },
  }),

  unlinkWorkstreamEntity: t.field({
    type: UnlinkWorkstreamEntityPayload,
    description: 'Remove a linked entity from a workstream',
    args: {
      workstreamId: t.arg.id({ required: true }),
      entityUri: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const wsId = String(args.workstreamId);
      ctx.db.workstreamLinkedEntities.unlink(wsId, args.entityUri);
      if (ctx.workstream) {
        ctx.workstream.unlinkEntity(wsId, args.entityUri);
      }
      return { workstream: ctx.db.workstreams.getById(wsId) };
    },
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Data mutations (DB repos exist, never previously exposed)
  // ───────────────────────────────────────────────────────────────────────

  setLinkedEntityContextOverride: t.field({
    type: SetLinkedEntityContextOverridePayload,
    description: 'Override the auto-generated context for a linked entity',
    args: {
      workstreamId: t.arg.id({ required: true }),
      entityUri: t.arg.string({ required: true }),
      contextOverride: t.arg.string(),
    },
    resolve: (_root, args, ctx) => {
      const wsId = String(args.workstreamId);
      ctx.db.workstreamLinkedEntities.setContextOverride(
        wsId,
        args.entityUri,
        args.contextOverride ?? null,
      );
      return { workstream: ctx.db.workstreams.getById(wsId) };
    },
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Workstream References
  // ───────────────────────────────────────────────────────────────────────

  addWorkstreamReference: t.field({
    type: AddWorkstreamReferencePayload,
    description: 'Add an entity reference to a workstream (auto-detected or agent-added)',
    args: {
      workstreamId: t.arg.id({ required: true }),
      entityUri: t.arg.string({ required: true }),
      entityType: t.arg.string({ required: true }),
      entityTitle: t.arg.string(),
      externalUrl: t.arg.string(),
    },
    resolve: (_root, args, ctx) => {
      const wsId = String(args.workstreamId);
      ctx.db.workstreamReferences.addReference(
        wsId,
        args.entityUri,
        args.entityType,
        args.entityTitle ?? undefined,
        args.externalUrl ?? undefined,
      );
      return { workstream: ctx.db.workstreams.getById(wsId) };
    },
  }),

  removeWorkstreamReference: t.field({
    type: RemoveWorkstreamReferencePayload,
    description: 'Remove (dismiss) an entity reference from a workstream',
    args: {
      workstreamId: t.arg.id({ required: true }),
      entityUri: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const wsId = String(args.workstreamId);
      ctx.db.workstreamReferences.removeReference(wsId, args.entityUri);
      return { workstream: ctx.db.workstreams.getById(wsId) };
    },
  }),

  promoteWorkstreamReference: t.field({
    type: PromoteWorkstreamReferencePayload,
    description: 'Promote a reference to a linked entity (links + removes reference)',
    args: {
      workstreamId: t.arg.id({ required: true }),
      entityUri: t.arg.string({ required: true }),
      entityType: t.arg.string({ required: true }),
      entityTitle: t.arg.string(),
    },
    resolve: (_root, args, ctx) => {
      const wsId = String(args.workstreamId);
      // Link the entity
      ctx.db.workstreamLinkedEntities.link(
        wsId,
        args.entityUri,
        args.entityType,
        args.entityTitle ?? undefined,
      );
      if (ctx.workstream) {
        ctx.workstream.linkEntity(wsId, args.entityUri, args.entityType, args.entityTitle ?? undefined);
      }
      // Remove from references
      ctx.db.workstreamReferences.removeReference(wsId, args.entityUri);
      return { workstream: ctx.db.workstreams.getById(wsId) };
    },
  }),

  addWorkstreamDirectory: t.field({
    type: AddWorkstreamDirectoryPayload,
    description: 'Add a working directory to a workstream',
    args: {
      workstreamId: t.arg.id({ required: true }),
      path: t.arg.string({ required: true }),
      label: t.arg.string(),
    },
    resolve: (_root, args, ctx) => {
      validateDirectoryPath(args.path, 'path');
      const wsId = String(args.workstreamId);
      ctx.db.workstreamDirectories.add(
        wsId,
        args.path,
        args.label ?? undefined,
      );
      return { workstream: ctx.db.workstreams.getById(wsId) };
    },
  }),

  removeWorkstreamDirectory: t.field({
    type: RemoveWorkstreamDirectoryPayload,
    description: 'Remove a working directory from a workstream (also removes its branch selection and optional worktree)',
    args: {
      workstreamId: t.arg.id({ required: true }),
      path: t.arg.string({ required: true }),
      removeWorktree: t.arg.boolean({ defaultValue: false }),
    },
    resolve: async (_root, args, ctx) => {
      const wsId = String(args.workstreamId);

      // Clean up worktree if requested
      if (args.removeWorktree && ctx.gitOps) {
        const existing = ctx.db.branchSelections.get(wsId, args.path);
        if (existing?.worktreePath) {
          try {
            await ctx.gitOps.removeWorktree(args.path, existing.worktreePath);
          } catch {
            // Worktree may already be gone — proceed with removal
          }
        }
      }

      // Cascade: remove branch selection for this directory if one exists
      ctx.db.branchSelections.remove(wsId, args.path);
      ctx.db.workstreamDirectories.remove(wsId, args.path);
      return { workstream: ctx.db.workstreams.getById(wsId) };
    },
  }),

  // ───────────────────────────────────────────────────────────────────────
  // Branch selection mutations
  // ───────────────────────────────────────────────────────────────────────

  setBranchSelection: t.field({
    type: SetBranchSelectionPayload,
    description: 'Set or update a branch selection for a directory. If createWorktree is true and gitOps is available, a worktree will be created automatically.',
    args: {
      workstreamId: t.arg.id({ required: true }),
      directoryPath: t.arg.string({ required: true }),
      branch: t.arg.string({ required: true }),
      worktreePath: t.arg.string(),
      baseBranch: t.arg.string(),
      createWorktree: t.arg.boolean({ defaultValue: false }),
    },
    resolve: async (_root, args, ctx) => {
      validateString(args.branch, 'branch', { minLength: 1, maxLength: 250 });
      if (args.branch.startsWith('-') || args.branch.includes('..')) {
        throw new GraphQLError('Invalid branch name', {
          extensions: { code: 'BAD_USER_INPUT', field: 'branch' },
        });
      }

      const wsId = String(args.workstreamId);
      if (!ctx.db.workstreamDirectories.exists(wsId, args.directoryPath)) {
        throw new GraphQLError('Directory not registered for this workstream', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      let worktreePath = args.worktreePath ?? undefined;

      // Validate caller-provided worktreePath is within the repo's .worktrees/ directory
      if (worktreePath) {
        const normalizedWt = worktreePath.replace(/\/+$/, '');
        const expectedPrefix = `${args.directoryPath}/.worktrees/`;
        if (!normalizedWt.startsWith(expectedPrefix) || normalizedWt.includes('..')) {
          throw new GraphQLError('worktreePath must be within the repository .worktrees/ directory', {
            extensions: { code: 'BAD_USER_INPUT', field: 'worktreePath' },
          });
        }
      }

      // Auto-create worktree if requested and gitOps is available.
      // On failure we still save the branch selection without a worktree path
      // and surface the error message to the caller via worktreeError.
      let worktreeError: string | null = null;
      if (args.createWorktree && ctx.gitOps && !worktreePath) {
        const repoPath = args.directoryPath;
        const targetPath = ctx.gitOps.generateWorktreePath(repoPath, args.branch);
        try {
          await ctx.gitOps.createWorktree(repoPath, args.branch, targetPath);
          worktreePath = targetPath;
        } catch (err) {
          worktreeError = err instanceof Error ? err.message : String(err);
        }
      }

      const branchSelection = ctx.db.branchSelections.set({
        workstreamId: wsId,
        directoryPath: args.directoryPath,
        branch: args.branch,
        worktreePath,
        baseBranch: args.baseBranch ?? undefined,
      });
      return { branchSelection, worktreeError };
    },
  }),

  removeBranchSelection: t.field({
    type: RemoveBranchSelectionPayload,
    description: 'Remove a branch selection for a directory. If removeWorktree is true, the associated worktree will be cleaned up.',
    args: {
      workstreamId: t.arg.id({ required: true }),
      directoryPath: t.arg.string({ required: true }),
      removeWorktree: t.arg.boolean({ defaultValue: false }),
    },
    resolve: async (_root, args, ctx) => {
      const wsId = String(args.workstreamId);

      // Clean up worktree before removing the selection
      if (args.removeWorktree && ctx.gitOps) {
        const existing = ctx.db.branchSelections.get(wsId, args.directoryPath);
        if (existing?.worktreePath) {
          try {
            await ctx.gitOps.removeWorktree(args.directoryPath, existing.worktreePath);
          } catch {
            // Worktree may already be gone or was never created — proceed with DB removal.
            // This is expected when the user's checkout was cleaned up externally.
          }
        }
      }

      const removed = ctx.db.branchSelections.remove(wsId, args.directoryPath);
      return { removed };
    },
  }),
}));
