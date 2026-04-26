/**
 * Built-in Routine Entity Definition
 *
 * Wraps the RoutineRepository from @vienna/app-db as an entity,
 * converting RoutineRecords to BaseEntity format.
 */

import type { AppDb, RoutineRecord } from '@vienna/app-db';
import { defineEntity, buildEntityURI } from '@tryvienna/sdk';
import type { BaseEntity, EntityHandlers } from '@tryvienna/sdk';

const URI_PATH = { segments: ['id'] as const };

function routineToEntity(record: RoutineRecord): BaseEntity {
  return {
    id: record.id,
    type: 'routine',
    uri: buildEntityURI('routine', { id: record.id }, URI_PATH),
    title: record.name,
    description: record.description ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const routineEntity = defineEntity({
  type: 'routine',
  name: 'Routine',
  icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
  source: 'builtin',
  uri: ['id'],
  display: {
    emoji: '\u23f0',
    colors: { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
    description: 'Scheduled workstream that runs on a cron or interval',
    filterDescriptions: [
      {
        name: 'status',
        type: 'string',
        description: 'Filter by routine status (active, paused, disabled)',
      },
    ],
  },
});

export function createRoutineHandlers(db: AppDb): EntityHandlers {
  return {
    resolve: async (id) => {
      const record = db.routines.getById(id['id']!);
      return record ? routineToEntity(record) : null;
    },
    search: async (filters) => {
      const all = db.routines.listAll();
      let results = all.map(routineToEntity);

      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }

      return results.slice(0, filters?.limit ?? 20);
    },
  };
}
