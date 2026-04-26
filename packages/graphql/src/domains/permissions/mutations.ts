/**
 * Permission Policy Mutations — Set/delete scoped permission overrides.
 *
 * @module graphql/domains/permissions/mutations
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import { PermissionPolicyRef, PermissionScopeTypeEnum } from './types';
import { PermissionRuleConfigInput } from '../settings/mutations';

builder.mutationFields((t) => ({
  /** Set (upsert) a scoped permission policy. */
  setPermissionPolicy: t.field({
    type: PermissionPolicyRef,
    description: 'Set permission overrides for a project, group, or workstream scope',
    args: {
      scopeType: t.arg({ type: PermissionScopeTypeEnum, required: true }),
      scopeId: t.arg.string({ required: true }),
      rules: t.arg({ type: [PermissionRuleConfigInput], required: true }),
    },
    resolve: (_root, args, ctx) => {
      try {
        const rules = args.rules.map((r) => ({
          tool: r.tool,
          behavior: r.behavior,
          entityType: r.entityType ?? undefined,
        }));
        const result = ctx.db.permissionPolicies.upsert(args.scopeType, args.scopeId, rules, null);

        // Hot-reload permissions for affected running sessions
        ctx.workstream?.reloadPermissionsForScope(args.scopeType, args.scopeId);

        return result;
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to set permission policy',
          { extensions: { code: 'VALIDATION_ERROR' } }
        );
      }
    },
  }),

  /** Delete a scoped permission policy. */
  deletePermissionPolicy: t.field({
    type: 'Boolean',
    description: 'Delete permission overrides for a scope',
    args: {
      scopeType: t.arg({ type: PermissionScopeTypeEnum, required: true }),
      scopeId: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const result = ctx.db.permissionPolicies.deleteByScope(args.scopeType, args.scopeId);

      // Hot-reload permissions for affected running sessions
      ctx.workstream?.reloadPermissionsForScope(args.scopeType, args.scopeId);

      return result;
    },
  }),
}));
