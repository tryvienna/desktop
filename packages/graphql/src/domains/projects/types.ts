/**
 * Project GraphQL Types — Pothos object types backed by ProjectRecord
 * and ProjectDirectoryRecord.
 *
 * @module graphql/domains/projects/types
 */

import type { ProjectRecord, ProjectDirectoryRecord } from '@vienna/app-db';
import { builder } from '../../schema/builder';

export const ProjectRef = builder.objectRef<ProjectRecord>('Project');
export const ProjectDirectoryRef = builder.objectRef<ProjectDirectoryRecord>('ProjectDirectory');

builder.objectType(ProjectRef, {
  description: 'Top-level container that groups workstreams',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    workstreams: t.field({
      type: [WorkstreamRef],
      description: 'Non-archived workstreams in this project',
      resolve: (project, _args, ctx) => ctx.db.workstreams.getByProject(project.id),
    }),
    directories: t.field({
      type: [ProjectDirectoryRef],
      description: 'Project-level working directories (inherited by all workstreams)',
      resolve: (project, _args, ctx) => ctx.db.projectDirectories.getByProject(project.id),
    }),
  }),
});

builder.objectType(ProjectDirectoryRef, {
  description: 'A project-level working directory that is inherited by all workstreams',
  fields: (t) => ({
    id: t.exposeID('id'),
    projectId: t.exposeID('projectId'),
    path: t.exposeString('path'),
    label: t.exposeString('label', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

// Lazy import to avoid circular dependency (Workstream → Project → Workstream)
import { WorkstreamRef } from '../workstreams/types';
