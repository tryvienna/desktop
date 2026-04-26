/**
 * Inbox GraphQL Mutations — push, read, archive, delete inbox items.
 *
 * @module graphql/domains/inbox/mutations
 */

import { GraphQLError } from 'graphql';
import { builder } from '../../schema/builder';
import { InboxItemRef } from './types';
import type { InboxItemRecord } from '@vienna/app-db';
import { validateString, validateOptionalString } from '../../validation';

// ── Payload types ───────────────────────────────────────────────────────────

type InboxItemPayloadShape = { inboxItem: InboxItemRecord | null };

const PushInboxItemPayload = builder
  .objectRef<InboxItemPayloadShape>('PushInboxItemPayload')
  .implement({
    fields: (t) => ({
      inboxItem: t.field({ type: InboxItemRef, nullable: true, resolve: (p) => p.inboxItem }),
    }),
  });

const MarkInboxItemReadPayload = builder
  .objectRef<InboxItemPayloadShape>('MarkInboxItemReadPayload')
  .implement({
    fields: (t) => ({
      inboxItem: t.field({ type: InboxItemRef, nullable: true, resolve: (p) => p.inboxItem }),
    }),
  });

const MarkAllInboxItemsReadPayload = builder
  .objectRef<{ count: number }>('MarkAllInboxItemsReadPayload')
  .implement({
    fields: (t) => ({
      count: t.exposeInt('count'),
    }),
  });

const ArchiveInboxItemPayload = builder
  .objectRef<InboxItemPayloadShape>('ArchiveInboxItemPayload')
  .implement({
    fields: (t) => ({
      inboxItem: t.field({ type: InboxItemRef, nullable: true, resolve: (p) => p.inboxItem }),
    }),
  });

const DeleteInboxItemPayload = builder
  .objectRef<{ success: boolean }>('DeleteInboxItemPayload')
  .implement({
    fields: (t) => ({
      success: t.exposeBoolean('success'),
    }),
  });

const ExecuteInboxActionPayload = builder
  .objectRef<{ success: boolean }>('ExecuteInboxActionPayload')
  .implement({
    fields: (t) => ({
      success: t.exposeBoolean('success'),
    }),
  });

// ── Input types ─────────────────────────────────────────────────────────────

const InboxActionInput = builder.inputType('InboxActionInput', {
  description: 'A single action button to attach to an inbox item.',
  fields: (t) => ({
    id: t.string({ required: true, description: 'Registered action handler ID' }),
    label: t.string({ required: true, description: 'Human-readable button label' }),
    payload: t.field({ type: 'JSON', description: 'Optional payload passed to the handler' }),
  }),
});

const PushInboxItemInput = builder.inputType('PushInboxItemInput', {
  description: 'Input for pushing a new item to the inbox. The source is set automatically from the caller identity — plugins get their plugin ID, core gets "Vienna".',
  fields: (t) => ({
    title: t.string({ required: true, description: 'Display title for the inbox item' }),
    description: t.string({ description: 'Optional longer text or markdown' }),
    icon: t.string({ description: 'Optional SVG icon string' }),
    actions: t.field({ type: [InboxActionInput], description: 'Action buttons to display on the item' }),
    entityUri: t.string({ description: 'Vienna entity URI for deep linking (e.g. @vienna//gh_pr/owner/repo/123)' }),
    ctaLabel: t.string({ description: 'Optional label for a call-to-action button (e.g. "Open", "View")' }),
  }),
});

// ── Mutations ───────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  /** Push a new item to the inbox. */
  pushInboxItem: t.field({
    type: PushInboxItemPayload,
    args: { input: t.arg({ type: PushInboxItemInput, required: true }) },
    resolve: (_root, args, ctx) => {
      validateString(args.input.title, 'title', { minLength: 1, maxLength: 500 });
      validateOptionalString(args.input.description ?? null, 'description', { maxLength: 5000 });

      // Source is derived from caller identity — plugins can't spoof it.
      const source = ctx.callerPluginId ?? 'Vienna';

      const inboxItem = ctx.db.inboxItems.create({
        title: args.input.title,
        description: args.input.description ?? null,
        icon: args.input.icon ?? null,
        source,
        actions: args.input.actions?.map((a) => ({
          id: a.id,
          label: a.label,
          payload: a.payload ?? undefined,
        })),
        entityUri: args.input.entityUri ?? null,
        ctaLabel: args.input.ctaLabel ?? null,
      });

      return { inboxItem };
    },
  }),

  /** Mark a single inbox item as read. */
  markInboxItemRead: t.field({
    type: MarkInboxItemReadPayload,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const id = String(args.id);
      ctx.db.inboxItems.markRead(id);
      return { inboxItem: ctx.db.inboxItems.getById(id) };
    },
  }),

  /** Mark all inbox items as read. */
  markAllInboxItemsRead: t.field({
    type: MarkAllInboxItemsReadPayload,
    resolve: (_root, _args, ctx) => {
      const count = ctx.db.inboxItems.markAllRead();
      return { count };
    },
  }),

  /** Archive an inbox item (soft-delete). */
  archiveInboxItem: t.field({
    type: ArchiveInboxItemPayload,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const id = String(args.id);
      ctx.db.inboxItems.archive(id);
      return { inboxItem: ctx.db.inboxItems.getById(id) };
    },
  }),

  /** Permanently delete an inbox item. */
  deleteInboxItem: t.field({
    type: DeleteInboxItemPayload,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const success = ctx.db.inboxItems.delete(String(args.id));
      return { success };
    },
  }),

  /** Execute the action handler for an inbox item. */
  executeInboxAction: t.field({
    type: ExecuteInboxActionPayload,
    args: {
      actionId: t.arg.string({ required: true }),
      payload: t.arg({ type: 'JSON' }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.inbox) {
        throw new GraphQLError('Inbox action registry not available', {
          extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
      }

      if (!ctx.inbox.hasAction(args.actionId)) {
        throw new GraphQLError(`Unknown inbox action: ${args.actionId}`, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      await ctx.inbox.executeAction(args.actionId, args.payload);
      return { success: true };
    },
  }),
}));
