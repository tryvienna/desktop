/**
 * Tasks GraphQL Mutations
 *
 * @module graphql/domains/tasks/mutations
 */

import { GraphQLError } from 'graphql';
import { builder, type GraphQLContext } from '../../schema/builder';
import { TaskRef, TaskLabelRef, TaskStatusEnum, TaskPriorityEnum, TaskAssigneeTypeEnum } from './types';
import type { TaskRecord, TaskLabelRecord } from '@vienna/app-db';

// ── Helpers ─────────────────────────────────────────────────────────────────

function syncTaskWorkstreamLink(
  ctx: GraphQLContext,
  taskId: string,
  taskTitle: string,
  oldWorkstreamId: string | null,
  newWorkstreamId: string | null,
) {
  const entityUri = `@vienna//task/${taskId}`;
  const entityType = 'task';

  if (oldWorkstreamId && oldWorkstreamId !== newWorkstreamId) {
    try {
      ctx.db.workstreamLinkedEntities.unlink(oldWorkstreamId, entityUri);
      ctx.workstream?.unlinkEntity(oldWorkstreamId, entityUri);
    } catch {
      // Old workstream may have been deleted — don't block the new link
    }
  }

  if (newWorkstreamId && newWorkstreamId !== oldWorkstreamId) {
    ctx.db.workstreamLinkedEntities.link(newWorkstreamId, entityUri, entityType, taskTitle);
    ctx.workstream?.linkEntity(newWorkstreamId, entityUri, entityType, taskTitle);
  }
}

function validateAssignee(
  assigneeType: string | null | undefined,
  assigneeWorkstreamId: string | null | undefined,
) {
  if (assigneeType === 'workstream' && !assigneeWorkstreamId) {
    throw new GraphQLError('assigneeWorkstreamId is required when assigneeType is workstream', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

// ── Input types ──────────────────────────────────────────────────────────────

const CreateTaskInput = builder.inputType('CreateTaskInput', {
  description: 'Input for creating a new task. Use labelIds (array of label ID strings) to assign labels.',
  fields: (t) => ({
    projectId: t.id({ required: true }),
    title: t.string({ required: true }),
    description: t.string({ description: 'Markdown description' }),
    status: t.field({ type: TaskStatusEnum, description: 'Defaults to todo' }),
    priority: t.field({ type: TaskPriorityEnum, description: 'Defaults to none' }),
    assigneeType: t.field({ type: TaskAssigneeTypeEnum, description: 'self or workstream' }),
    assigneeWorkstreamId: t.string({ description: 'Required when assigneeType is workstream' }),
    dueDate: t.string({ description: 'ISO date string (YYYY-MM-DD)' }),
    parentId: t.string({ description: 'Parent task ID for subtasks' }),
    labelIds: t.stringList({ description: 'Array of TaskLabel IDs to assign. Use taskLabels query to list available labels.' }),
    links: t.stringList({ description: 'Array of entity URIs (e.g. @vienna//github_issue/123)' }),
  }),
});

const UpdateTaskInput = builder.inputType('UpdateTaskInput', {
  description: 'Input for updating a task. Use labelIds (array of label ID strings) to replace all assigned labels.',
  fields: (t) => ({
    title: t.string(),
    description: t.string({ description: 'Markdown description' }),
    status: t.field({ type: TaskStatusEnum }),
    priority: t.field({ type: TaskPriorityEnum }),
    assigneeType: t.field({ type: TaskAssigneeTypeEnum, description: 'self or workstream' }),
    assigneeWorkstreamId: t.string({ description: 'Required when assigneeType is workstream' }),
    dueDate: t.string({ description: 'ISO date string (YYYY-MM-DD)' }),
    parentId: t.string({ description: 'Parent task ID for subtasks' }),
    labelIds: t.stringList({ description: 'Array of TaskLabel IDs — replaces all current labels. Use taskLabels query to list available labels.' }),
    links: t.stringList({ description: 'Array of entity URIs — replaces all current links' }),
  }),
});

// ── Payload types (Relay convention) ─────────────────────────────────────────

type TaskPayloadShape = { task: TaskRecord | null };

const TaskPayload = builder
  .objectRef<TaskPayloadShape>('TaskPayload')
  .implement({
    fields: (t) => ({
      task: t.field({
        type: TaskRef,
        nullable: true,
        resolve: (parent) => parent.task,
      }),
    }),
  });

type TaskLabelPayloadShape = { label: TaskLabelRecord | null };

const TaskLabelPayload = builder
  .objectRef<TaskLabelPayloadShape>('TaskLabelPayload')
  .implement({
    fields: (t) => ({
      label: t.field({
        type: TaskLabelRef,
        nullable: true,
        resolve: (parent) => parent.label,
      }),
    }),
  });

type DeletePayloadShape = { success: boolean };

const DeleteTaskPayload = builder
  .objectRef<DeletePayloadShape>('DeleteTaskPayload')
  .implement({
    fields: (t) => ({
      success: t.exposeBoolean('success'),
    }),
  });

// ── Mutations ────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  createTask: t.field({
    type: TaskPayload,
    description: 'Create a new task. Returns the created task with labels resolved.',
    args: { input: t.arg({ type: CreateTaskInput, required: true }) },
    resolve: (_root, args, ctx) => {
      validateAssignee(args.input.assigneeType, args.input.assigneeWorkstreamId);

      const task = ctx.db.tasks.create({
        projectId: String(args.input.projectId),
        title: args.input.title,
        description: args.input.description ?? null,
        status: args.input.status ?? undefined,
        priority: args.input.priority ?? undefined,
        assigneeType: args.input.assigneeType ?? null,
        assigneeWorkstreamId: args.input.assigneeWorkstreamId ?? null,
        dueDate: args.input.dueDate ?? null,
        parentId: args.input.parentId ?? null,
        labelIds: args.input.labelIds ?? undefined,
        links: args.input.links ?? undefined,
      });

      syncTaskWorkstreamLink(ctx, task.id, task.title, null, task.assigneeWorkstreamId);

      return { task };
    },
  }),

  updateTask: t.field({
    type: TaskPayload,
    description: 'Update a task. Pass only the fields you want to change. Use labelIds (array) to set labels.',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateTaskInput, required: true }),
    },
    resolve: (_root, args, ctx) => {
      // When assigneeType is explicitly set to workstream, require workstreamId
      if (args.input.assigneeType !== undefined) {
        validateAssignee(args.input.assigneeType, args.input.assigneeWorkstreamId);
      }

      const taskId = String(args.id);
      const existing = ctx.db.tasks.getById(taskId);

      const task = ctx.db.tasks.update(taskId, {
        title: args.input.title ?? undefined,
        description: args.input.description,
        status: args.input.status ?? undefined,
        priority: args.input.priority ?? undefined,
        assigneeType: args.input.assigneeType,
        assigneeWorkstreamId: args.input.assigneeWorkstreamId,
        dueDate: args.input.dueDate,
        parentId: args.input.parentId,
        // null → clear all, undefined → no change, array → replace
        labelIds: args.input.labelIds === null ? [] : args.input.labelIds ?? undefined,
        links: args.input.links === null ? [] : args.input.links ?? undefined,
      });

      if (!task) {
        throw new GraphQLError('Task not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      syncTaskWorkstreamLink(
        ctx,
        task.id,
        task.title,
        existing?.assigneeWorkstreamId ?? null,
        task.assigneeWorkstreamId,
      );

      return { task };
    },
  }),

  deleteTask: t.field({
    type: DeleteTaskPayload,
    description: 'Delete a task and its subtasks.',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const taskId = String(args.id);
      const existing = ctx.db.tasks.getById(taskId);

      const success = ctx.db.tasks.delete(taskId);
      if (!success) {
        throw new GraphQLError('Task not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (existing?.assigneeWorkstreamId) {
        syncTaskWorkstreamLink(ctx, taskId, '', existing.assigneeWorkstreamId, null);
      }

      return { success };
    },
  }),

  createTaskLabel: t.field({
    type: TaskLabelPayload,
    description: 'Create a task label for categorizing tasks. Use the returned label ID with createTask/updateTask labelIds.',
    args: {
      projectId: t.arg.id({ required: true }),
      name: t.arg.string({ required: true }),
      color: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const label = ctx.db.taskLabels.create({
        projectId: String(args.projectId),
        name: args.name,
        color: args.color,
      });
      return { label };
    },
  }),

  updateTaskLabel: t.field({
    type: TaskLabelPayload,
    description: 'Update a task label name or color.',
    args: {
      id: t.arg.id({ required: true }),
      name: t.arg.string(),
      color: t.arg.string({ description: 'Hex color (e.g. #3B82F6)' }),
    },
    resolve: (_root, args, ctx) => {
      const label = ctx.db.taskLabels.update(String(args.id), {
        name: args.name ?? undefined,
        color: args.color ?? undefined,
      });
      if (!label) {
        throw new GraphQLError('Task label not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return { label };
    },
  }),

  deleteTaskLabel: t.field({
    type: DeleteTaskPayload,
    description: 'Delete a task label. Removes it from all tasks.',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const success = ctx.db.taskLabels.delete(String(args.id));
      if (!success) {
        throw new GraphQLError('Task label not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return { success };
    },
  }),
}));
