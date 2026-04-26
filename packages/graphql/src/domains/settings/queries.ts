/**
 * Settings Queries — GraphQL query fields for settings.
 *
 * @module graphql/domains/settings/queries
 */

import { builder } from '../../schema/builder';
import { SettingsRef } from './types';

builder.queryFields((t) => ({
  settings: t.field({
    type: SettingsRef,
    description: 'Get all app settings (with defaults for unset values)',
    resolve: (_root, _args, ctx) => ctx.db.settings.getAll(),
  }),
}));
