/**
 * Built-in Project Entity Definition
 *
 * Wraps the ProjectRepository from @vienna/app-db as an entity,
 * converting ProjectRecords to BaseEntity format.
 */

import type { AppDb, ProjectRecord } from '@vienna/app-db';
import { defineEntity, buildEntityURI } from '@tryvienna/sdk';
import type { BaseEntity, EntityHandlers } from '@tryvienna/sdk';

const URI_PATH = { segments: ['id'] as const };

function projectToEntity(record: ProjectRecord): BaseEntity {
  return {
    id: record.id,
    type: 'project',
    uri: buildEntityURI('project', { id: record.id }, URI_PATH),
    title: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const projectEntity = defineEntity({
  type: 'project',
  name: 'Project',
  icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' },
  source: 'builtin',
  uri: ['id'],
  display: {
    emoji: '\ud83d\udcc1',
    colors: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
    description: 'Top-level container that groups workstreams',
  },
});

export function createProjectHandlers(db: AppDb): EntityHandlers {
  return {
    resolve: async (id) => {
      const record = db.projects.getById(id['id']!);
      return record ? projectToEntity(record) : null;
    },
    search: async (filters) => {
      const all = db.projects.listAll();
      let results = all.map(projectToEntity);

      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }

      return results.slice(0, filters?.limit ?? 20);
    },
  };
}
