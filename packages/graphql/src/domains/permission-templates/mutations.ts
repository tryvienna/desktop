/**
 * Permission Template Mutations — Create, update, delete, and apply templates.
 *
 * @module graphql/domains/permission-templates/mutations
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import { PermissionTemplateRef } from './types';
import { PermissionRuleConfigInput } from '../settings/mutations';
import { PermissionScopeTypeEnum } from '../permissions/types';

builder.mutationFields((t) => ({
  /** Create a new permission template. */
  createPermissionTemplate: t.field({
    type: PermissionTemplateRef,
    description: 'Create a new permission template',
    args: {
      name: t.arg.string({ required: true }),
      description: t.arg.string(),
      rules: t.arg({ type: [PermissionRuleConfigInput], required: true }),
    },
    resolve: (_root, args, ctx) => {
      const settings = ctx.db.settings.get('permissionTemplates');
      const now = Date.now();
      const template = {
        id: crypto.randomUUID(),
        name: args.name,
        description: args.description ?? '',
        rules: args.rules.map((r) => ({
          tool: r.tool,
          behavior: r.behavior,
          entityType: r.entityType ?? undefined,
        })),
        createdAt: now,
        updatedAt: now,
      };

      ctx.db.settings.update('permissionTemplates', {
        templates: [...settings.templates, template],
      });

      return template;
    },
  }),

  /** Update an existing permission template. */
  updatePermissionTemplate: t.field({
    type: PermissionTemplateRef,
    description: 'Update a permission template',
    args: {
      id: t.arg.id({ required: true }),
      name: t.arg.string(),
      description: t.arg.string(),
      rules: t.arg({ type: [PermissionRuleConfigInput] }),
    },
    resolve: (_root, args, ctx) => {
      const settings = ctx.db.settings.get('permissionTemplates');
      const id = String(args.id);
      const index = settings.templates.findIndex((t) => t.id === id);

      if (index < 0) {
        throw new GraphQLError('Permission template not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const existing = settings.templates[index]!;
      const updated = {
        ...existing,
        name: args.name ?? existing.name,
        description: args.description ?? existing.description,
        rules: args.rules
          ? args.rules.map((r) => ({
              tool: r.tool,
              behavior: r.behavior,
              entityType: r.entityType ?? undefined,
            }))
          : existing.rules,
        updatedAt: Date.now(),
      };

      const templates = [...settings.templates];
      templates[index] = updated;
      ctx.db.settings.update('permissionTemplates', { templates });

      return updated;
    },
  }),

  /** Delete a permission template. */
  deletePermissionTemplate: t.field({
    type: 'Boolean',
    description: 'Delete a permission template',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const settings = ctx.db.settings.get('permissionTemplates');
      const id = String(args.id);
      const filtered = settings.templates.filter((t) => t.id !== id);

      if (filtered.length === settings.templates.length) {
        return false;
      }

      ctx.db.settings.update('permissionTemplates', { templates: filtered });
      return true;
    },
  }),

  /** Apply a template's rules as a scoped permission policy. */
  applyPermissionTemplate: t.field({
    type: 'Boolean',
    description: 'Copy a template\'s rules as a scoped permission policy for a workstream or group',
    args: {
      templateId: t.arg.id({ required: true }),
      scopeType: t.arg({ type: PermissionScopeTypeEnum, required: true }),
      scopeId: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const settings = ctx.db.settings.get('permissionTemplates');
      const template = settings.templates.find((t) => t.id === String(args.templateId));

      if (!template) {
        throw new GraphQLError('Permission template not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      ctx.db.permissionPolicies.upsert(args.scopeType, args.scopeId, template.rules, String(args.templateId));

      // Hot-reload permissions for affected running sessions
      ctx.workstream?.reloadPermissionsForScope(args.scopeType, args.scopeId);

      return true;
    },
  }),
}));
