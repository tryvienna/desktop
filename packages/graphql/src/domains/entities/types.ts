/**
 * Entity GraphQL Types — Generic types for all entity kinds.
 *
 * These types are backed by @tryvienna/sdk interfaces, not app-db records.
 * They enable generic entity operations (entity, entities, entitySearch)
 * that work for ALL registered entity types without schema changes.
 *
 * @module graphql/domains/entities/types
 */

import type { BaseEntity, EntityTypeSummary } from '@tryvienna/sdk';
import { builder } from '../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// Entity — generic type for all entity kinds
// ─────────────────────────────────────────────────────────────────────────────

export const EntityRef = builder.objectRef<BaseEntity>('Entity');

builder.objectType(EntityRef, {
  description: 'Generic entity resolved from the entity registry',
  fields: (t) => ({
    id: t.exposeID('id'),
    type: t.exposeString('type'),
    uri: t.exposeString('uri'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: true }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime', nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// EntityTypeInfo — discovery info for MCP entity_types tool
// ─────────────────────────────────────────────────────────────────────────────

export const EntityTypeInfoRef = builder.objectRef<EntityTypeSummary>('EntityTypeInfo');

builder.objectType(EntityTypeInfoRef, {
  description: 'Metadata about a registered entity type',
  fields: (t) => ({
    type: t.exposeString('type'),
    displayName: t.exposeString('displayName'),
    icon: t.exposeString('icon'),
    source: t.exposeString('source'),
    uriExample: t.exposeString('uriExample'),
    display: t.expose('display', { type: 'JSON', nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// MutationCatalog — mutation catalog for entity operation permissions
// ─────────────────────────────────────────────────────────────────────────────

interface MutationCatalogEntryShape {
  name: string;
  description: string;
  entityType: string;
}

export const MutationCatalogEntryRef = builder.objectRef<MutationCatalogEntryShape>('MutationCatalogEntry');

builder.objectType(MutationCatalogEntryRef, {
  description: 'A GraphQL mutation associated with an entity type',
  fields: (t) => ({
    name: t.exposeString('name'),
    description: t.exposeString('description'),
    entityType: t.exposeString('entityType'),
  }),
});

interface EntityMutationGroupShape {
  entityType: string;
  entityDisplayName: string;
  mutations: MutationCatalogEntryShape[];
}

export const EntityMutationGroupRef = builder.objectRef<EntityMutationGroupShape>('EntityMutationGroup');

builder.objectType(EntityMutationGroupRef, {
  description: 'A group of mutations that operate on a specific entity type',
  fields: (t) => ({
    entityType: t.exposeString('entityType'),
    entityDisplayName: t.exposeString('entityDisplayName'),
    mutations: t.field({
      type: [MutationCatalogEntryRef],
      resolve: (group) => group.mutations,
    }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// IntegrationInfo — discovery info for registered integrations
// ─────────────────────────────────────────────────────────────────────────────

interface IntegrationInfoShape {
  id: string;
  displayName: string;
  icon?: string;
}

export const IntegrationInfoRef = builder.objectRef<IntegrationInfoShape>('IntegrationInfo');

builder.objectType(IntegrationInfoRef, {
  description: 'Metadata about a registered integration',
  fields: (t) => ({
    id: t.exposeString('id'),
    displayName: t.exposeString('displayName'),
    icon: t.exposeString('icon', { nullable: true }),
  }),
});
