/**
 * WorkstreamGroup Queries — GraphQL query fields for workstream groups.
 *
 * @module graphql/domains/workstream-groups/queries
 */

import { builder } from '../../schema/builder';
import { WorkstreamGroupRef, GroupLinkedEntityRef, GroupDirectoryRef } from './types';

builder.queryFields((t) => ({
  workstreamGroup: t.field({
    type: WorkstreamGroupRef,
    nullable: true,
    description: 'Get a workstream group by ID',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => ctx.db.workstreamGroups.getById(String(args.id)),
  }),

  workstreamGroupsByProject: t.field({
    type: [WorkstreamGroupRef],
    description: 'List workstream groups for a project (pinned first)',
    args: { projectId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      ctx.db.workstreamGroups.getByProject(String(args.projectId)),
  }),

  groupLinkedEntities: t.field({
    type: [GroupLinkedEntityRef],
    description: 'Get entities linked to a workstream group',
    args: { groupId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      ctx.db.groupLinkedEntities.getByGroup(String(args.groupId)),
  }),

  groupDirectories: t.field({
    type: [GroupDirectoryRef],
    description: 'Get shared directories for a workstream group',
    args: { groupId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      ctx.db.groupDirectories.getByGroup(String(args.groupId)),
  }),
}));
