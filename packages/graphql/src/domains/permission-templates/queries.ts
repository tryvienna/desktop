/**
 * Permission Template Queries — List and fetch templates.
 *
 * @module graphql/domains/permission-templates/queries
 */

import { builder } from '../../schema/builder';
import { PermissionTemplateRef } from './types';

builder.queryFields((t) => ({
  /** List all permission templates. */
  permissionTemplates: t.field({
    type: [PermissionTemplateRef],
    description: 'List all permission templates',
    resolve: (_root, _args, ctx) => {
      const settings = ctx.db.settings.get('permissionTemplates');
      return settings.templates;
    },
  }),

  /** Get a single permission template by ID. */
  permissionTemplate: t.field({
    type: PermissionTemplateRef,
    nullable: true,
    description: 'Get a permission template by ID',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const settings = ctx.db.settings.get('permissionTemplates');
      return settings.templates.find((t) => t.id === String(args.id)) ?? null;
    },
  }),
}));
