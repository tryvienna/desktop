import { describe, it, expect, afterEach } from 'vitest';
import { createTestHarness } from '../testing';
import { sampleApi, sampleEvents, createSampleHandlers } from './fixtures';
import { isIpcMethodError } from '../errors';
import type { IpcMethodError } from '../errors';

describe('createTestHarness() — full roundtrip', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it('calls methods and gets typed results', async () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers(), sampleEvents);
    cleanup = harness.cleanup;

    const user = await harness.api.users.create({ name: 'Alice', email: 'alice@test.com' });
    expect(user).toEqual(
      expect.objectContaining({ id: '1', name: 'Alice', email: 'alice@test.com' })
    );

    const ping = await harness.api.system.ping({});
    expect(ping).toEqual({ pong: true });
  });

  it('list returns created users', async () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers(), sampleEvents);
    cleanup = harness.cleanup;

    await harness.api.users.create({ name: 'A', email: 'a@test.com' });
    await harness.api.users.create({ name: 'B', email: 'b@test.com' });

    const result = await harness.api.users.list({});
    expect(result.total).toBe(2);
    expect(result.users).toHaveLength(2);
  });

  it('propagates errors as IpcMethodError', async () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers(), sampleEvents);
    cleanup = harness.cleanup;

    try {
      await harness.api.users.get({ id: 'nonexistent' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isIpcMethodError(err)).toBe(true);
      expect((err as IpcMethodError).error.type).toBe('internal');
      expect((err as IpcMethodError).error.message).toContain('not found');
    }
  });

  it('emits events and delivers to subscriptions', async () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers(), sampleEvents);
    cleanup = harness.cleanup;

    const received: unknown[] = [];
    harness.events!.users.onCreated((payload) => received.push(payload));

    harness.emitter!.users.onCreated({ userId: '1', name: 'Alice' });

    expect(received).toEqual([{ userId: '1', name: 'Alice' }]);
  });

  it('event unsubscription works', () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers(), sampleEvents);
    cleanup = harness.cleanup;

    const received: unknown[] = [];
    const unsub = harness.events!.users.onCreated((p) => received.push(p));

    harness.emitter!.users.onCreated({ userId: '1', name: 'A' });
    expect(received).toHaveLength(1);

    unsub();
    harness.emitter!.users.onCreated({ userId: '2', name: 'B' });
    expect(received).toHaveLength(1);
  });

  it('multiple event subscribers all receive', () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers(), sampleEvents);
    cleanup = harness.cleanup;

    const a: unknown[] = [];
    const b: unknown[] = [];
    harness.events!.users.onCreated((p) => a.push(p));
    harness.events!.users.onCreated((p) => b.push(p));

    harness.emitter!.users.onCreated({ userId: '1', name: 'X' });
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it('webContents records emitted events', () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers(), sampleEvents);
    cleanup = harness.cleanup;

    harness.emitter!.system.onReady({ version: '2.0' });
    const msgs = harness.webContents.getSentMessages();
    expect(msgs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: 'ipc:system:onReady',
          args: [{ version: '2.0' }],
        }),
      ])
    );
  });

  it('cleanup removes handlers', async () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers(), sampleEvents);
    harness.cleanup();
    cleanup = undefined;

    expect(harness.ipcMain.hasHandler('ipc:users:create')).toBe(false);
    expect(harness.ipcMain.hasHandler('ipc:system:ping')).toBe(false);
  });

  it('works without events (methods only)', async () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers());
    cleanup = harness.cleanup;

    const result = await harness.api.system.ping({});
    expect(result).toEqual({ pong: true });
    expect(harness.events).toBeUndefined();
    expect(harness.emitter).toBeUndefined();
  });

  it('supports custom channel resolvers via options', async () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers(), sampleEvents, {
      implementOptions: { channelResolver: (g, m) => `v:${g}:${m}` },
      exposeOptions: {
        channelResolver: (g, m) => `v:${g}:${m}`,
        eventChannelResolver: (g, e) => `v:${g}:${e}`,
      },
      emitterOptions: { channelResolver: (g, e) => `v:${g}:${e}` },
    });
    cleanup = harness.cleanup;

    // Methods should still work through the custom resolver
    const result = await harness.api.system.ping({});
    expect(result).toEqual({ pong: true });

    // Handlers should be on custom channels
    expect(harness.ipcMain.hasHandler('v:system:ping')).toBe(true);
    expect(harness.ipcMain.hasHandler('ipc:system:ping')).toBe(false);
  });

  it('handles concurrent requests', async () => {
    const harness = createTestHarness(sampleApi, createSampleHandlers(), sampleEvents);
    cleanup = harness.cleanup;

    const [u1, u2, u3] = await Promise.all([
      harness.api.users.create({ name: 'A', email: 'a@test.com' }),
      harness.api.users.create({ name: 'B', email: 'b@test.com' }),
      harness.api.users.create({ name: 'C', email: 'c@test.com' }),
    ]);

    expect(u1.name).toBe('A');
    expect(u2.name).toBe('B');
    expect(u3.name).toBe('C');
  });
});
