/**
 * Settings GraphQL Types — Pothos object types for app settings.
 *
 * Settings is a singleton object (no ID field). Each category is
 * a nested object type backed by the Zod-validated types from @vienna/app-db.
 *
 * @module graphql/domains/settings/types
 */

import type {
  AllSettings,
  AppearanceSettings,
  AiSettings,
  AdvancedSettings,
  PermissionsSettings,
  PermissionRuleConfig,
} from '@vienna/app-db';
import { builder } from '../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const ThemeEnum = builder.enumType('Theme', {
  values: ['light', 'dark', 'system'] as const,
});

// ─────────────────────────────────────────────────────────────────────────────
// Category object types
// ─────────────────────────────────────────────────────────────────────────────

export const AppearanceSettingsRef = builder.objectRef<AppearanceSettings>('AppearanceSettings');

builder.objectType(AppearanceSettingsRef, {
  description: 'UI appearance settings',
  fields: (t) => ({
    theme: t.expose('theme', { type: ThemeEnum }),
    fontSize: t.exposeInt('fontSize'),
    compactMode: t.exposeBoolean('compactMode'),
    zoomLevel: t.exposeFloat('zoomLevel'),
  }),
});

export const AiSettingsRef = builder.objectRef<AiSettings>('AiSettings');

builder.objectType(AiSettingsRef, {
  description: 'AI and model settings',
  fields: (t) => ({
    defaultModel: t.exposeString('defaultModel'),
    cliPath: t.exposeString('cliPath', { nullable: true }),
    cliSetupComplete: t.exposeBoolean('cliSetupComplete'),
    autoCompactPercent: t.exposeInt('autoCompactPercent', { nullable: true }),
  }),
});

export const AdvancedSettingsRef = builder.objectRef<AdvancedSettings>('AdvancedSettings');

builder.objectType(AdvancedSettingsRef, {
  description: 'Advanced/developer settings',
  fields: (t) => ({
    developerMode: t.exposeBoolean('developerMode', { nullable: true }),
    focusMonitorEnabled: t.exposeBoolean('focusMonitorEnabled'),
    focusMonitorIntervalMs: t.exposeInt('focusMonitorIntervalMs'),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Permission settings types
// ─────────────────────────────────────────────────────────────────────────────

export const PermissionBehaviorSettingEnum = builder.enumType('PermissionBehaviorSetting', {
  values: ['allow', 'ask'] as const,
});

export const PermissionPresetEnum = builder.enumType('PermissionPreset', {
  values: ['restrictive', 'balanced', 'autonomous', 'custom'] as const,
});

export const PermissionRuleConfigRef = builder.objectRef<PermissionRuleConfig>('PermissionRuleConfig');

builder.objectType(PermissionRuleConfigRef, {
  description: 'A single permission rule configuration',
  fields: (t) => ({
    tool: t.exposeString('tool'),
    behavior: t.expose('behavior', { type: PermissionBehaviorSettingEnum }),
    entityType: t.exposeString('entityType', { nullable: true }),
  }),
});

export const PermissionsSettingsRef = builder.objectRef<PermissionsSettings>('PermissionsSettings');

builder.objectType(PermissionsSettingsRef, {
  description: 'Global permission settings',
  fields: (t) => ({
    activePreset: t.expose('activePreset', { type: PermissionPresetEnum }),
    rules: t.field({
      type: [PermissionRuleConfigRef],
      resolve: (settings) => settings.rules,
    }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Root Settings type (singleton — all categories)
// ─────────────────────────────────────────────────────────────────────────────

export const SettingsRef = builder.objectRef<AllSettings>('Settings');

builder.objectType(SettingsRef, {
  description: 'App-level settings (all categories)',
  fields: (t) => ({
    appearance: t.field({
      type: AppearanceSettingsRef,
      resolve: (settings) => settings.appearance,
    }),
    ai: t.field({
      type: AiSettingsRef,
      resolve: (settings) => settings.ai,
    }),
    advanced: t.field({
      type: AdvancedSettingsRef,
      resolve: (settings) => settings.advanced,
    }),
    permissions: t.field({
      type: PermissionsSettingsRef,
      resolve: (settings) => settings.permissions,
    }),
    permissionTemplates: t.field({
      type: PermissionTemplatesSettingsRef,
      resolve: (settings) => settings.permissionTemplates,
    }),
    notifications: t.field({
      type: NotificationsSettingsRef,
      resolve: (settings) => settings.notifications,
    }),
  }),
});

// Lazy imports to avoid circular dependency — types.ts is registered before
// the referenced domains' types.ts files.
import { PermissionTemplatesSettingsRef } from '../permission-templates/types';
import { NotificationsSettingsRef } from '../notifications/types';
