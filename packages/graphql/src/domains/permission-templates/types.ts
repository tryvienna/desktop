/**
 * Permission Template Types — Reusable named permission rule sets.
 *
 * @module graphql/domains/permission-templates/types
 */

import type { PermissionTemplate, PermissionTemplatesSettings } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { PermissionRuleConfigRef } from '../settings/types';

export const PermissionTemplateRef = builder.objectRef<PermissionTemplate>('PermissionTemplate');

builder.objectType(PermissionTemplateRef, {
  description: 'A reusable named set of permission rules',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description'),
    rules: t.field({
      type: [PermissionRuleConfigRef],
      resolve: (template) => template.rules,
    }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const PermissionTemplatesSettingsRef = builder.objectRef<PermissionTemplatesSettings>('PermissionTemplatesSettings');

builder.objectType(PermissionTemplatesSettingsRef, {
  description: 'Container for all permission templates',
  fields: (t) => ({
    templates: t.field({
      type: [PermissionTemplateRef],
      resolve: (settings) => settings.templates,
    }),
  }),
});
