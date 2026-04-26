/**
 * Built-in Workstream Group Entity Definition
 *
 * Wraps the WorkstreamGroupRepository from @vienna/app-db as an entity,
 * converting WorkstreamGroupRecords to BaseEntity format.
 */

import type { AppDb, WorkstreamGroupRecord } from '@vienna/app-db';
import { defineEntity, buildEntityURI } from '@tryvienna/sdk';
import type { BaseEntity, EntityHandlers } from '@tryvienna/sdk';

const URI_PATH = { segments: ['id'] as const };

function groupToEntity(record: WorkstreamGroupRecord): BaseEntity {
  return {
    id: record.id,
    type: 'workstream_group',
    uri: buildEntityURI('workstream_group', { id: record.id }, URI_PATH),
    title: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const workstreamGroupEntity = defineEntity({
  type: 'workstream_group',
  name: 'Scope',
  icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>' },
  source: 'builtin',
  uri: ['id'],
  display: {
    emoji: '\ud83d\udcc2',
    colors: { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
    description: 'Shared working context for a set of related workstreams',
    filterDescriptions: [
      { name: 'projectId', type: 'string', description: 'Filter by parent project ID' },
    ],
  },
});

export function createWorkstreamGroupHandlers(db: AppDb): EntityHandlers {
  return {
    resolve: async (id) => {
      const record = db.workstreamGroups.getById(id['id']!);
      return record ? groupToEntity(record) : null;
    },
    search: async (filters) => {
      const projectId = (filters as Record<string, unknown> | undefined)?.['projectId'] as
        | string
        | undefined;

      let records: WorkstreamGroupRecord[];
      if (projectId) {
        records = db.workstreamGroups.getByProject(projectId);
      } else {
        const projects = db.projects.listAll();
        records = projects.flatMap((p) => db.workstreamGroups.getByProject(p.id));
      }

      let results = records.map(groupToEntity);

      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }

      return results.slice(0, filters?.limit ?? 20);
    },
  };
}
