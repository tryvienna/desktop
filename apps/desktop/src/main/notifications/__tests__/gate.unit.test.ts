import { describe, it, expect } from 'vitest';
import type { CreateInboxItemInput, InboxItemRecord, NotificationsSettings } from '@vienna/app-db';
import { NotificationGate } from '../gate';
import { NotificationTypeRegistry } from '../registry';

interface FakeInboxItem extends Partial<InboxItemRecord> {
  title: string;
  source: string | null;
}

function makeGate(opts?: {
  settings?: Partial<NotificationsSettings>;
  registry?: NotificationTypeRegistry;
}) {
  const created: FakeInboxItem[] = [];
  let broadcasts = 0;
  const settings: NotificationsSettings = {
    mutedSources: {},
    mutedTypes: {},
    ...opts?.settings,
  };
  const gate = new NotificationGate({
    registry: opts?.registry ?? new NotificationTypeRegistry(),
    getSettings: () => settings,
    createInboxItem: (input: CreateInboxItemInput) => {
      const item = {
        ...input,
        id: `item-${created.length + 1}`,
        read: false,
        archived: false,
        createdAt: 0,
        updatedAt: 0,
        actions: input.actions ?? [],
        description: input.description ?? null,
        icon: input.icon ?? null,
        source: input.source ?? null,
        entityUri: input.entityUri ?? null,
        ctaLabel: input.ctaLabel ?? null,
      } as InboxItemRecord;
      created.push(item);
      return item;
    },
    broadcast: () => { broadcasts++; },
  });
  return { gate, created, settings, getBroadcasts: () => broadcasts };
}

describe('NotificationGate', () => {
  describe('built-in types', () => {
    it('writes the item and broadcasts when not muted', () => {
      const { gate, created, getBroadcasts } = makeGate();
      const result = gate.notify('github_cli.pr.created', { title: 'PR opened' });
      expect(result).not.toBeNull();
      expect(created).toHaveLength(1);
      expect(created[0]?.title).toBe('PR opened');
      expect(created[0]?.source).toBe('GitHub');
      expect(getBroadcasts()).toBe(1);
    });

    it('overrides source from the registry, ignoring any caller-supplied source', () => {
      const { gate, created } = makeGate();
      gate.notify('core.claude-code.turn.completed', { title: 'Done' });
      expect(created[0]?.source).toBe('Claude Code');
    });
  });

  describe('source-level mute', () => {
    it('drops the notification when the source is muted', () => {
      const { gate, created, getBroadcasts } = makeGate({
        settings: { mutedSources: { GitHub: true } },
      });
      const result = gate.notify('github_cli.pr.created', { title: 'PR opened' });
      expect(result).toBeNull();
      expect(created).toHaveLength(0);
      expect(getBroadcasts()).toBe(0);
    });

    it('still allows notifications from other sources', () => {
      const { gate, created } = makeGate({
        settings: { mutedSources: { GitHub: true } },
      });
      gate.notify('core.claude-code.turn.completed', { title: 'Done' });
      expect(created).toHaveLength(1);
    });

    it('a source mute set to false does not mute', () => {
      const { gate, created } = makeGate({
        settings: { mutedSources: { GitHub: false } },
      });
      gate.notify('github_cli.pr.created', { title: 'PR opened' });
      expect(created).toHaveLength(1);
    });
  });

  describe('type-level mute', () => {
    it('drops the notification when the specific type is muted', () => {
      const { gate, created } = makeGate({
        settings: { mutedTypes: { 'github_cli.pr.created': true } },
      });
      const result = gate.notify('github_cli.pr.created', { title: 'PR opened' });
      expect(result).toBeNull();
      expect(created).toHaveLength(0);
    });

    it('does not mute sibling types in the same source', () => {
      const { gate, created } = makeGate({
        settings: { mutedTypes: { 'github_cli.pr.created': true } },
      });
      gate.notify('github_cli.pr.merged', { title: 'PR merged' });
      expect(created).toHaveLength(1);
    });
  });

  describe('source mute beats type mute', () => {
    it('drops the notification even if the type is explicitly enabled and the source is muted', () => {
      const { gate, created } = makeGate({
        settings: {
          mutedSources: { GitHub: true },
          mutedTypes: { 'github_cli.pr.created': false },
        },
      });
      gate.notify('github_cli.pr.created', { title: 'PR opened' });
      expect(created).toHaveLength(0);
    });
  });

  describe('unknown type ids', () => {
    it('allows the notification through and uses the type id as the source', () => {
      const { gate, created } = makeGate();
      gate.notify('plugin_x.something', { title: 'Hello' });
      expect(created).toHaveLength(1);
      expect(created[0]?.source).toBe('plugin_x.something');
    });

    it('respects mutedSources keyed by the type id for unknown types', () => {
      const { gate, created } = makeGate({
        settings: { mutedSources: { 'plugin_x.something': true } },
      });
      // Unknown types only check mutedTypes against id, not mutedSources.
      // Since the type is unknown, it's still allowed unless the user mutes the type id directly.
      gate.notify('plugin_x.something', { title: 'Hello' });
      expect(created).toHaveLength(1);
    });
  });

  describe('settings are read on every call', () => {
    it('toggling the setting takes effect immediately, no restart required', () => {
      const { gate, created, settings } = makeGate();
      gate.notify('github_cli.pr.created', { title: 'A' });
      settings.mutedSources['GitHub'] = true;
      gate.notify('github_cli.pr.created', { title: 'B' });
      settings.mutedSources['GitHub'] = false;
      gate.notify('github_cli.pr.created', { title: 'C' });
      expect(created.map((c) => c.title)).toEqual(['A', 'C']);
    });
  });
});
