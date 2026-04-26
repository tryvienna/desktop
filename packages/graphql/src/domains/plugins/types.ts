/**
 * Plugins GraphQL Types — Pothos object types for installed and registry plugins.
 *
 * @module graphql/domains/plugins/types
 */

import { builder } from '../../schema/builder';
import type { InstalledPluginShape, RegistryPluginShape, PluginUpdateShape } from '../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const PluginSourceEnum = builder.enumType('PluginSource', {
  values: ['inline', 'github'] as const,
});

// ─────────────────────────────────────────────────────────────────────────────
// InstalledPlugin (backed by installed_plugins table)
// ─────────────────────────────────────────────────────────────────────────────

export const InstalledPluginRef = builder.objectRef<InstalledPluginShape>('InstalledPlugin');

builder.objectType(InstalledPluginRef, {
  description: 'A plugin installed on disk from a registry or GitHub repo',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description'),
    version: t.exposeString('version', { nullable: true }),
    registryVersion: t.exposeString('registryVersion', { nullable: true }),
    source: t.expose('source', { type: PluginSourceEnum }),
    sourceRef: t.exposeString('sourceRef', { nullable: true }),
    registry: t.exposeString('registry', { nullable: true }),
    path: t.exposeString('path'),
    icon: t.exposeString('icon', { nullable: true }),
    category: t.exposeString('category', { nullable: true }),
    tags: t.exposeStringList('tags'),
    author: t.exposeString('author', { nullable: true }),
    enabled: t.exposeBoolean('enabled'),
    installDate: t.exposeString('installDate'),
    hasUpdate: t.boolean({
      description: 'Whether a newer version is available in the registry',
      resolve: (plugin) =>
        plugin.registryVersion !== null &&
        plugin.version !== null &&
        plugin.registryVersion !== plugin.version,
    }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// RegistryPlugin (read from registry repos, not DB-backed)
// ─────────────────────────────────────────────────────────────────────────────

interface RegistryPluginAuthorShape {
  name: string;
}

const RegistryPluginAuthorRef = builder.objectRef<RegistryPluginAuthorShape>('RegistryPluginAuthor');

builder.objectType(RegistryPluginAuthorRef, {
  description: 'Author of a registry plugin',
  fields: (t) => ({
    name: t.exposeString('name'),
  }),
});

interface RegistryPluginCanvasesShape {
  'nav-sidebar': boolean;
  drawer: boolean;
  'menu-bar': boolean;
  feed: boolean;
  'workstream-widget': boolean;
}

const RegistryPluginCanvasesRef = builder.objectRef<RegistryPluginCanvasesShape>('RegistryPluginCanvases');

builder.objectType(RegistryPluginCanvasesRef, {
  description: 'Canvas support flags for a registry plugin',
  fields: (t) => ({
    navSidebar: t.boolean({ resolve: (c) => c['nav-sidebar'] }),
    drawer: t.exposeBoolean('drawer'),
    menuBar: t.boolean({ resolve: (c) => c['menu-bar'] }),
    feed: t.exposeBoolean('feed'),
    workstreamWidget: t.boolean({ resolve: (c) => c['workstream-widget'] }),
  }),
});

const DEFAULT_CANVASES: RegistryPluginCanvasesShape = {
  'nav-sidebar': false,
  drawer: false,
  'menu-bar': false,
  feed: false,
  'workstream-widget': false,
};

export const RegistryPluginRef = builder.objectRef<RegistryPluginShape>('RegistryPlugin');

builder.objectType(RegistryPluginRef, {
  description: 'A plugin available in a registry (not yet installed)',
  fields: (t) => ({
    id: t.exposeString('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description'),
    version: t.exposeString('version', { nullable: true }),
    source: t.expose('source', { type: PluginSourceEnum }),
    repo: t.exposeString('repo', { nullable: true }),
    icon: t.exposeString('icon', { nullable: true }),
    category: t.exposeString('category', { nullable: true }),
    tags: t.exposeStringList('tags'),
    author: t.field({
      type: RegistryPluginAuthorRef,
      nullable: true,
      resolve: (plugin) => plugin.author ?? null,
    }),
    registry: t.exposeString('registry', { nullable: true }),
    canvases: t.field({
      type: RegistryPluginCanvasesRef,
      nullable: true,
      resolve: (plugin) => plugin.canvases ?? DEFAULT_CANVASES,
    }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// PluginUpdate (version comparison)
// ─────────────────────────────────────────────────────────────────────────────

export const PluginUpdateRef = builder.objectRef<PluginUpdateShape>('PluginUpdate');

builder.objectType(PluginUpdateRef, {
  description: 'Version update information for an installed plugin',
  fields: (t) => ({
    id: t.exposeString('id'),
    installedVersion: t.exposeString('installedVersion', { nullable: true }),
    registryVersion: t.exposeString('registryVersion', { nullable: true }),
  }),
});
