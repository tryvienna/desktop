/**
 * Project Mutations — GraphQL mutation fields for projects.
 *
 * Includes project CRUD and project-level directory management.
 * Adding/removing a project directory cascades to all workstreams.
 *
 * @module graphql/domains/projects/mutations
 */

import { GraphQLError } from 'graphql';
import type { ProjectRecord, ProjectDirectoryRecord } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { ProjectRef, ProjectDirectoryRef } from './types';
import { validateString, validateDirectoryPath } from '../../validation';

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

const CreateProjectInput = builder.inputType('CreateProjectInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
  }),
});

const UpdateProjectInput = builder.inputType('UpdateProjectInput', {
  fields: (t) => ({
    name: t.string(),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Payload types for directory mutations
// ─────────────────────────────────────────────────────────────────────────────

type AddProjectDirectoryPayloadShape = {
  project: ProjectRecord | null;
  directory: ProjectDirectoryRecord | null;
};

const AddProjectDirectoryPayload = builder
  .objectRef<AddProjectDirectoryPayloadShape>('AddProjectDirectoryPayload')
  .implement({
    fields: (t) => ({
      project: t.field({
        type: ProjectRef,
        nullable: true,
        resolve: (parent) => parent.project,
      }),
      directory: t.field({
        type: ProjectDirectoryRef,
        nullable: true,
        resolve: (parent) => parent.directory,
      }),
    }),
  });

type RemoveProjectDirectoryPayloadShape = {
  project: ProjectRecord | null;
  removed: boolean;
};

const RemoveProjectDirectoryPayload = builder
  .objectRef<RemoveProjectDirectoryPayloadShape>('RemoveProjectDirectoryPayload')
  .implement({
    fields: (t) => ({
      project: t.field({
        type: ProjectRef,
        nullable: true,
        resolve: (parent) => parent.project,
      }),
      removed: t.exposeBoolean('removed'),
    }),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  createProject: t.field({
    type: ProjectRef,
    description: 'Create a new project',
    args: { input: t.arg({ type: CreateProjectInput, required: true }) },
    resolve: (_root, args, ctx) => {
      validateString(args.input.name, 'name', { minLength: 1, maxLength: 200 });
      return ctx.db.projects.create({ name: args.input.name });
    },
  }),

  updateProject: t.field({
    type: ProjectRef,
    description: 'Update a project',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateProjectInput, required: true }),
    },
    resolve: (_root, args, ctx) => {
      if (args.input.name != null) {
        validateString(args.input.name, 'name', { minLength: 1, maxLength: 200 });
      }
      const result = ctx.db.projects.update(String(args.id), {
        name: args.input.name ?? undefined,
      });
      if (!result) {
        throw new GraphQLError('Project not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return result;
    },
  }),

  deleteProject: t.field({
    type: 'Boolean',
    description: 'Delete a project and all its workstreams',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const allProjects = ctx.db.projects.listAll();
      if (allProjects.length <= 1) {
        throw new GraphQLError('Cannot delete the last project', {
          extensions: { code: 'LAST_PROJECT' },
        });
      }
      return ctx.db.projects.delete(String(args.id));
    },
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Project directory mutations (cascade to workstreams)
  // ─────────────────────────────────────────────────────────────────────────

  addProjectDirectory: t.field({
    type: AddProjectDirectoryPayload,
    description: 'Add a directory to a project. Cascades to all non-archived workstreams.',
    args: {
      projectId: t.arg.id({ required: true }),
      path: t.arg.string({ required: true }),
      label: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      validateDirectoryPath(args.path, 'path');
      const projectId = String(args.projectId);
      const project = ctx.db.projects.getById(projectId);
      if (!project) {
        throw new GraphQLError('Project not found', { extensions: { code: 'NOT_FOUND' } });
      }
      ctx.db.projectDirectories.add(projectId, args.path, args.label ?? undefined);
      const dirs = ctx.db.projectDirectories.getByProject(projectId);
      const directory = dirs.find((d) => d.path === args.path) ?? null;

      return { project, directory };
    },
  }),

  removeProjectDirectory: t.field({
    type: RemoveProjectDirectoryPayload,
    description: 'Remove a directory from a project. Cascades removal to inherited copies and branch selections in all workstreams.',
    args: {
      projectId: t.arg.id({ required: true }),
      path: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const projectId = String(args.projectId);
      const project = ctx.db.projects.getById(projectId);
      if (!project) {
        throw new GraphQLError('Project not found', { extensions: { code: 'NOT_FOUND' } });
      }
      const removed = ctx.db.projectDirectories.remove(projectId, args.path);

      return { project, removed };
    },
  }),
}));
