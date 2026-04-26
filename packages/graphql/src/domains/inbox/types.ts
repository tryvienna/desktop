/**
 * Inbox GraphQL Types — Pothos type definitions for inbox items.
 *
 * @module graphql/domains/inbox/types
 */

import { builder } from '../../schema/builder';
import type { InboxItemRecord, InboxAction } from '@vienna/app-db';

// ── Object references ───────────────────────────────────────────────────────

export const InboxActionRef = builder.objectRef<InboxAction>('InboxAction');
export const InboxItemRef = builder.objectRef<InboxItemRecord>('InboxItem');

// ── InboxAction type ────────────────────────────────────────────────────────

builder.objectType(InboxActionRef, {
  description: 'A single action button on an inbox item',
  fields: (t) => ({
    id: t.exposeString('id'),
    label: t.exposeString('label'),
    payload: t.expose('payload', { type: 'JSON', nullable: true }),
  }),
});

// ── InboxItem type ──────────────────────────────────────────────────────────

builder.objectType(InboxItemRef, {
  description: 'A notification or action item in the global inbox',
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    icon: t.exposeString('icon', { nullable: true }),
    source: t.exposeString('source', { nullable: true }),
    actions: t.field({
      type: [InboxActionRef],
      resolve: (item) => item.actions,
    }),
    entityUri: t.exposeString('entityUri', { nullable: true }),
    ctaLabel: t.exposeString('ctaLabel', { nullable: true }),
    read: t.exposeBoolean('read'),
    archived: t.exposeBoolean('archived'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});
