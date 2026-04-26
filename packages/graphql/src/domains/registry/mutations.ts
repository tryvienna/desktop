/**
 * Registry GraphQL Mutations
 *
 * Each mutation returns a payload type following the Relay convention.
 *
 * @module graphql/domains/registry/mutations
 */

import { GraphQLError } from 'graphql';
import type { RegistryRecord } from '@vienna/app-db';
import { builder } from '../../schema/builder';
import { RegistryRef } from './types';
import { validateString } from '../../validation';

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function unavailable(): GraphQLError {
  return new GraphQLError('Registry manager not available', {
    extensions: { code: 'SERVICE_UNAVAILABLE' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload types
// ─────────────────────────────────────────────────────────────────────────────

type RegistryPayloadShape = { registry: RegistryRecord | null };

function registryPayload(name: string) {
  return builder
    .objectRef<RegistryPayloadShape>(`${name}Payload`)
    .implement({
      fields: (t) => ({
        registry: t.field({
          type: RegistryRef,
          nullable: true,
          resolve: (parent) => parent.registry,
        }),
      }),
    });
}

const AddRegistryPayload = registryPayload('AddRegistry');
const RemoveRegistryPayload = registryPayload('RemoveRegistry');
const UpdateRegistryPayload = registryPayload('UpdateRegistry');

type SyncPayloadShape = { synced: number };
const SyncRegistriesPayload = builder
  .objectRef<SyncPayloadShape>('SyncRegistriesPayload')
  .implement({
    fields: (t) => ({
      synced: t.exposeInt('synced'),
    }),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

const AddRegistryInput = builder.inputType('AddRegistryInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    url: t.string({ required: true }),
    priority: t.int({ required: false }),
  }),
});

const UpdateRegistryInput = builder.inputType('UpdateRegistryInput', {
  fields: (t) => ({
    enabled: t.boolean({ required: false }),
    priority: t.int({ required: false }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  addRegistry: t.field({
    type: AddRegistryPayload,
    args: { input: t.arg({ type: AddRegistryInput, required: true }) },
    resolve: async (_root, { input }, ctx) => {
      if (!ctx.registry) throw unavailable();
      validateString(input.name, 'name', { minLength: 1, maxLength: 100 });
      validateString(input.url, 'url', { minLength: 1 });
      const registry = await ctx.registry.add({
        name: input.name,
        url: input.url,
        priority: input.priority ?? undefined,
      });
      return { registry };
    },
  }),

  removeRegistry: t.field({
    type: RemoveRegistryPayload,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, { id }, ctx) => {
      if (!ctx.registry) throw unavailable();
      const registryId = String(id);
      // Read before removing — remove() throws if official, deletes otherwise
      const existing = ctx.db.registries.getById(registryId);
      const removed = ctx.registry.remove(registryId);
      return { registry: removed ? existing ?? null : null };
    },
  }),

  updateRegistry: t.field({
    type: UpdateRegistryPayload,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateRegistryInput, required: true }),
    },
    resolve: (_root, { id, input }, ctx) => {
      if (!ctx.registry) throw unavailable();
      const registry = ctx.registry.update(String(id), {
        enabled: input.enabled ?? undefined,
        priority: input.priority ?? undefined,
      });
      return { registry: registry ?? null };
    },
  }),

  syncRegistries: t.field({
    type: SyncRegistriesPayload,
    description: 'Trigger a sync of all enabled registries',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.registry) throw unavailable();
      return ctx.registry.sync();
    },
  }),
}));
