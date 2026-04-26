/**
 * Project Queries — GraphQL query fields for projects.
 *
 * @module graphql/domains/projects/queries
 */

import { builder } from '../../schema/builder';
import { ProjectRef, ProjectDirectoryRef } from './types';

builder.queryFields((t) => ({
  project: t.field({
    type: ProjectRef,
    nullable: true,
    description: 'Get a project by ID',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => ctx.db.projects.getById(String(args.id)),
  }),

  projects: t.field({
    type: [ProjectRef],
    description: 'List all projects',
    resolve: (_root, _args, ctx) => ctx.db.projects.listAll(),
  }),

  projectDirectories: t.field({
    type: [ProjectDirectoryRef],
    description: 'List all directories for a project',
    args: { projectId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      ctx.db.projectDirectories.getByProject(String(args.projectId)),
  }),
}));
