/**
 * GraphQL types for the project configuration system.
 *
 * Exposes the effective config, resolved settings, content item states,
 * conflict warnings, and requirement notifications via GraphQL.
 *
 * @module graphql/domains/project-config/types
 */

import { builder } from '../../schema/builder';
import type {
  ConfigSource,
  ResolvedValue,
  ContentItemState,
  ConfigConflict,
  MissingRequirement,
  EffectiveConfig,
} from '@vienna/app-db';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const ConfigTierEnum = builder.enumType('ConfigTier', {
  values: ['global', 'user', 'project'] as const,
});

export const ContentRequirementEnum = builder.enumType('ContentRequirement', {
  values: ['required', 'recommended', 'forbidden'] as const,
});

export const MissingRequirementTypeEnum = builder.enumType('MissingRequirementType', {
  values: ['not_installed', 'disabled'] as const,
});

// ─────────────────────────────────────────────────────────────────────────────
// Object types
// ─────────────────────────────────────────────────────────────────────────────

export const ConfigSourceRef = builder.objectRef<ConfigSource>('ConfigSource');
builder.objectType(ConfigSourceRef, {
  description: 'Where a configuration value originated',
  fields: (t) => ({
    tier: t.expose('tier', { type: ConfigTierEnum }),
    detail: t.exposeString('detail'),
  }),
});

export const SettingRecommendationRef = builder.objectRef<{
  value: unknown;
  source: ConfigSource;
  reason?: string;
}>('SettingRecommendation');
builder.objectType(SettingRecommendationRef, {
  description: 'A project-recommended setting value',
  fields: (t) => ({
    value: t.expose('value', { type: 'JSON' }),
    source: t.field({
      type: ConfigSourceRef,
      resolve: (parent) => parent.source,
    }),
    reason: t.exposeString('reason', { nullable: true }),
  }),
});

export const ResolvedSettingRef = builder.objectRef<ResolvedValue<unknown> & { key: string }>('ResolvedSetting');
builder.objectType(ResolvedSettingRef, {
  description: 'A setting resolved across all configuration tiers',
  fields: (t) => ({
    key: t.exposeString('key'),
    value: t.expose('value', { type: 'JSON' }),
    source: t.field({
      type: ConfigSourceRef,
      resolve: (parent) => parent.source,
    }),
    recommendation: t.field({
      type: SettingRecommendationRef,
      nullable: true,
      resolve: (parent) => parent.recommendation ?? null,
    }),
  }),
});

export const ContentItemStateRef = builder.objectRef<ContentItemState>('ContentItemState');
builder.objectType(ContentItemStateRef, {
  description: 'State of a content item (plugin/skill/quick action) after tier resolution',
  fields: (t) => ({
    id: t.exposeString('id'),
    installed: t.exposeBoolean('installed'),
    enabled: t.exposeBoolean('enabled'),
    enabledSource: t.field({
      type: ConfigSourceRef,
      resolve: (parent) => parent.enabledSource,
    }),
    projectRequirement: t.expose('projectRequirement', {
      type: ContentRequirementEnum,
      nullable: true,
    }),
    projectSource: t.exposeString('projectSource', { nullable: true }),
    projectReason: t.exposeString('projectReason', { nullable: true }),
  }),
});

export const ConflictEntryRef = builder.objectRef<{
  directory: string;
  requirement: string;
  reason?: string;
}>('ConflictEntry');
builder.objectType(ConflictEntryRef, {
  description: 'One side of a configuration conflict between projects',
  fields: (t) => ({
    directory: t.exposeString('directory'),
    requirement: t.exposeString('requirement'),
    reason: t.exposeString('reason', { nullable: true }),
  }),
});

export const ConfigConflictRef = builder.objectRef<ConfigConflict>('ConfigConflict');
builder.objectType(ConfigConflictRef, {
  description: 'A conflict between project configurations',
  fields: (t) => ({
    contentType: t.exposeString('contentType'),
    contentId: t.exposeString('contentId'),
    conflicts: t.field({
      type: [ConflictEntryRef],
      resolve: (parent) => parent.conflicts,
    }),
  }),
});

export const MissingRequirementRef = builder.objectRef<MissingRequirement>('MissingRequirement');
builder.objectType(MissingRequirementRef, {
  description: 'A required content item that is not installed or enabled',
  fields: (t) => ({
    contentType: t.exposeString('contentType'),
    contentId: t.exposeString('contentId'),
    projectDirectory: t.exposeString('projectDirectory'),
    reason: t.exposeString('reason', { nullable: true }),
    type: t.expose('type', { type: MissingRequirementTypeEnum }),
  }),
});

export const EffectiveConfigRef = builder.objectRef<EffectiveConfig & { settingsList: Array<ResolvedValue<unknown> & { key: string }> }>('EffectiveConfig');
builder.objectType(EffectiveConfigRef, {
  description: 'The effective configuration after resolving all tiers',
  fields: (t) => ({
    settings: t.field({
      type: [ResolvedSettingRef],
      resolve: (parent) => parent.settingsList,
    }),
    plugins: t.field({
      type: [ContentItemStateRef],
      resolve: (parent) => parent.plugins,
    }),
    skills: t.field({
      type: [ContentItemStateRef],
      resolve: (parent) => parent.skills,
    }),
    quickActions: t.field({
      type: [ContentItemStateRef],
      resolve: (parent) => parent.quickActions,
    }),
    conflicts: t.field({
      type: [ConfigConflictRef],
      resolve: (parent) => parent.conflicts,
    }),
    missingRequirements: t.field({
      type: [MissingRequirementRef],
      resolve: (parent) => parent.missingRequirements,
    }),
  }),
});
