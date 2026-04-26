/**
 * Tag Mutations — GraphQL mutation fields for tag CRUD (via TagFileStore),
 * workstream tag application, and removal.
 *
 * Tags are now stored in JSON files. CRUD operations go through TagFileStore.
 * Applying a tag snapshots the definition into the DB.
 *
 * @module graphql/domains/tags/mutations
 */

import { GraphQLError } from 'graphql';
import type { WorkstreamTagRecord } from '@vienna/app-db';
import { HexColorSchema } from '@vienna/app-db';
import type { TagDefinition } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { TagRef, WorkstreamTagRef, WorktreeModeEnum } from './types';
import { validateString, validateOptionalString } from '../../validation';

// ─────────────────────────────────────────────────────────────────────────────
// Payload types
// ─────────────────────────────────────────────────────────────────────────────

type TagPayloadShape = { tag: TagDefinition | null };

function tagPayload(name: string) {
  return builder
    .objectRef<TagPayloadShape>(`${name}Payload`)
    .implement({
      fields: (t) => ({
        tag: t.field({
          type: TagRef,
          nullable: true,
          resolve: (parent) => parent.tag,
        }),
      }),
    });
}

type WorkstreamTagPayloadShape = { workstreamTag: WorkstreamTagRecord | null; pipelineRunId: string | null };

const CreateTagPayload = tagPayload('CreateTag');
const UpdateTagPayload = tagPayload('UpdateTag');
const DeleteTagPayload = tagPayload('DeleteTag');

const ApplyTagPayload = builder
  .objectRef<WorkstreamTagPayloadShape>('ApplyTagPayload')
  .implement({
    fields: (t) => ({
      workstreamTag: t.field({
        type: WorkstreamTagRef,
        nullable: true,
        resolve: (parent) => parent.workstreamTag,
      }),
      pipelineRunId: t.exposeString('pipelineRunId', { nullable: true }),
    }),
  });

const WorkstreamTagCompletionStatusEnum = builder.enumType('WorkstreamTagCompletionStatus', {
  values: ['completed', 'failed'] as const,
});

type CompleteWorkstreamTagPayloadShape = { workstreamTag: WorkstreamTagRecord | null; alreadyTerminal: boolean };

const CompleteWorkstreamTagPayload = builder
  .objectRef<CompleteWorkstreamTagPayloadShape>('CompleteWorkstreamTagPayload')
  .implement({
    fields: (t) => ({
      workstreamTag: t.field({
        type: WorkstreamTagRef,
        nullable: true,
        resolve: (parent) => parent.workstreamTag,
      }),
      alreadyTerminal: t.exposeBoolean('alreadyTerminal'),
    }),
  });

type RemoveTagPayloadShape = { success: boolean };
const RemoveTagPayload = builder
  .objectRef<RemoveTagPayloadShape>('RemoveTagPayload')
  .implement({
    fields: (t) => ({
      success: t.exposeBoolean('success'),
    }),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

const CreateTagInput = builder.inputType('CreateTagInput', {
  fields: (t) => ({
    projectId: t.id({ required: true }),
    name: t.string({ required: true }),
    instructions: t.string({ required: true }),
    color: t.string(),
    maxDepth: t.int(),
    spawnWorkstream: t.boolean(),
    worktreeMode: t.field({ type: WorktreeModeEnum }),
    dependsOn: t.stringList(),
  }),
});

const UpdateTagInput = builder.inputType('UpdateTagInput', {
  fields: (t) => ({
    name: t.string(),
    instructions: t.string(),
    color: t.string(),
    maxDepth: t.int(),
    spawnWorkstream: t.boolean(),
    worktreeMode: t.field({ type: WorktreeModeEnum }),
    dependsOn: t.stringList(),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  // ─────────────────────────────────────────────────────────────────────────
  // Tag CRUD (writes to JSON files via TagFileStore)
  // ─────────────────────────────────────────────────────────────────────────

  createTag: t.field({
    type: CreateTagPayload,
    description: 'Create a new tag in a project (stored in JSON file)',
    args: { input: t.arg({ type: CreateTagInput, required: true }) },
    resolve: (_root, args, ctx) => {
      if (!ctx.tagFileStore) {
        throw new GraphQLError('Tag file store not available', { extensions: { code: 'UNAVAILABLE' } });
      }
      validateString(args.input.name, 'name', { minLength: 1, maxLength: 200 });
      validateString(args.input.instructions, 'instructions', { minLength: 1, maxLength: 50_000 });
      if (args.input.color) {
        const colorResult = HexColorSchema.safeParse(args.input.color);
        if (!colorResult.success) {
          throw new GraphQLError('Invalid color: must be a hex color (e.g. #3B82F6)', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }
      const projectId = String(args.input.projectId);
      const project = ctx.db.projects.getById(projectId);
      if (!project) {
        throw new GraphQLError('Project not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // Check for duplicate name in merged set
      const existing = ctx.tagFileStore.getByName(projectId, args.input.name);
      if (existing) {
        throw new GraphQLError('A tag with this name already exists', {
          extensions: { code: 'CONFLICT' },
        });
      }

      const newTag: TagDefinition = {
        name: args.input.name,
        instructions: args.input.instructions,
        color: args.input.color ?? '#3B82F6',
        maxDepth: args.input.maxDepth ?? 3,
        spawnWorkstream: args.input.spawnWorkstream ?? false,
        worktreeMode: args.input.worktreeMode ?? 'same',
        dependsOn: args.input.dependsOn ?? [],
      };

      // Add to project-level tags
      const tags = ctx.tagFileStore.getForProject(projectId);
      tags.push(newTag);
      ctx.tagFileStore.setForProject(projectId, tags);

      return { tag: newTag };
    },
  }),

  updateTag: t.field({
    type: UpdateTagPayload,
    description: 'Update a tag by name within a project',
    args: {
      projectId: t.arg.id({ required: true }),
      tagName: t.arg.string({ required: true }),
      input: t.arg({ type: UpdateTagInput, required: true }),
    },
    resolve: (_root, args, ctx) => {
      if (!ctx.tagFileStore) {
        throw new GraphQLError('Tag file store not available', { extensions: { code: 'UNAVAILABLE' } });
      }
      validateOptionalString(args.input.name, 'name', { minLength: 1, maxLength: 200 });
      if (args.input.instructions) {
        validateString(args.input.instructions, 'instructions', { minLength: 1, maxLength: 50_000 });
      }
      if (args.input.color) {
        const colorResult = HexColorSchema.safeParse(args.input.color);
        if (!colorResult.success) {
          throw new GraphQLError('Invalid color: must be a hex color (e.g. #3B82F6)', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      const projectId = String(args.projectId);
      const tags = ctx.tagFileStore.getForProject(projectId);
      const idx = tags.findIndex((l) => l.name === args.tagName);

      if (idx === -1) {
        // Check if it's a global tag — if so, copy it to project scope for editing
        const globalTag = ctx.tagFileStore.getGlobal().find((l) => l.name === args.tagName);
        if (!globalTag) {
          throw new GraphQLError('Tag not found', { extensions: { code: 'NOT_FOUND' } });
        }
        // Copy global to project and apply edits
        const copy = { ...globalTag };
        if (args.input.name) copy.name = args.input.name;
        if (args.input.instructions) copy.instructions = args.input.instructions;
        if (args.input.color) copy.color = args.input.color;
        if (args.input.maxDepth != null) copy.maxDepth = args.input.maxDepth;
        if (args.input.spawnWorkstream != null) copy.spawnWorkstream = args.input.spawnWorkstream;
        if (args.input.worktreeMode) copy.worktreeMode = args.input.worktreeMode;
        if (args.input.dependsOn) copy.dependsOn = args.input.dependsOn;
        tags.push(copy);
        ctx.tagFileStore.setForProject(projectId, tags);
        return { tag: copy };
      }

      // Check for name conflicts
      if (args.input.name && args.input.name !== tags[idx].name) {
        const duplicate = ctx.tagFileStore.getByName(projectId, args.input.name);
        if (duplicate) {
          throw new GraphQLError('A tag with this name already exists', {
            extensions: { code: 'CONFLICT' },
          });
        }
      }

      const tag = tags[idx];
      if (args.input.name) tag.name = args.input.name;
      if (args.input.instructions) tag.instructions = args.input.instructions;
      if (args.input.color) tag.color = args.input.color;
      if (args.input.maxDepth != null) tag.maxDepth = args.input.maxDepth;
      if (args.input.spawnWorkstream != null) tag.spawnWorkstream = args.input.spawnWorkstream;
      if (args.input.worktreeMode) tag.worktreeMode = args.input.worktreeMode;
      if (args.input.dependsOn) tag.dependsOn = args.input.dependsOn;

      ctx.tagFileStore.setForProject(projectId, tags);
      return { tag };
    },
  }),

  deleteTag: t.field({
    type: DeleteTagPayload,
    description: 'Delete a tag from the project scope (does not affect snapshots)',
    args: {
      projectId: t.arg.id({ required: true }),
      tagName: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      if (!ctx.tagFileStore) {
        throw new GraphQLError('Tag file store not available', { extensions: { code: 'UNAVAILABLE' } });
      }
      const projectId = String(args.projectId);
      const tags = ctx.tagFileStore.getForProject(projectId);
      const idx = tags.findIndex((l) => l.name === args.tagName);
      if (idx === -1) return { tag: null };

      const [removed] = tags.splice(idx, 1);
      ctx.tagFileStore.setForProject(projectId, tags);
      return { tag: removed };
    },
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Workstream tag application
  // ─────────────────────────────────────────────────────────────────────────

  applyTagToWorkstream: t.field({
    type: ApplyTagPayload,
    description: 'Apply a tag to a workstream (snapshots definition, starts pipeline)',
    args: {
      workstreamId: t.arg.id({ required: true }),
      tagName: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.tagFileStore) {
        throw new GraphQLError('Tag file store not available', { extensions: { code: 'UNAVAILABLE' } });
      }

      const workstreamId = String(args.workstreamId);
      const workstream = ctx.db.workstreams.getById(workstreamId);
      if (!workstream) {
        throw new GraphQLError('Workstream not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const tag = ctx.tagFileStore.getByName(workstream.projectId, args.tagName);
      if (!tag) {
        throw new GraphQLError('Tag not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // Execute via pipeline (handles DAG dependencies + snapshot)
      if (ctx.tag) {
        const pipelineRunId = await ctx.tag.executePipeline(
          workstreamId,
          [args.tagName],
          'manual',
          workstream.projectId,
        );
        const workstreamTag = ctx.db.tags.getWorkstreamTags(workstreamId)
          .find((wsTag: WorkstreamTagRecord) => wsTag.tagName === args.tagName) ?? null;
        return { workstreamTag, pipelineRunId };
      }

      // Fallback: no executor available, just snapshot without executing
      const workstreamTag = ctx.db.tags.applyTag(workstreamId, tag, 'manual');
      return { workstreamTag, pipelineRunId: null };
    },
  }),

  completeWorkstreamTag: t.field({
    type: CompleteWorkstreamTagPayload,
    description: 'Update the execution status of a tag on a workstream (completed or failed). Advances the DAG pipeline and propagates status to source workstream for delegated tags.',
    args: {
      workstreamId: t.arg.id({ required: true }),
      tagName: t.arg.string({ required: true }),
      status: t.arg({ type: WorkstreamTagCompletionStatusEnum, required: true }),
      error: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      const workstreamId = String(args.workstreamId);
      const wsTags = ctx.db.tags.getWorkstreamTags(workstreamId);
      const match = wsTags.find((wst) => wst.tagName === args.tagName);
      if (!match) {
        throw new GraphQLError(`Tag "${args.tagName}" is not applied to this workstream`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Guard against double-completion
      if (match.status === 'completed' || match.status === 'failed') {
        return { workstreamTag: match, alreadyTerminal: true };
      }

      ctx.db.tags.completeWorkstreamTag(match.id, args.status, args.error ?? undefined);

      // If this is a delegated tag, propagate status back to the source workstream
      if (match.sourceWorkstreamTagId) {
        const sourceWsTag = ctx.db.tags.getWorkstreamTagById(match.sourceWorkstreamTagId);
        if (sourceWsTag && sourceWsTag.status !== 'completed' && sourceWsTag.status !== 'failed') {
          ctx.db.tags.completeWorkstreamTag(sourceWsTag.id, args.status, args.error ?? undefined);
          // Advance the source workstream's pipeline
          if (ctx.tag) {
            if (args.status === 'completed') {
              await ctx.tag.onTagCompleted(sourceWsTag.workstreamId, sourceWsTag.tagName);
            } else {
              await ctx.tag.onTagFailed(sourceWsTag.workstreamId, sourceWsTag.tagName);
            }
          }
        }
      }

      // Advance the current workstream's pipeline
      if (ctx.tag) {
        if (args.status === 'completed') {
          await ctx.tag.onTagCompleted(workstreamId, args.tagName);
        } else {
          await ctx.tag.onTagFailed(workstreamId, args.tagName);
        }
      }

      const updated = ctx.db.tags.getWorkstreamTagById(match.id);
      return { workstreamTag: updated, alreadyTerminal: false };
    },
  }),

  removeTagFromWorkstream: t.field({
    type: RemoveTagPayload,
    description: 'Remove a tag from a workstream',
    args: {
      workstreamId: t.arg.id({ required: true }),
      tagName: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const success = ctx.db.tags.removeTag(String(args.workstreamId), args.tagName);
      return { success };
    },
  }),
}));
