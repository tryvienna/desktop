/**
 * @vienna/graphql — Code-first GraphQL schema + Apollo Client utilities.
 *
 * Exports shared types only (safe for all processes).
 * For schema: import from '@vienna/graphql/schema'
 * For client: import from '@vienna/graphql/client'
 *
 * @module graphql
 */

export type { GraphQLContext, WorkstreamActions, RoutineActions, TagActions, RegistryActions, GitOps, CommandActions, SkillActions, PluginActions, EventActions, InboxActions, InstalledSkillShape, RegistrySkillShape, SkillUpdateShape, InstalledPluginShape, RegistryPluginShape, PluginUpdateShape, ContentProfileActions, ContentProfileShape, ProfileMetadataShape } from './schema/builder';
