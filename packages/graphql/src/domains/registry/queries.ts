/**
 * Registry GraphQL Queries
 *
 * @module graphql/domains/registry/queries
 */

import { builder } from '../../schema/builder';
import { RegistryRef, QuickActionRef, VerificationActionRef } from './types';

builder.queryFields((t) => ({
  registries: t.field({
    type: [RegistryRef],
    description: 'List all registries',
    resolve: (_root, _args, ctx) => {
      if (!ctx.registry) return [];
      return ctx.registry.list();
    },
  }),

  registry: t.field({
    type: RegistryRef,
    nullable: true,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, { id }, ctx) => ctx.db.registries.getById(String(id)),
  }),

  registryQuickActions: t.field({
    type: [QuickActionRef],
    description: 'Merged quick actions from all enabled registries (priority-ordered)',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.registry) return [];
      return ctx.registry.getQuickActions();
    },
  }),

  registryQuickActionDefaults: t.field({
    type: ['String'],
    description: 'Default quick action IDs from the highest-priority registry',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.registry) return [];
      return ctx.registry.getQuickActionDefaults();
    },
  }),

  registryVerificationActions: t.field({
    type: [VerificationActionRef],
    description: 'Merged verification actions from all enabled registries (priority-ordered)',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.registry) return [];
      return ctx.registry.getVerificationActions();
    },
  }),

  registryVerificationActionDefaults: t.field({
    type: [VerificationActionRef],
    description: 'Default verification actions from the highest-priority registry',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.registry) return [];
      return ctx.registry.getVerificationActionDefaults();
    },
  }),
}));
