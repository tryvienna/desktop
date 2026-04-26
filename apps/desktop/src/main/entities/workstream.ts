/**
 * Built-in Workstream Entity Definition
 *
 * Wraps the WorkstreamRepository from @vienna/app-db as an entity,
 * converting WorkstreamRecords to BaseEntity format.
 */

import type { AppDb, WorkstreamRecord } from '@vienna/app-db';
import { defineEntity, buildEntityURI } from '@tryvienna/sdk';
import type { BaseEntity, EntityHandlers } from '@tryvienna/sdk';

const URI_PATH = { segments: ['id'] as const };

function workstreamToEntity(record: WorkstreamRecord): BaseEntity {
  return {
    id: record.id,
    type: 'workstream',
    uri: buildEntityURI('workstream', { id: record.id }, URI_PATH),
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    metadata: {
      projectId: record.projectId,
      groupId: record.groupId,
      status: record.status,
      model: record.model,
      isPinned: record.isPinned,
      messageCount: record.messageCount,
      lastActivityAt: record.lastActivityAt,
      archivedAt: record.archivedAt,
    },
  };
}

export const workstreamEntity = defineEntity({
  type: 'workstream',
  name: 'Workstream',
  icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
  source: 'builtin',
  uri: ['id'],
  display: {
    emoji: '\ud83d\udcac',
    colors: { bg: '#E3F2FD', text: '#1565C0', border: '#90CAF9' },
    description: 'Conversation within a project',
    filterDescriptions: [
      { name: 'projectId', type: 'string', description: 'Filter by parent project ID' },
      { name: 'groupId', type: 'string', description: 'Filter by scope ID' },
    ],
  },
});

export function createWorkstreamHandlers(db: AppDb): EntityHandlers {
  return {
    resolve: async (id) => {
      const record = db.workstreams.getById(id['id']!);
      return record ? workstreamToEntity(record) : null;
    },
    search: async (filters) => {
      const projectId = (filters as Record<string, unknown> | undefined)?.['projectId'] as
        | string
        | undefined;
      let records: WorkstreamRecord[];
      if (projectId) {
        records = [
          ...db.workstreams.getByProject(projectId),
          ...db.workstreams.getArchivedByProject(projectId),
        ];
      } else {
        records = db.workstreams.listAll();
      }

      let results = records.map(workstreamToEntity);

      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }

      return results.slice(0, filters?.limit ?? 20);
    },
  };
}

