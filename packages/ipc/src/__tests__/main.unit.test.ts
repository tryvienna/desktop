import { describe, it, expect, vi } from 'vitest';
import { implement, createEmitter } from '../main';
import { createMockIpcMain, createMockWebContents } from '../testing';
import { sampleApi, sampleEvents, createSampleHandlers } from './fixtures';
import { createNotFoundError } from '../errors';

describe('implement()', () => {
  it('registers handlers for all methods', () => {
    const ipcMain = createMockIpcMain();
    const handlers = createSampleHandlers();
    implement(ipcMain, sampleApi, handlers);

    expect(ipcMain.hasHandler('ipc:users:create')).toBe(true);
    expect(ipcMain.hasHandler('ipc:users:get')).toBe(true);
    expect(ipcMain.hasHandler('ipc:users:list')).toBe(true);
    expect(ipcMain.hasHandler('ipc:system:ping')).toBe(true);
  });

  it('returns a cleanup function that removes handlers', () => {
    const ipcMain = createMockIpcMain();
    const cleanup = implement(ipcMain, sampleApi, createSampleHandlers());

    expect(ipcMain.hasHandler('ipc:users:create')).toBe(true);
    cleanup();
    expect(ipcMain.hasHandler('ipc:users:create')).toBe(false);
  });

  it('validates input by default and returns validation error', async () => {
    const ipcMain = createMockIpcMain();
    implement(ipcMain, sampleApi, createSampleHandlers());

    const result = await ipcMain.invoke('ipc:users:create', { name: '', email: 'not-email' });
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ type: 'validation' }),
      })
    );
  });

  it('executes handler and returns success', async () => {
    const ipcMain = createMockIpcMain();
    implement(ipcMain, sampleApi, createSampleHandlers());

    const result = await ipcMain.invoke('ipc:users:create', {
      name: 'John',
      email: 'john@test.com',
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ name: 'John', email: 'john@test.com' }),
      })
    );
  });

  it('wraps thrown errors into IpcResult', async () => {
    const ipcMain = createMockIpcMain();
    implement(ipcMain, sampleApi, {
      users: {
        create: async () => {
          throw new Error('db failure');
        },
        get: async () => {
          throw new Error('x');
        },
        list: async () => ({ users: [], total: 0 }),
      },
      system: { ping: async () => ({ pong: true }) },
    });

    const result = await ipcMain.invoke('ipc:users:create', {
      name: 'John',
      email: 'j@t.com',
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ type: 'internal', message: 'db failure' }),
      })
    );
  });

  it('wraps structured IpcError thrown by handler', async () => {
    const ipcMain = createMockIpcMain();
    implement(ipcMain, sampleApi, {
      users: {
        create: async () => {
          throw createNotFoundError('db', { id: 'x' });
        },
        get: async () => {
          throw new Error('x');
        },
        list: async () => ({ users: [], total: 0 }),
      },
      system: { ping: async () => ({ pong: true }) },
    });

    const result = await ipcMain.invoke('ipc:users:create', {
      name: 'John',
      email: 'j@t.com',
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ type: 'not_found', resource: 'db' }),
      })
    );
  });

  it('calls onError callback on failure', async () => {
    const ipcMain = createMockIpcMain();
    const onError = vi.fn();

    implement(
      ipcMain,
      sampleApi,
      {
        users: {
          create: async () => {
            throw new Error('boom');
          },
          get: async () => {
            throw new Error('x');
          },
          list: async () => ({ users: [], total: 0 }),
        },
        system: { ping: async () => ({ pong: true }) },
      },
      { onError }
    );

    await ipcMain.invoke('ipc:users:create', { name: 'A', email: 'a@b.com' });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toEqual(
      expect.objectContaining({ type: 'internal', message: 'boom' })
    );
  });

  it('uses custom channelResolver', () => {
    const ipcMain = createMockIpcMain();
    implement(ipcMain, sampleApi, createSampleHandlers(), {
      channelResolver: (g, m) => `custom:${g}:${m}`,
    });

    expect(ipcMain.hasHandler('custom:users:create')).toBe(true);
    expect(ipcMain.hasHandler('ipc:users:create')).toBe(false);
  });

  it('throws when handlers are missing for a group', () => {
    const ipcMain = createMockIpcMain();
    expect(() => {
      implement(ipcMain, sampleApi, {
        users: createSampleHandlers().users,
        // system group missing
      } as never);
    }).toThrow(/No handlers provided for group "system"/);
  });

  it('throws when a specific handler is missing', () => {
    const ipcMain = createMockIpcMain();
    expect(() => {
      implement(ipcMain, sampleApi, {
        users: {
          create: createSampleHandlers().users.create,
          // get and list missing
        },
        system: createSampleHandlers().system,
      } as never);
    }).toThrow(/No handler provided for "users\.get"/);
  });

  it('validates output when validateOutput is true', async () => {
    const ipcMain = createMockIpcMain();
    implement(
      ipcMain,
      sampleApi,
      {
        users: {
          create: async () => ({ wrong: 'shape' }),
          get: async () => ({ wrong: 'shape' }),
          list: async () => ({ users: [], total: 0 }),
        },
        system: { ping: async () => ({ pong: true }) },
      } as never,
      { validateOutput: true }
    );

    const result = await ipcMain.invoke('ipc:users:create', {
      name: 'A',
      email: 'a@b.com',
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ type: 'internal', code: 'INVALID_OUTPUT' }),
      })
    );
  });

  it('skips input validation when validateInput is false', async () => {
    const ipcMain = createMockIpcMain();
    implement(ipcMain, sampleApi, createSampleHandlers(), { validateInput: false });

    // Pass invalid input — should still succeed because validation is off
    const result = await ipcMain.invoke('ipc:system:ping', 'not-an-object');
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });
});

describe('createEmitter()', () => {
  it('creates an emitter with correct group/event structure', () => {
    const wc = createMockWebContents();
    const emitter = createEmitter(sampleEvents, { webContents: [wc] });

    expect(typeof emitter.users.onCreated).toBe('function');
    expect(typeof emitter.users.onDeleted).toBe('function');
    expect(typeof emitter.system.onReady).toBe('function');
  });

  it('sends events to webContents', () => {
    const wc = createMockWebContents();
    const emitter = createEmitter(sampleEvents, { webContents: [wc] });

    emitter.users.onCreated({ userId: '1', name: 'John' });

    const msgs = wc.getSentMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].channel).toBe('ipc:users:onCreated');
    expect(msgs[0].args).toEqual([{ userId: '1', name: 'John' }]);
  });

  it('sends to multiple webContents', () => {
    const wc1 = createMockWebContents();
    const wc2 = createMockWebContents();
    const emitter = createEmitter(sampleEvents, { webContents: [wc1, wc2] });

    emitter.system.onReady({ version: '1.0' });

    expect(wc1.getSentMessages()).toHaveLength(1);
    expect(wc2.getSentMessages()).toHaveLength(1);
  });

  it('uses getWebContents callback', () => {
    const wc = createMockWebContents();
    const emitter = createEmitter(sampleEvents, { getWebContents: () => [wc] });

    emitter.users.onDeleted({ userId: '1' });
    expect(wc.getSentMessages()).toHaveLength(1);
  });

  it('skips destroyed webContents', () => {
    const wc = createMockWebContents();
    // Override isDestroyed to return true
    wc.isDestroyed = () => true;
    const emitter = createEmitter(sampleEvents, { webContents: [wc] });

    emitter.users.onCreated({ userId: '1', name: 'John' });
    expect(wc.getSentMessages()).toHaveLength(0);
  });

  it('validates payload when validate is true', () => {
    const wc = createMockWebContents();
    const emitter = createEmitter(sampleEvents, { webContents: [wc] }, { validate: true });

    expect(() => {
      // @ts-expect-error intentionally passing wrong payload
      emitter.users.onCreated({ wrong: 'shape' });
    }).toThrow(/Invalid event payload/);
  });

  it('uses custom channelResolver', () => {
    const wc = createMockWebContents();
    const emitter = createEmitter(
      sampleEvents,
      { webContents: [wc] },
      {
        channelResolver: (g, e) => `custom:${g}:${e}`,
      }
    );

    emitter.users.onCreated({ userId: '1', name: 'John' });
    expect(wc.getSentMessages()[0].channel).toBe('custom:users:onCreated');
  });
});
