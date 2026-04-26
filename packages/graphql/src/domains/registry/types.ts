/**
 * Registry GraphQL Types — Pothos object types for registries and quick actions.
 *
 * Registry is backed by RegistryRecord (SQLite). QuickAction and QuickActionOption
 * are ephemeral types read from registry Git repos at runtime.
 *
 * @module graphql/domains/registry/types
 */

import type { RegistryRecord } from '@vienna/app-db';
import { builder } from '../../schema/builder';

// ─────────────────────────────────────────────────────────────────────────────
// Local shape types — mirrors the Zod schemas in apps/desktop/src/main/registry/types.ts
// to avoid cross-package imports from apps/ into packages/.
// ─────────────────────────────────────────────────────────────────────────────

interface QuickActionOptionShape {
  id: string;
  label: string;
  prompt: string;
}

interface QuickActionAuthorShape {
  name: string;
}

interface QuickActionShape {
  id: string;
  label: string;
  icon: string;
  description: string;
  author: QuickActionAuthorShape;
  tags: string[];
  options: QuickActionOptionShape[];
  registry?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const RegistrySourceEnum = builder.enumType('RegistrySource', {
  values: ['local', 'organization', 'project'] as const,
});

// ─────────────────────────────────────────────────────────────────────────────
// Registry type (backed by RegistryRecord in SQLite)
// ─────────────────────────────────────────────────────────────────────────────

export const RegistryRef = builder.objectRef<RegistryRecord>('Registry');

builder.objectType(RegistryRef, {
  description: 'A Git-backed registry providing shareable content (quick actions, etc.)',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    url: t.exposeString('url'),
    enabled: t.exposeBoolean('enabled'),
    priority: t.exposeInt('priority'),
    source: t.expose('source', { type: RegistrySourceEnum }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// QuickActionOption (embedded, not a DB entity)
// ─────────────────────────────────────────────────────────────────────────────

export const QuickActionOptionRef = builder.objectRef<QuickActionOptionShape>('QuickActionOption');

builder.objectType(QuickActionOptionRef, {
  description: 'A selectable option within a quick action',
  fields: (t) => ({
    id: t.exposeString('id'),
    label: t.exposeString('label'),
    prompt: t.exposeString('prompt'),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// QuickActionAuthor (embedded)
// ─────────────────────────────────────────────────────────────────────────────

const QuickActionAuthorRef = builder.objectRef<QuickActionAuthorShape>('QuickActionAuthor');

builder.objectType(QuickActionAuthorRef, {
  description: 'Author of a quick action',
  fields: (t) => ({
    name: t.exposeString('name'),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// QuickAction (read from registry repos, not DB-backed)
// ─────────────────────────────────────────────────────────────────────────────

export const QuickActionRef = builder.objectRef<QuickActionShape>('QuickAction');

builder.objectType(QuickActionRef, {
  description: 'A quick action provided by a registry',
  fields: (t) => ({
    id: t.exposeString('id'),
    label: t.exposeString('label'),
    icon: t.exposeString('icon'),
    description: t.exposeString('description'),
    author: t.field({
      type: QuickActionAuthorRef,
      resolve: (qa) => qa.author,
    }),
    tags: t.exposeStringList('tags'),
    registry: t.exposeString('registry', { nullable: true }),
    options: t.field({
      type: [QuickActionOptionRef],
      resolve: (qa) => qa.options,
    }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// VerificationAction (read from registry repos, not DB-backed)
// ─────────────────────────────────────────────────────────────────────────────

interface VerificationActionShape {
  id: string;
  type: 'builtin' | 'prompt';
  label: string;
  builtinId?: string;
  prompt?: string;
}

export const VerificationActionTypeEnum = builder.enumType('VerificationActionType', {
  values: ['builtin', 'prompt'] as const,
});

export const VerificationActionRef =
  builder.objectRef<VerificationActionShape>('VerificationAction');

builder.objectType(VerificationActionRef, {
  description: 'A post-verification action (builtin lifecycle or prompt-based)',
  fields: (t) => ({
    id: t.exposeString('id'),
    type: t.expose('type', { type: VerificationActionTypeEnum }),
    label: t.exposeString('label'),
    builtinId: t.exposeString('builtinId', { nullable: true }),
    prompt: t.exposeString('prompt', { nullable: true }),
  }),
});
