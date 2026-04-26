/**
 * Skills GraphQL Mutations
 *
 * @module graphql/domains/skills/mutations
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import type { InstalledSkillShape } from '../../schema/builder';
import { InstalledSkillRef } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function unavailable(): GraphQLError {
  return new GraphQLError('Skill manager not available', {
    extensions: { code: 'SERVICE_UNAVAILABLE' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload types
// ─────────────────────────────────────────────────────────────────────────────

type SkillPayloadShape = { skill: InstalledSkillShape | null };

function skillPayload(name: string) {
  return builder
    .objectRef<SkillPayloadShape>(`${name}Payload`)
    .implement({
      fields: (t) => ({
        skill: t.field({
          type: InstalledSkillRef,
          nullable: true,
          resolve: (parent) => parent.skill,
        }),
      }),
    });
}

const InstallSkillPayload = skillPayload('InstallSkill');
const UninstallSkillPayload = builder
  .objectRef<{ success: boolean }>('UninstallSkillPayload')
  .implement({
    fields: (t) => ({
      success: t.exposeBoolean('success'),
    }),
  });
const UpdateSkillPayload = skillPayload('UpdateSkill');
const ToggleSkillPayload = skillPayload('ToggleSkill');

const ActivateSkillPayload = builder
  .objectRef<{ body: string }>('ActivateSkillPayload')
  .implement({
    fields: (t) => ({
      body: t.exposeString('body'),
    }),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  installSkill: t.field({
    type: InstallSkillPayload,
    args: {
      skillId: t.arg.string({ required: true }),
      destination: t.arg.string({ required: false }),
    },
    resolve: async (_root, { skillId, destination }, ctx) => {
      if (!ctx.skills || !ctx.registry) throw unavailable();
      const registrySkills = await ctx.registry.getSkills();
      const registrySkill = registrySkills.find((s) => s.id === skillId);
      if (!registrySkill) {
        throw new GraphQLError(`Skill "${skillId}" not found in any registry`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Resolve destination to a .claude/skills directory
      let resolvedDestination: string | undefined;
      if (destination === 'global') {
        resolvedDestination = path.join(os.homedir(), '.claude', 'skills');
      } else if (destination) {
        // Validate it's a known project directory
        const projects = ctx.db.projects.listAll();
        const allDirs: string[] = [];
        for (const p of projects) {
          const dirs = ctx.db.projectDirectories.getByProject(p.id);
          for (const d of dirs) allDirs.push(d.path);
        }
        if (!allDirs.includes(destination)) {
          throw new GraphQLError('Invalid install destination: not a known project directory', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        resolvedDestination = path.join(destination, '.claude', 'skills');
      }

      const skill = await ctx.skills.install(registrySkill, resolvedDestination);

      return { skill };
    },
  }),

  uninstallSkill: t.field({
    type: UninstallSkillPayload,
    args: { skillId: t.arg.string({ required: true }) },
    resolve: async (_root, { skillId }, ctx) => {
      if (!ctx.skills) throw unavailable();
      const success = await ctx.skills.uninstall(skillId);

      return { success };
    },
  }),

  updateSkill: t.field({
    type: UpdateSkillPayload,
    args: { skillId: t.arg.string({ required: true }) },
    resolve: async (_root, { skillId }, ctx) => {
      if (!ctx.skills) throw unavailable();
      const skill = await ctx.skills.update(skillId);

      return { skill };
    },
  }),

  activateSkill: t.field({
    type: ActivateSkillPayload,
    description: 'Read a skill\'s SKILL.md body for one-shot prompt injection',
    args: { skillId: t.arg.string({ required: true }) },
    resolve: async (_root, { skillId }, ctx) => {
      if (!ctx.skills) throw unavailable();
      const body = await ctx.skills.activate(skillId);
      return { body };
    },
  }),

  toggleSkillEnabled: t.field({
    type: ToggleSkillPayload,
    args: {
      skillId: t.arg.string({ required: true }),
      enabled: t.arg.boolean({ required: true }),
    },
    resolve: (_root, { skillId, enabled }, ctx) => {
      if (!ctx.skills) throw unavailable();
      const skill = ctx.skills.toggleEnabled(skillId, enabled);

      return { skill: skill ?? null };
    },
  }),

  toggleSkillPinned: t.field({
    type: ToggleSkillPayload,
    args: {
      skillId: t.arg.string({ required: true }),
      pinned: t.arg.boolean({ required: true }),
    },
    resolve: (_root, { skillId, pinned }, ctx) => {
      if (!ctx.skills) throw unavailable();
      const skill = ctx.skills.togglePinned(skillId, pinned);
      return { skill: skill ?? null };
    },
  }),

  syncLocalSkills: t.field({
    type: 'Boolean',
    description: 'Re-scan .claude directories for local skills',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.skills) throw unavailable();
      // Get project directories from active projects
      const projects = ctx.db.projects.listAll();
      const projectDirs: string[] = [];
      for (const project of projects) {
        const dirs = ctx.db.projectDirectories.getByProject(project.id);
        for (const dir of dirs) {
          projectDirs.push(dir.path);
        }
      }
      await ctx.skills.syncLocalSkills({
        global: path.join(os.homedir(), '.claude', 'skills'),
        projectDirs,
      });

      return true;
    },
  }),
}));
