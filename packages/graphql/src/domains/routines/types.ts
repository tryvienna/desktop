/**
 * Routine GraphQL Types — Pothos object types backed by RoutineRecord.
 *
 * @module graphql/domains/routines/types
 */

import type { RoutineRecord, RoutineRunRecord, RoutineSchedule } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { WorkstreamRef } from '../workstreams/types';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const RoutineStatusEnum = builder.enumType('RoutineStatus', {
  values: ['active', 'paused', 'disabled'] as const,
});

export const ScheduleTypeEnum = builder.enumType('ScheduleType', {
  values: ['cron', 'interval'] as const,
});

export const RoutineRunStatusEnum = builder.enumType('RoutineRunStatus', {
  values: ['pending', 'running', 'completed', 'failed', 'skipped'] as const,
});

export const RoutineRunTriggeredByEnum = builder.enumType('RoutineRunTriggeredBy', {
  values: ['schedule', 'manual', 'retry'] as const,
});

// ─────────────────────────────────────────────────────────────────────────────
// Embedded object: RoutineSchedule (not a normalized entity)
// ─────────────────────────────────────────────────────────────────────────────

export const RoutineScheduleRef = builder.objectRef<RoutineSchedule>('RoutineSchedule');

builder.objectType(RoutineScheduleRef, {
  description: 'Schedule configuration for a routine',
  fields: (t) => ({
    type: t.expose('type', { type: ScheduleTypeEnum }),
    expression: t.exposeString('expression'),
    timezone: t.exposeString('timezone', { nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Routine type
// ─────────────────────────────────────────────────────────────────────────────

export const RoutineRef = builder.objectRef<RoutineRecord>('Routine');

builder.objectType(RoutineRef, {
  description: 'A scheduled workstream that runs on a cron or interval',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    prompt: t.exposeString('prompt'),
    workstreamId: t.exposeString('workstreamId'),
    status: t.expose('status', { type: RoutineStatusEnum }),
    schedule: t.expose('schedule', { type: RoutineScheduleRef }),
    preferences: t.expose('preferences', { type: 'JSON' }),
    runCount: t.exposeInt('runCount'),
    lastRunAt: t.expose('lastRunAt', { type: 'DateTime', nullable: true }),
    nextRunAt: t.expose('nextRunAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    workstream: t.field({
      type: WorkstreamRef,
      description: 'The dedicated workstream for this routine',
      resolve: (routine, _args, ctx) => {
        const ws = ctx.db.workstreams.getById(routine.workstreamId);
        if (!ws) {
          throw new Error(
            `Workstream ${routine.workstreamId} not found for routine ${routine.id}`
          );
        }
        return ws;
      },
    }),
    runs: t.field({
      type: [RoutineRunRef],
      description: 'Recent execution history',
      args: { limit: t.arg.int({ defaultValue: 10 }) },
      resolve: (routine, args, ctx) =>
        ctx.db.routines.getRunHistory(routine.id, args.limit ?? 10),
    }),
    latestRun: t.field({
      type: RoutineRunRef,
      nullable: true,
      description: 'The most recent run record',
      resolve: (routine, _args, ctx) => ctx.db.routines.getLatestRun(routine.id),
    }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// RoutineRun type
// ─────────────────────────────────────────────────────────────────────────────

export const RoutineRunRef = builder.objectRef<RoutineRunRecord>('RoutineRun');

builder.objectType(RoutineRunRef, {
  description: 'A single execution record for a routine',
  fields: (t) => ({
    id: t.exposeID('id'),
    routineId: t.exposeString('routineId'),
    status: t.expose('status', { type: RoutineRunStatusEnum }),
    triggeredBy: t.expose('triggeredBy', { type: RoutineRunTriggeredByEnum }),
    startedAt: t.expose('startedAt', { type: 'DateTime' }),
    completedAt: t.expose('completedAt', { type: 'DateTime', nullable: true }),
    summary: t.exposeString('summary', { nullable: true }),
    error: t.exposeString('error', { nullable: true }),
    metadata: t.expose('metadata', { type: 'JSON' }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});
