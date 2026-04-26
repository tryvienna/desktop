/**
 * Plugins GraphQL Mutations
 *
 * @module graphql/domains/plugins/mutations
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import type { InstalledPluginShape } from '../../schema/builder';
import { InstalledPluginRef } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function unavailable(): GraphQLError {
  return new GraphQLError('Plugin manager not available', {
    extensions: { code: 'SERVICE_UNAVAILABLE' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload types
// ─────────────────────────────────────────────────────────────────────────────

type PluginPayloadShape = { plugin: InstalledPluginShape | null };

function pluginPayload(name: string) {
  return builder
    .objectRef<PluginPayloadShape>(`${name}Payload`)
    .implement({
      fields: (t) => ({
        plugin: t.field({
          type: InstalledPluginRef,
          nullable: true,
          resolve: (parent) => parent.plugin,
        }),
      }),
    });
}

const InstallPluginPayload = pluginPayload('InstallPlugin');
const UninstallPluginPayload = builder
  .objectRef<{ success: boolean }>('UninstallPluginPayload')
  .implement({
    fields: (t) => ({
      success: t.exposeBoolean('success'),
    }),
  });
const UpdatePluginPayload = pluginPayload('UpdatePlugin');
const TogglePluginPayload = pluginPayload('TogglePlugin');

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  installPlugin: t.field({
    type: InstallPluginPayload,
    args: {
      pluginId: t.arg.string({ required: true }),
    },
    resolve: async (_root, { pluginId }, ctx) => {
      if (!ctx.plugins || !ctx.registry) throw unavailable();
      const registryPlugins = await ctx.registry.getPlugins();
      const registryPlugin = registryPlugins.find((p) => p.id === pluginId);
      if (!registryPlugin) {
        throw new GraphQLError(`Plugin "${pluginId}" not found in any registry`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const plugin = await ctx.plugins.install(registryPlugin);
      return { plugin };
    },
  }),

  uninstallPlugin: t.field({
    type: UninstallPluginPayload,
    args: { pluginId: t.arg.string({ required: true }) },
    resolve: async (_root, { pluginId }, ctx) => {
      if (!ctx.plugins) throw unavailable();
      const success = await ctx.plugins.uninstall(pluginId);
      return { success };
    },
  }),

  updatePlugin: t.field({
    type: UpdatePluginPayload,
    args: { pluginId: t.arg.string({ required: true }) },
    resolve: async (_root, { pluginId }, ctx) => {
      if (!ctx.plugins) throw unavailable();
      const plugin = await ctx.plugins.update(pluginId);
      return { plugin };
    },
  }),

  togglePluginEnabled: t.field({
    type: TogglePluginPayload,
    args: {
      pluginId: t.arg.string({ required: true }),
      enabled: t.arg.boolean({ required: true }),
    },
    resolve: async (_root, { pluginId, enabled }, ctx) => {
      if (!ctx.plugins) throw unavailable();
      const plugin = await ctx.plugins.toggleEnabled(pluginId, enabled);
      return { plugin: plugin ?? null };
    },
  }),
}));
