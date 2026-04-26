/**
 * Settings Mutations — Per-category typed mutations for settings.
 *
 * Each mutation accepts only the fields of its category (strongly typed),
 * updates the category, and returns the full Settings object so Apollo
 * cache stays fully updated.
 *
 * @module graphql/domains/settings/mutations
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import { SettingsRef, ThemeEnum, PermissionPresetEnum, PermissionBehaviorSettingEnum } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

const UpdateAppearanceSettingsInput = builder.inputType('UpdateAppearanceSettingsInput', {
  fields: (t) => ({
    theme: t.field({ type: ThemeEnum }),
    fontSize: t.int(),
    compactMode: t.boolean(),
    zoomLevel: t.float(),
  }),
});

const UpdateAiSettingsInput = builder.inputType('UpdateAiSettingsInput', {
  fields: (t) => ({
    defaultModel: t.string(),
    cliPath: t.string(),
    cliSetupComplete: t.boolean(),
    autoCompactPercent: t.int(),
  }),
});

const UpdateAdvancedSettingsInput = builder.inputType('UpdateAdvancedSettingsInput', {
  fields: (t) => ({
    developerMode: t.boolean(),
    profilerEnabled: t.boolean(),
    focusMonitorEnabled: t.boolean(),
    focusMonitorIntervalMs: t.int(),
  }),
});

export const PermissionRuleConfigInput = builder.inputType('PermissionRuleConfigInput', {
  fields: (t) => ({
    tool: t.string({ required: true }),
    behavior: t.field({ type: PermissionBehaviorSettingEnum, required: true }),
    entityType: t.string(),
  }),
});

const UpdatePermissionsSettingsInput = builder.inputType('UpdatePermissionsSettingsInput', {
  fields: (t) => ({
    activePreset: t.field({ type: PermissionPresetEnum }),
    rules: t.field({ type: [PermissionRuleConfigInput] }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  updateAppearanceSettings: t.field({
    type: SettingsRef,
    description: 'Update appearance settings (theme, font size, compact mode)',
    args: { input: t.arg({ type: UpdateAppearanceSettingsInput, required: true }) },
    resolve: (_root, args, ctx) => {
      try {
        ctx.db.settings.update('appearance', {
          theme: args.input.theme ?? undefined,
          fontSize: args.input.fontSize ?? undefined,
          compactMode: args.input.compactMode ?? undefined,
          zoomLevel: args.input.zoomLevel ?? undefined,
        });
        return ctx.db.settings.getAll();
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to update appearance settings',
          { extensions: { code: 'VALIDATION_ERROR' } }
        );
      }
    },
  }),

  updateAiSettings: t.field({
    type: SettingsRef,
    description: 'Update AI settings (default model, CLI path)',
    args: { input: t.arg({ type: UpdateAiSettingsInput, required: true }) },
    resolve: (_root, args, ctx) => {
      try {
        ctx.db.settings.update('ai', {
          defaultModel: args.input.defaultModel ?? undefined,
          cliPath: args.input.cliPath !== undefined ? args.input.cliPath : undefined,
          cliSetupComplete: args.input.cliSetupComplete ?? undefined,
          autoCompactPercent:
            args.input.autoCompactPercent !== undefined
              ? args.input.autoCompactPercent
              : undefined,
        });
        return ctx.db.settings.getAll();
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to update AI settings',
          { extensions: { code: 'VALIDATION_ERROR' } }
        );
      }
    },
  }),

  updateAdvancedSettings: t.field({
    type: SettingsRef,
    description: 'Update advanced/developer settings',
    args: { input: t.arg({ type: UpdateAdvancedSettingsInput, required: true }) },
    resolve: (_root, args, ctx) => {
      try {
        ctx.db.settings.update('advanced', {
          developerMode: args.input.developerMode ?? undefined,
          profilerEnabled: args.input.profilerEnabled ?? undefined,
          focusMonitorEnabled: args.input.focusMonitorEnabled ?? undefined,
          focusMonitorIntervalMs: args.input.focusMonitorIntervalMs ?? undefined,
        });
        return ctx.db.settings.getAll();
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to update advanced settings',
          { extensions: { code: 'VALIDATION_ERROR' } }
        );
      }
    },
  }),

  updatePermissionsSettings: t.field({
    type: SettingsRef,
    description: 'Update global permission settings (presets, rules)',
    args: { input: t.arg({ type: UpdatePermissionsSettingsInput, required: true }) },
    resolve: (_root, args, ctx) => {
      try {
        const rules = args.input.rules?.map((r) => ({
          tool: r.tool,
          behavior: r.behavior,
          entityType: r.entityType ?? undefined,
        }));
        ctx.db.settings.update('permissions', {
          activePreset: args.input.activePreset ?? undefined,
          rules,
        });

        // Hot-reload permissions for all running sessions (global change)
        ctx.workstream?.reloadPermissionsForScope('global', '');

        return ctx.db.settings.getAll();
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to update permissions settings',
          { extensions: { code: 'VALIDATION_ERROR' } }
        );
      }
    },
  }),

  updateSettingsRaw: t.field({
    type: SettingsRef,
    description: 'Replace all settings from a raw JSON string. Validates against Zod schemas.',
    args: { json: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(args.json);
      } catch {
        throw new GraphQLError('Invalid JSON', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      try {
        return ctx.db.settings.replaceAll(parsed);
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Failed to update settings',
          { extensions: { code: 'VALIDATION_ERROR' } }
        );
      }
    },
  }),
}));
