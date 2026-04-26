import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { expose } from '../preload';
import { implement } from '../main';
import { createMockIpcMain, createMockIpcRenderer, createMockContextBridge } from '../testing';
import { sampleApi, sampleEvents, createSampleHandlers } from './fixtures';
import type { IpcMethodError } from '../errors';
import { isIpcMethodError } from '../errors';

describe('expose()', () => {
  let ipcMain: ReturnType<typeof createMockIpcMain>;
  let ipcRenderer: ReturnType<typeof createMockIpcRenderer>;
  let contextBridge: ReturnType<typeof createMockContextBridge>;

  beforeEach(() => {
    ipcMain = createMockIpcMain();
    ipcRenderer = createMockIpcRenderer(ipcMain);
    contextBridge = createMockContextBridge();
    implement(ipcMain, sampleApi, createSampleHandlers());
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['api'];
    delete (globalThis as Record<string, unknown>)['events'];
  });

  it('exposes methods on the api key', () => {
    expose(contextBridge, ipcRenderer, sampleApi);

    const exposed = contextBridge.getExposed('api') as Record<string, Record<string, unknown>>;
    expect(exposed).toBeDefined();
    expect(typeof exposed.users.create).toBe('function');
    expect(typeof exposed.users.get).toBe('function');
    expect(typeof exposed.system.ping).toBe('function');
  });

  it('exposes events on the events key', () => {
    expose(contextBridge, ipcRenderer, sampleApi, sampleEvents);

    const exposed = contextBridge.getExposed('events') as Record<string, Record<string, unknown>>;
    expect(exposed).toBeDefined();
    expect(typeof exposed.users.onCreated).toBe('function');
    expect(typeof exposed.users.onDeleted).toBe('function');
    expect(typeof exposed.system.onReady).toBe('function');
  });

  it('uses custom apiKey and eventsKey', () => {
    expose(contextBridge, ipcRenderer, sampleApi, sampleEvents, {
      apiKey: 'myApi',
      eventsKey: 'myEvents',
    });

    expect(contextBridge.getExposed('myApi')).toBeDefined();
    expect(contextBridge.getExposed('myEvents')).toBeDefined();
    expect(contextBridge.getExposed('api')).toBeUndefined();

    // Clean up custom keys
    delete (globalThis as Record<string, unknown>)['myApi'];
    delete (globalThis as Record<string, unknown>)['myEvents'];
  });

  it('method calls invoke ipcMain handlers and return data', async () => {
    expose(contextBridge, ipcRenderer, sampleApi);

    const api = contextBridge.getExposed('api') as Record<
      string,
      Record<string, (input: unknown) => Promise<unknown>>
    >;
    const result = await api.users.create({ name: 'Alice', email: 'alice@test.com' });
    expect(result).toEqual(expect.objectContaining({ name: 'Alice', email: 'alice@test.com' }));
  });

  it('throws IpcMethodError on handler failure', async () => {
    // Re-implement with a failing handler
    const failMain = createMockIpcMain();
    const failRenderer = createMockIpcRenderer(failMain);
    const failBridge = createMockContextBridge();

    implement(failMain, sampleApi, {
      users: {
        create: async () => {
          throw new Error('db down');
        },
        get: async () => {
          throw new Error('x');
        },
        list: async () => ({ users: [], total: 0 }),
      },
      system: { ping: async () => ({ pong: true }) },
    });

    expose(failBridge, failRenderer, sampleApi);

    const api = failBridge.getExposed('api') as Record<
      string,
      Record<string, (input: unknown) => Promise<unknown>>
    >;

    try {
      await api.users.create({ name: 'A', email: 'a@b.com' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isIpcMethodError(err)).toBe(true);
      const ipcErr = err as IpcMethodError;
      expect(ipcErr.error.type).toBe('internal');
      expect(ipcErr.group).toBe('users');
      expect(ipcErr.method).toBe('create');
    }

    // Clean up
    delete (globalThis as Record<string, unknown>)['api'];
  });

  it('validates input when validateInput is true', async () => {
    const valBridge = createMockContextBridge();
    expose(valBridge, ipcRenderer, sampleApi, undefined, { validateInput: true });

    const api = valBridge.getExposed('api') as Record<
      string,
      Record<string, (input: unknown) => Promise<unknown>>
    >;

    try {
      await api.users.create({ name: '', email: 'bad' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isIpcMethodError(err)).toBe(true);
      expect((err as IpcMethodError).error.type).toBe('validation');
    }

    delete (globalThis as Record<string, unknown>)['api'];
  });

  it('event subscriptions return unsubscribe functions', () => {
    expose(contextBridge, ipcRenderer, sampleApi, sampleEvents);

    const events = contextBridge.getExposed('events') as Record<
      string,
      Record<string, (cb: (payload: unknown) => void) => () => void>
    >;

    const payloads: unknown[] = [];
    const unsub = events.users.onCreated((p) => payloads.push(p));

    expect(typeof unsub).toBe('function');

    // Simulate event
    ipcRenderer.simulateEvent('ipc:users:onCreated', { userId: '1', name: 'A' });
    expect(payloads).toHaveLength(1);

    // Unsubscribe and verify no more events
    unsub();
    ipcRenderer.simulateEvent('ipc:users:onCreated', { userId: '2', name: 'B' });
    expect(payloads).toHaveLength(1);
  });
});
