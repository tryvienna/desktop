/**
 * Tasks GraphQL Queries
 *
 * @module graphql/domains/tasks/queries
 */

import { builder } from '../../schema/builder';
import { TaskRef, TaskLabelRef, TaskStatusEnum, TaskPriorityEnum, TaskAssigneeTypeEnum } from './types';

builder.queryFields((t) => ({
  task: t.field({
    type: TaskRef,
    nullable: true,
    description: 'Get a task by ID',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => ctx.db.tasks.getById(String(args.id)),
  }),

  tasks: t.field({
    type: [TaskRef],
    description: 'List tasks for a project with optional filters. All filter args are optional — omit to list all tasks.',
    args: {
      projectId: t.arg.id({ required: true }),
      status: t.arg({ type: TaskStatusEnum, description: 'Filter by status' }),
      priority: t.arg({ type: TaskPriorityEnum, description: 'Filter by priority' }),
      assigneeType: t.arg({ type: TaskAssigneeTypeEnum, description: 'Filter by assignee type' }),
      labelId: t.arg.string({ description: 'Filter by a single label ID (returns tasks that have this label)' }),
      parentId: t.arg.string({ description: 'Filter by parent task ID (returns subtasks). Pass null to get only top-level tasks.' }),
      query: t.arg.string({ description: 'Text search across title, identifier, and description' }),
      limit: t.arg.int({ description: 'Max number of tasks to return' }),
    },
    resolve: (_root, args, ctx) => {
      return ctx.db.tasks.getByProjectFiltered(String(args.projectId), {
        status: args.status ?? undefined,
        priority: args.priority ?? undefined,
        assigneeType: args.assigneeType ?? undefined,
        labelId: args.labelId ?? undefined,
        // null → filter for top-level tasks (no parent), undefined → no filter
        parentId: args.parentId === null ? null : args.parentId ?? undefined,
        query: args.query ?? undefined,
        limit: args.limit ?? undefined,
      });
    },
  }),

  taskLabels: t.field({
    type: [TaskLabelRef],
    description: 'List task labels for a project',
    args: { projectId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      ctx.db.taskLabels.getByProject(String(args.projectId)),
  }),
}));
