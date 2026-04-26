/**
 * Permission Policy Queries — Read scoped permission overrides.
 *
 * @module graphql/domains/permissions/queries
 */

import { resolvePermissions } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { PermissionPolicyRef, PermissionScopeTypeEnum } from './types';
import { PermissionRuleConfigRef } from '../settings/types';

builder.queryFields((t) => ({
  /** Get the permission policy for a specific scope. */
  permissionPolicy: t.field({
    type: PermissionPolicyRef,
    nullable: true,
    args: {
      scopeType: t.arg({ type: PermissionScopeTypeEnum, required: true }),
      scopeId: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) =>
      ctx.db.permissionPolicies.getByScope(args.scopeType, args.scopeId),
  }),

  /** Get the resolved (cascaded) permissions for a workstream. */
  resolvedPermissions: t.field({
    type: [PermissionRuleConfigRef],
    args: { workstreamId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const ws = ctx.db.workstreams.getById(String(args.workstreamId));
      if (!ws) return [];

      const globalSettings = ctx.db.settings.get('permissions');

      // Build scope chain: project → group (if any) → workstream
      const chain: Array<{ scopeType: string; scopeId: string }> = [
        { scopeType: 'project', scopeId: ws.projectId },
      ];
      if (ws.groupId) {
        chain.push({ scopeType: 'group', scopeId: ws.groupId });
      }
      chain.push({ scopeType: 'workstream', scopeId: ws.id });

      const overrides = ctx.db.permissionPolicies.getForChain(chain);
      return resolvePermissions(globalSettings, overrides);
    },
  }),

  /**
   * Resolve permissions from all scopes ABOVE the given scope.
   * For a workstream: global → project → group
   * For a group: global → project
   * For a project: just global
   */
  resolvedParentPermissions: t.field({
    type: [PermissionRuleConfigRef],
    args: {
      scopeType: t.arg({ type: PermissionScopeTypeEnum, required: true }),
      scopeId: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) => {
      const globalSettings = ctx.db.settings.get('permissions');

      if (args.scopeType === 'project') {
        // Project level: only global settings apply as parent
        return resolvePermissions(globalSettings, []);
      }

      if (args.scopeType === 'group') {
        // Group level: global → project
        const group = ctx.db.workstreamGroups.getById(args.scopeId);
        if (!group) return resolvePermissions(globalSettings, []);

        const chain = [{ scopeType: 'project', scopeId: group.projectId }];
        const overrides = ctx.db.permissionPolicies.getForChain(chain);
        return resolvePermissions(globalSettings, overrides);
      }

      if (args.scopeType === 'workstream') {
        // Workstream level: global → project → group (if any)
        const ws = ctx.db.workstreams.getById(args.scopeId);
        if (!ws) return resolvePermissions(globalSettings, []);

        const chain: Array<{ scopeType: string; scopeId: string }> = [
          { scopeType: 'project', scopeId: ws.projectId },
        ];
        if (ws.groupId) {
          chain.push({ scopeType: 'group', scopeId: ws.groupId });
        }
        const overrides = ctx.db.permissionPolicies.getForChain(chain);
        return resolvePermissions(globalSettings, overrides);
      }

      return resolvePermissions(globalSettings, []);
    },
  }),
}));
