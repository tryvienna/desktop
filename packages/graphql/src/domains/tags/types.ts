/**
 * Tag GraphQL Types — Pothos object types for tags and workstream tags.
 *
 * Tags are now defined in JSON files (TagFileStore). The Tag type
 * exposes TagDefinition data. WorkstreamTag exposes snapshot data
 * frozen at apply time.
 *
 * @module graphql/domains/tags/types
 */

import type { TagDefinition } from '@vienna/app-db';
import { builder } from '../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamTagStatusEnum = builder.enumType('WorkstreamTagStatus', {
  values: ['pending', 'running', 'completed', 'failed', 'skipped'] as const,
});

export const WorkstreamTagAppliedByEnum = builder.enumType('WorkstreamTagAppliedBy', {
  values: ['manual', 'agent', 'trigger', 'pipeline'] as const,
});

export const WorktreeModeEnum = builder.enumType('WorktreeMode', {
  values: ['same', 'fork', 'from_main'] as const,
});

// ─────────────────────────────────────────────────────────────────────────────
// Tag (from JSON file definitions)
// ─────────────────────────────────────────────────────────────────────────────

export const TagRef = builder.objectRef<TagDefinition>('Tag');

builder.objectType(TagRef, {
  description: 'A tag definition (from JSON file)',
  fields: (t) => ({
    name: t.exposeString('name'),
    instructions: t.exposeString('instructions'),
    color: t.exposeString('color'),
    maxDepth: t.exposeInt('maxDepth'),
    spawnWorkstream: t.exposeBoolean('spawnWorkstream'),
    worktreeMode: t.expose('worktreeMode', { type: WorktreeModeEnum }),
    dependsOn: t.exposeStringList('dependsOn'),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Workstream Tag (snapshot + execution tracking)
// ─────────────────────────────────────────────────────────────────────────────

export const WorkstreamTagRef = builder.objectRef<import('@vienna/app-db').WorkstreamTagRecord>('WorkstreamTag');

builder.objectType(WorkstreamTagRef, {
  description: 'A tag applied to a workstream with snapshot data and execution status',
  fields: (t) => ({
    id: t.exposeID('id'),
    workstreamId: t.exposeID('workstreamId'),
    tagName: t.exposeString('tagName'),
    // Snapshot fields
    tagInstructions: t.exposeString('tagInstructions'),
    tagColor: t.exposeString('tagColor'),
    tagMaxDepth: t.exposeInt('tagMaxDepth'),
    tagSpawnWorkstream: t.exposeBoolean('tagSpawnWorkstream'),
    tagWorktreeMode: t.expose('tagWorktreeMode', { type: WorktreeModeEnum }),
    tagDependsOn: t.exposeStringList('tagDependsOn'),
    // Execution state
    status: t.expose('status', { type: WorkstreamTagStatusEnum }),
    appliedAt: t.expose('appliedAt', { type: 'DateTime' }),
    startedAt: t.expose('startedAt', { type: 'DateTime', nullable: true }),
    completedAt: t.expose('completedAt', { type: 'DateTime', nullable: true }),
    error: t.exposeString('error', { nullable: true }),
    appliedBy: t.expose('appliedBy', { type: WorkstreamTagAppliedByEnum }),
    depth: t.exposeInt('depth'),
    delegatedWorkstreamId: t.exposeID('delegatedWorkstreamId', { nullable: true }),
    sourceWorkstreamTagId: t.exposeID('sourceWorkstreamTagId', { nullable: true }),
    // Resolved tag definition (nullable — tag may have been deleted from JSON)
    tag: t.field({
      type: TagRef,
      nullable: true,
      description: 'Current tag definition (null if tag was deleted)',
      resolve: (wsl, _args, ctx) => {
        if (!ctx.tagFileStore) return null;
        // We need a projectId to look up tags — get it from the workstream
        const workstream = ctx.db.workstreams.getById(wsl.workstreamId);
        if (!workstream) return null;
        return ctx.tagFileStore.getByName(workstream.projectId, wsl.tagName);
      },
    }),
  }),
});
