/**
 * Built-in Tag Entity Definition
 *
 * Wraps TagFileStore (JSON-based tag definitions) as an entity,
 * allowing agents to look up tag instructions.
 *
 * Tags no longer live in the database — they are JSON files.
 * The entity now uses name as the identifier.
 */

import type { AppDb } from '@vienna/app-db';
import type { TagFileStore, TagDefinition } from '@vienna/app-db';
import { defineEntity, buildEntityURI } from '@tryvienna/sdk';
import type { BaseEntity, EntityHandlers } from '@tryvienna/sdk';

const URI_PATH = { segments: ['name'] as const };

function tagToEntity(tag: TagDefinition, _projectId: string): BaseEntity {
  return {
    id: tag.name,
    type: 'tag',
    uri: buildEntityURI('tag', { name: tag.name }, URI_PATH),
    title: tag.name,
    description: tag.instructions,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export interface TagEntityOptions {
  onApplyTag?: (workstreamId: string, tagName: string, appliedBy: string, projectId: string) => Promise<void>;
}

export const tagEntity = defineEntity({
  type: 'tag',
  name: 'Tag',
  icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>' },
  source: 'builtin',
  uri: ['name'],
  display: {
    emoji: '\uD83C\uDFF7\uFE0F',
    colors: { bg: '#F3E8FF', text: '#7C3AED', border: '#C4B5FD' },
    description: 'Executable tag with instructions for workstreams',
    filterDescriptions: [
      { name: 'projectId', type: 'string', description: 'Filter by project ID' },
    ],
  },
});

export function createTagHandlers(db: AppDb, tagFileStore: TagFileStore, _options?: TagEntityOptions): EntityHandlers {
  return {
    resolve: async (id) => {
      // We need a projectId to resolve — check all projects
      const projects = db.projects.listAll();
      for (const project of projects) {
        const tag = tagFileStore.getByName(project.id, id['name']!);
        if (tag) return tagToEntity(tag, project.id);
      }
      return null;
    },
    search: async (filters) => {
      const projectId = (filters as Record<string, unknown> | undefined)?.['projectId'] as
        | string
        | undefined;

      let results: BaseEntity[] = [];

      if (projectId) {
        const tags = tagFileStore.getMerged(projectId);
        results = tags.map((t) => tagToEntity(t, projectId));
      } else {
        // Search across all projects
        const projects = db.projects.listAll();
        for (const project of projects) {
          const tags = tagFileStore.getMerged(project.id);
          results.push(...tags.map((t) => tagToEntity(t, project.id)));
        }
      }

      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((e) => e.title.toLowerCase().includes(q));
      }

      return results.slice(0, filters?.limit ?? 20);
    },
  };
}
