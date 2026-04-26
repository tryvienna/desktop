/**
 * Skills GraphQL Queries
 *
 * @module graphql/domains/skills/queries
 */

import { builder } from '../../schema/builder';
import { InstalledSkillRef, RegistrySkillRef, SkillUpdateRef } from './types';

builder.queryFields((t) => ({
  installedSkills: t.field({
    type: [InstalledSkillRef],
    description: 'List all installed skills',
    resolve: (_root, _args, ctx) => {
      if (!ctx.skills) return [];
      return ctx.skills.list();
    },
  }),

  registrySkills: t.field({
    type: [RegistrySkillRef],
    description: 'List all available skills from enabled registries',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.registry) return [];
      return ctx.registry.getSkills();
    },
  }),

  registrySkillDefaults: t.field({
    type: ['String'],
    description: 'Default skill IDs from the highest-priority registry',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.registry) return [];
      return ctx.registry.getSkillDefaults();
    },
  }),

  skillUpdates: t.field({
    type: [SkillUpdateRef],
    description: 'Check for version updates on installed skills',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.skills) return [];
      return ctx.skills.checkUpdates();
    },
  }),
}));
