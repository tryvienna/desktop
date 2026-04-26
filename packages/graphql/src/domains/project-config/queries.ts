/**
 * GraphQL queries for the project configuration system.
 *
 * @module graphql/domains/project-config/queries
 */

import { builder } from '../../schema/builder';
import { resolveConfig, AllSettingsSchema } from '@vienna/app-db';
import type { GlobalTier, UserTier, ProjectTier, ResolvedValue } from '@vienna/app-db';
import { EffectiveConfigRef } from './types';

builder.queryField('effectiveConfig', (t) =>
  t.field({
    type: EffectiveConfigRef,
    nullable: true,
    description: 'Get the effective configuration for a project, resolved across all tiers.',
    args: {
      projectId: t.arg.id({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      // Build global tier from app defaults
      const settingsDefaults = AllSettingsSchema.parse({});
      const global: GlobalTier = {
        settingsDefaults,
        registryDefaults: {
          plugins: ctx.registry ? await ctx.registry.getPluginDefaults() : [],
          skills: ctx.registry ? await ctx.registry.getSkillDefaults() : [],
          quickActions: ctx.registry ? await ctx.registry.getQuickActionDefaults() : [],
        },
      };

      // Build user tier from current state
      const user: UserTier = {
        settings: ctx.db.settings.getAll(),
        installedPlugins: ctx.db.installedPlugins.listAll(),
        installedSkills: ctx.db.installedSkills.listAll(),
      };

      // Build project tiers from project directories
      // Note: ProjectConfigReader is not injected here — we do the reading inline
      // to avoid adding another context dependency. The config files are small.
      const projectDirs = ctx.db.projectDirectories.getByProject(args.projectId as string);
      const projects: ProjectTier[] = [];

      // Dynamically import for reading .vienna/config.json
      const fs = await import('node:fs');
      const path = await import('node:path');
      const { ProjectConfigSchema } = await import('@vienna/app-db');

      for (const dir of projectDirs) {
        const configPath = path.join(dir.path, '.vienna', 'config.json');
        try {
          const raw = JSON.parse(await fs.promises.readFile(configPath, 'utf-8'));
          const result = ProjectConfigSchema.safeParse(raw);
          if (result.success) {
            projects.push({ directory: dir.path, config: result.data });
          }
        } catch {
          // No config or invalid — skip
        }
      }

      // Resolve
      const effective = resolveConfig(global, user, projects);

      // Convert settings Record to array for GraphQL
      const settingsList = Object.entries(effective.settings).map(
        ([key, val]) => ({ key, ...val } as ResolvedValue<unknown> & { key: string }),
      );

      return {
        settings: effective.settings,
        plugins: effective.plugins,
        skills: effective.skills,
        quickActions: effective.quickActions,
        conflicts: effective.conflicts,
        missingRequirements: effective.missingRequirements,
        settingsList,
      };
    },
  }),
);
