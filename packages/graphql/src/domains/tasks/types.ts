/**
 * Tasks GraphQL Types — Pothos type definitions for tasks and task labels.
 *
 * @module graphql/domains/tasks/types
 */

import { builder } from '../../schema/builder';
import type { TaskRecord, TaskLabelRecord } from '@vienna/app-db';

// ── Enums ────────────────────────────────────────────────────────────────────

export const TaskStatusEnum = builder.enumType('TaskStatus', {
  values: ['backlog', 'todo', 'in_progress', 'done', 'canceled'] as const,
});

export const TaskPriorityEnum = builder.enumType('TaskPriority', {
  values: ['none', 'urgent', 'high', 'medium', 'low'] as const,
});

export const TaskAssigneeTypeEnum = builder.enumType('TaskAssigneeType', {
  values: ['self', 'workstream'] as const,
});

// ── Object references ────────────────────────────────────────────────────────

export const TaskRef = builder.objectRef<TaskRecord>('Task');
export const TaskLabelRef = builder.objectRef<TaskLabelRecord>('TaskLabel');

// ── TaskLabel type ───────────────────────────────────────────────────────────

builder.objectType(TaskLabelRef, {
  description: 'A color-coded label for categorizing tasks',
  fields: (t) => ({
    id: t.exposeID('id'),
    projectId: t.exposeID('projectId'),
    name: t.exposeString('name'),
    color: t.exposeString('color'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

// ── Task type ────────────────────────────────────────────────────────────────

builder.objectType(TaskRef, {
  description: 'A project-scoped task with status, priority, and assignee',
  fields: (t) => ({
    id: t.exposeID('id'),
    projectId: t.exposeID('projectId'),
    identifier: t.exposeString('identifier'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    status: t.expose('status', { type: TaskStatusEnum }),
    priority: t.expose('priority', { type: TaskPriorityEnum }),
    assigneeType: t.expose('assigneeType', { type: TaskAssigneeTypeEnum, nullable: true }),
    assigneeWorkstreamId: t.exposeString('assigneeWorkstreamId', { nullable: true }),
    dueDate: t.exposeString('dueDate', { nullable: true }),
    parentId: t.exposeID('parentId', { nullable: true }),
    links: t.exposeStringList('links'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),

    // Computed: labels via join table
    labels: t.field({
      type: [TaskLabelRef],
      description: 'Labels assigned to this task',
      resolve: (task, _args, ctx) => {
        const labelIds = ctx.db.tasks.getLabelIds(task.id);
        return labelIds
          .map((id: string) => ctx.db.taskLabels.getById(id))
          .filter((l: TaskLabelRecord | null): l is TaskLabelRecord => l !== null);
      },
    }),

    // Computed: subtasks
    subtasks: t.field({
      type: [TaskRef],
      description: 'Child tasks of this task',
      resolve: (task, _args, ctx) => ctx.db.tasks.getByParent(task.id),
    }),

    // Computed: parent task
    parent: t.field({
      type: TaskRef,
      nullable: true,
      description: 'Parent task (if this is a subtask)',
      resolve: (task, _args, ctx) =>
        task.parentId ? ctx.db.tasks.getById(task.parentId) : null,
    }),
  }),
});
