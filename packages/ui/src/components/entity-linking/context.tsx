/**
 * EntityLinkingContext — Adapter interface for entity linking data operations.
 *
 * @ai-context
 * - Defines the contract between presentational entity-linking components and the data layer
 * - @tryvienna/ui exports the context + interface; the host app provides the Apollo-backed implementation
 * - All data methods are async; components manage their own loading state
 * - Navigation callbacks are sync
 * - Plugins import components from @tryvienna/ui and they "just work" because the provider is mounted by the app
 */

import { createContext, useContext } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Data Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityLinkedWorkstream {
  workstreamId: string;
  title: string;
  status: string;
  groupId?: string | null;
}

export interface LinkedEntity {
  entityUri: string;
  entityType: string;
  entityTitle: string | null;
  contextOverride: string | null;
  isInherited: boolean;
}

export interface EntitySearchResult {
  id: string;
  type: string;
  uri: string;
  title: string;
}

export interface EntityTypeInfo {
  type: string;
  displayName: string;
  icon?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityLinkingAdapter {
  // Data fetching
  getWorkstreamsByEntity(entityUri: string): Promise<EntityLinkedWorkstream[]>;
  getLinkedEntities(targetId: string, scope: 'workstream' | 'group'): Promise<LinkedEntity[]>;
  searchEntities(query: string, types?: string[] | null, limit?: number): Promise<EntitySearchResult[]>;
  getEntityTypes(): Promise<EntityTypeInfo[]>;
  resolveEntityContext(entityUri: string): Promise<string>;

  // Mutations
  linkEntity(targetId: string, scope: 'workstream' | 'group', entity: EntitySearchResult): Promise<void>;
  unlinkEntity(targetId: string, scope: 'workstream' | 'group', entityUri: string): Promise<void>;
  setContextOverride(workstreamId: string, entityUri: string, override: string | null): Promise<void>;

  // Navigation
  navigateToWorkstream(workstreamId: string): void;
  openEntityDrawer(uri: string): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

export const EntityLinkingContext = createContext<EntityLinkingAdapter | null>(null);

export function useEntityLinking(): EntityLinkingAdapter {
  const adapter = useContext(EntityLinkingContext);
  if (!adapter) {
    throw new Error(
      'useEntityLinking must be used within an EntityLinkingProvider. ' +
      'Ensure the host app wraps the component tree with <EntityLinkingProvider>.',
    );
  }
  return adapter;
}
