/**
 * Routine GraphQL Queries
 *
 * @module graphql/domains/routines/queries
 */

import { builder } from '../../schema/builder';
import { RoutineRef, RoutineRunRef } from './types';

builder.queryFields((t) => ({
  routine: t.field({
    type: RoutineRef,
    nullable: true,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, { id }, ctx) => ctx.db.routines.getById(String(id)),
  }),

  routines: t.field({
    type: [RoutineRef],
    description: 'List all routines',
    resolve: (_root, _args, ctx) => ctx.db.routines.listAll(),
  }),

  routinesByProject: t.field({
    type: [RoutineRef],
    description: 'List routines belonging to a project (via their workstream)',
    args: { projectId: t.arg.id({ required: true }) },
    resolve: (_root, { projectId }, ctx) => ctx.db.routines.listByProject(String(projectId)),
  }),

  activeRoutines: t.field({
    type: [RoutineRef],
    description: 'List routines with active status',
    resolve: (_root, _args, ctx) => ctx.db.routines.listActive(),
  }),

  routineByWorkstreamId: t.field({
    type: RoutineRef,
    nullable: true,
    description: 'Get a routine by its associated workstream ID',
    args: { workstreamId: t.arg.id({ required: true }) },
    resolve: (_root, { workstreamId }, ctx) =>
      ctx.db.routines.getByWorkstreamId(String(workstreamId)),
  }),

  routineRunHistory: t.field({
    type: [RoutineRunRef],
    args: {
      routineId: t.arg.id({ required: true }),
      limit: t.arg.int({ required: false }),
    },
    resolve: (_root, { routineId, limit }, ctx) =>
      ctx.db.routines.getRunHistory(String(routineId), limit ?? 20),
  }),

  routineLatestRun: t.field({
    type: RoutineRunRef,
    nullable: true,
    description: 'Get the most recent run for a routine',
    args: { routineId: t.arg.id({ required: true }) },
    resolve: (_root, { routineId }, ctx) =>
      ctx.db.routines.getLatestRun(String(routineId)),
  }),
}));
