/**
 * Plugins GraphQL Queries
 *
 * @module graphql/domains/plugins/queries
 */

import { builder } from '../../schema/builder';
import { InstalledPluginRef, RegistryPluginRef, PluginUpdateRef } from './types';

builder.queryFields((t) => ({
  installedPlugins: t.field({
    type: [InstalledPluginRef],
    description: 'List all installed plugins',
    resolve: (_root, _args, ctx) => {
      if (!ctx.plugins) return [];
      return ctx.plugins.list();
    },
  }),

  registryPlugins: t.field({
    type: [RegistryPluginRef],
    description: 'List all available plugins from enabled registries',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.registry) return [];
      return ctx.registry.getPlugins();
    },
  }),

  registryPluginDefaults: t.field({
    type: ['String'],
    description: 'Default plugin IDs from the highest-priority registry',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.registry) return [];
      return ctx.registry.getPluginDefaults();
    },
  }),

  pluginUpdates: t.field({
    type: [PluginUpdateRef],
    description: 'Check for version updates on installed plugins',
    resolve: async (_root, _args, ctx) => {
      if (!ctx.plugins) return [];
      return ctx.plugins.checkUpdates();
    },
  }),
}));
