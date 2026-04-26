/**
 * Built-in Task Entity Definition
 *
 * Wraps the TaskRepository from @vienna/app-db as an entity,
 * converting TaskRecords to BaseEntity format.
 */

import type { AppDb, TaskRecord } from '@vienna/app-db';
import { defineEntity, buildEntityURI } from '@tryvienna/sdk';
import type { BaseEntity, EntityHandlers } from '@tryvienna/sdk';

const URI_PATH = { segments: ['id'] as const };

function taskToEntity(record: TaskRecord): BaseEntity {
  return {
    id: record.id,
    type: 'task',
    uri: buildEntityURI('task', { id: record.id }, URI_PATH),
    title: record.title,
    description: record.description ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    metadata: {
      projectId: record.projectId,
      identifier: record.identifier,
      status: record.status,
      priority: record.priority,
      assigneeType: record.assigneeType,
      assigneeWorkstreamId: record.assigneeWorkstreamId,
      dueDate: record.dueDate,
      parentId: record.parentId,
      links: record.links,
    },
  };
}

export const taskEntity = defineEntity({
  type: 'task',
  name: 'Task',
  icon: {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  },
  source: 'builtin',
  uri: ['id'],
  display: {
    emoji: '\u2713',
    colors: { bg: '#EFF6FF', text: '#3B82F6', border: '#93C5FD' },
    description: 'A project-scoped task with status, priority, and assignee',
    filterDescriptions: [
      { name: 'projectId', type: 'string', description: 'Filter by parent project ID' },
      { name: 'status', type: 'string', description: 'Filter by task status' },
      { name: 'priority', type: 'string', description: 'Filter by task priority' },
    ],
  },
});

export function createTaskHandlers(db: AppDb): EntityHandlers {
  return {
    resolve: async (id) => {
      const record = db.tasks.getById(id['id']!);
      return record ? taskToEntity(record) : null;
    },
    search: async (filters) => {
      const projectId = (filters as Record<string, unknown> | undefined)?.['projectId'] as
        | string
        | undefined;

      let records: TaskRecord[];
      if (projectId) {
        records = db.tasks.getByProjectFiltered(projectId, {
          status: (filters as Record<string, unknown>)?.['status'] as string | undefined,
          priority: (filters as Record<string, unknown>)?.['priority'] as string | undefined,
          query: filters?.query ?? undefined,
          limit: filters?.limit ?? undefined,
        });
      } else {
        // No projectId — return empty (tasks are project-scoped)
        records = [];
      }

      let results = records.map(taskToEntity);

      // If no projectId filter but we have a query, try text search across all projects
      if (!projectId && filters?.query) {
        // Tasks are project-scoped, so without projectId we can't efficiently search
        // Return empty rather than scanning all projects
        return [];
      }

      return results.slice(0, filters?.limit ?? 20);
    },
  };
}
