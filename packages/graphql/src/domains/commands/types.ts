/**
 * Command GraphQL Types — Pothos object types for command palette.
 *
 * @ai-context
 * Defines the Command type (backed by CommandDefinitionRecord), the
 * CommandResultAction type, and the ExecuteCommandPayload mutation payload.
 * CommandCategory is an enum matching the Zod schema in the desktop app.
 *
 * @module graphql/domains/commands/types
 */

import type {
  CommandDefinitionRecord,
  CommandResultActionRecord,
} from '../../schema/builder';
import { builder } from '../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const CommandCategoryEnum = builder.enumType('CommandCategory', {
  values: ['navigation', 'workstream', 'claude', 'skill', 'settings', 'developer', 'help'] as const,
});

// ─────────────────────────────────────────────────────────────────────────────
// Command type
// ─────────────────────────────────────────────────────────────────────────────

export const CommandRef = builder.objectRef<CommandDefinitionRecord>('Command');

builder.objectType(CommandRef, {
  description: 'A command available in the command palette',
  fields: (t) => ({
    id: t.exposeString('id'),
    category: t.field({
      type: CommandCategoryEnum,
      resolve: (cmd) => cmd.category as typeof CommandCategoryEnum.$inferType,
    }),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    keywords: t.exposeStringList('keywords', { nullable: true }),
    disabled: t.exposeBoolean('disabled', { nullable: true }),
    disabledReason: t.exposeString('disabledReason', { nullable: true }),
    hasFlow: t.exposeBoolean('hasFlow', { nullable: true }),
    body: t.exposeString('body', { nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// CommandResultAction type
// ─────────────────────────────────────────────────────────────────────────────

export const CommandResultActionRef = builder.objectRef<CommandResultActionRecord>('CommandResultAction');

builder.objectType(CommandResultActionRef, {
  description: 'Action to perform in the renderer after command execution',
  fields: (t) => ({
    type: t.exposeString('type'),
    path: t.exposeString('path', { nullable: true }),
    message: t.exposeString('message', { nullable: true }),
    variant: t.exposeString('variant', { nullable: true }),
    text: t.exposeString('text', { nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// ExecuteCommandPayload
// ─────────────────────────────────────────────────────────────────────────────

export const ExecuteCommandPayloadRef = builder
  .objectRef<{
    success: boolean;
    error?: string;
    action?: CommandResultActionRecord;
  }>('ExecuteCommandPayload');

builder.objectType(ExecuteCommandPayloadRef, {
  description: 'Result of executing a command',
  fields: (t) => ({
    success: t.exposeBoolean('success'),
    error: t.exposeString('error', { nullable: true }),
    action: t.field({
      type: CommandResultActionRef,
      nullable: true,
      resolve: (parent) => parent.action ?? null,
    }),
  }),
});
