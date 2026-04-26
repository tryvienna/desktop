/**
 * @tryvienna/sdk/react
 *
 * React hooks, provider, and cache utilities for plugin UI development.
 * Renderer-only — do NOT import in the main process.
 *
 * The host app wraps plugin components in <PluginDataProvider> with its
 * pre-configured Apollo client. Plugin hooks consume this context internally,
 * so plugins never need to import Apollo or @vienna/graphql directly.
 */

// ── Provider (host app) ──────────────────────────────────────────────────────
export { PluginDataProvider } from './PluginDataProvider';

// ── Data hooks (plugins) ─────────────────────────────────────────────────────
export { useEntity } from './useEntity';
export type { UseEntityOptions, UseEntityResult } from './useEntity';

export { useEntities } from './useEntities';
export type { UseEntitiesOptions, UseEntitiesResult } from './useEntities';

// ── Custom queries and mutations (plugins with integration-specific GraphQL) ─
export { usePluginQuery } from './usePluginQuery';
export { usePluginMutation } from './usePluginMutation';
export { gql } from 'graphql-tag';

// ── Workstream hooks ────────────────────────────────────────────────────────
export { useWorkstream } from './useWorkstream';
export type { UseWorkstreamResult } from './useWorkstream';

// ── Plugin storage ──────────────────────────────────────────────────────────
export { usePluginStorage } from './usePluginStorage';
export type { UsePluginStorageResult } from './usePluginStorage';

// ── Cache utilities ──────────────────────────────────────────────────────────
export { invalidateEntity, updateCachedEntity } from './cache';
export { usePluginClient, useHostApi, useActiveWorkstreamId, useTheme, usePluginId } from './PluginDataContext';
export type { ResolvedTheme, ThemeInfo } from './PluginDataContext';
