/**
 * Permission Policy GraphQL Types — Scoped permission overrides.
 *
 * @module graphql/domains/permissions/types
 */

import type { PermissionPolicyRecord } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { PermissionRuleConfigRef } from '../settings/types';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const PermissionScopeTypeEnum = builder.enumType('PermissionScopeType', {
  values: ['project', 'group', 'workstream'] as const,
});

// ─────────────────────────────────────────────────────────────────────────────
// Object types
// ─────────────────────────────────────────────────────────────────────────────

export const PermissionPolicyRef = builder.objectRef<PermissionPolicyRecord>('PermissionPolicy');

builder.objectType(PermissionPolicyRef, {
  description: 'Scoped permission override for a project, group, or workstream',
  fields: (t) => ({
    id: t.exposeID('id'),
    scopeType: t.expose('scopeType', { type: PermissionScopeTypeEnum }),
    scopeId: t.exposeString('scopeId'),
    rules: t.field({
      type: [PermissionRuleConfigRef],
      resolve: (policy) => policy.rules,
    }),
    templateId: t.exposeString('templateId', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});
