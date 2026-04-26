/**
 * Routine GraphQL Mutations
 *
 * Each mutation returns a unique `[MutationName]Payload` type wrapping the
 * entity, following the Relay mutation convention for future extensibility.
 *
 * @module graphql/domains/routines/mutations
 */

import { GraphQLError } from 'graphql';
import type { RoutineRecord } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { RoutineRef, ScheduleTypeEnum } from './types';
import { validateString, validateOptionalString } from '../../validation';

// ─────────────────────────────────────────────────────────────────────────────
// Payload helper
// ─────────────────────────────────────────────────────────────────────────────

type RoutinePayloadShape = { routine: RoutineRecord | null };

/** Narrow Pothos's `{}` JSON scalar to Record<string, unknown> */
function toRecord(value: {} | null | undefined): Record<string, unknown> | undefined {
  if (value == null) return undefined;
  return value as Record<string, unknown>;
}

/** Create a `[name]Payload` type with a nullable `routine` field. */
function routinePayload(name: string) {
  return builder
    .objectRef<RoutinePayloadShape>(`${name}Payload`)
    .implement({
      fields: (t) => ({
        routine: t.field({
          type: RoutineRef,
          nullable: true,
          resolve: (parent) => parent.routine,
        }),
      }),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload types
// ─────────────────────────────────────────────────────────────────────────────

const CreateRoutinePayload = routinePayload('CreateRoutine');
const UpdateRoutinePayload = routinePayload('UpdateRoutine');
const DeleteRoutinePayload = routinePayload('DeleteRoutine');
const PauseRoutinePayload = routinePayload('PauseRoutine');
const ResumeRoutinePayload = routinePayload('ResumeRoutine');
const RunRoutineNowPayload = routinePayload('RunRoutineNow');

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

const RoutineScheduleInput = builder.inputType('RoutineScheduleInput', {
  fields: (t) => ({
    type: t.field({ type: ScheduleTypeEnum, required: true }),
    expression: t.string({ required: true }),
    timezone: t.string({ required: false }),
  }),
});

const CreateRoutineInput = builder.inputType('CreateRoutineInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string({ required: false }),
    prompt: t.string({ required: true }),
    projectId: t.id({ required: true }),
    schedule: t.field({ type: RoutineScheduleInput, required: true }),
    preferences: t.field({ type: 'JSON', required: false }),
  }),
});

const UpdateRoutineInput = builder.inputType('UpdateRoutineInput', {
  fields: (t) => ({
    name: t.string({ required: false }),
    description: t.string({ required: false }),
    prompt: t.string({ required: false }),
    schedule: t.field({ type: RoutineScheduleInput, required: false }),
    preferences: t.field({ type: 'JSON', required: false }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  createRoutine: t.field({
    type: CreateRoutinePayload,
    args: { input: t.arg({ type: CreateRoutineInput, required: true }) },
    resolve: (_root, { input }, ctx) => {
      validateString(input.name, 'name', { minLength: 1, maxLength: 200 });
      validateString(input.prompt, 'prompt', { minLength: 1 });
      validateOptionalString(input.description, 'description', { maxLength: 2000 });
      return {
        routine: ctx.db.routines.create({
          name: input.name,
          description: input.description ?? null,
          prompt: input.prompt,
          projectId: String(input.projectId),
          schedule: {
            type: input.schedule.type,
            expression: input.schedule.expression,
            timezone: input.schedule.timezone ?? undefined,
          },
          preferences: toRecord(input.preferences),
        }),
      };
    },
  }),

  updateRoutine: t.field({
    type: UpdateRoutinePayload,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateRoutineInput, required: true }),
    },
    resolve: (_root, { id, input }, ctx) => {
      validateOptionalString(input.name, 'name', { minLength: 1, maxLength: 200 });
      validateOptionalString(input.prompt, 'prompt', { minLength: 1 });
      validateOptionalString(input.description, 'description', { maxLength: 2000 });
      return {
        routine:
          ctx.db.routines.update(String(id), {
            name: input.name ?? undefined,
            description: input.description,
            prompt: input.prompt ?? undefined,
            schedule: input.schedule
              ? {
                  type: input.schedule.type,
                  expression: input.schedule.expression,
                  timezone: input.schedule.timezone ?? undefined,
                }
              : undefined,
            preferences: toRecord(input.preferences),
          }) ?? null,
      };
    },
  }),

  deleteRoutine: t.field({
    type: DeleteRoutinePayload,
    description: 'Delete a routine and return it for cache eviction',
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, { id }, ctx) => {
      const routineId = String(id);
      const routine = ctx.db.routines.getById(routineId);
      if (!routine) return { routine: null };
      ctx.db.routines.delete(routineId);
      return { routine };
    },
  }),

  pauseRoutine: t.field({
    type: PauseRoutinePayload,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, { id }, ctx) => {
      ctx.db.routines.pause(String(id));
      return { routine: ctx.db.routines.getById(String(id)) };
    },
  }),

  resumeRoutine: t.field({
    type: ResumeRoutinePayload,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, { id }, ctx) => {
      ctx.db.routines.resume(String(id));
      return { routine: ctx.db.routines.getById(String(id)) };
    },
  }),

  runRoutineNow: t.field({
    type: RunRoutineNowPayload,
    description: 'Trigger immediate execution of a routine',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, { id }, ctx) => {
      if (!ctx.routine) {
        throw new GraphQLError('Routine executor not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }
      const routineId = String(id);
      await ctx.routine.execute(routineId, 'manual');
      return { routine: ctx.db.routines.getById(routineId) };
    },
  }),
}));
