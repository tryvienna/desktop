import { describe, it, expect } from 'vitest';
import {
  createMockIpcMain,
  createMockIpcRenderer,
  createMockContextBridge,
  createMockWebContents,
} from '../testing';

describe('createMockIpcMain()', () => {
  it('registers and invokes handlers', async () => {
    const ipcMain = createMockIpcMain();
    ipcMain.handle('test', async (_event, input) => ({ echo: input }));

    const result = await ipcMain.invoke('test', 'hello');
    expect(result).toEqual({ echo: 'hello' });
  });

  it('hasHandler returns true for registered channels', () => {
    const ipcMain = createMockIpcMain();
    expect(ipcMain.hasHandler('test')).toBe(false);
    ipcMain.handle('test', async () => null);
    expect(ipcMain.hasHandler('test')).toBe(true);
  });

  it('removeHandler unregisters the handler', () => {
    const ipcMain = createMockIpcMain();
    ipcMain.handle('test', async () => null);
    ipcMain.removeHandler('test');
    expect(ipcMain.hasHandler('test')).toBe(false);
  });

  it('invoke throws for unregistered channels', async () => {
    const ipcMain = createMockIpcMain();
    await expect(ipcMain.invoke('missing')).rejects.toThrow(/No handler registered/);
  });
});

describe('createMockIpcRenderer()', () => {
  it('invoke routes through connected ipcMain', async () => {
    const ipcMain = createMockIpcMain();
    ipcMain.handle('test', async () => 42);

    const ipcRenderer = createMockIpcRenderer(ipcMain);
    const result = await ipcRenderer.invoke('test');
    expect(result).toBe(42);
  });

  it('invoke throws when not connected', async () => {
    const ipcRenderer = createMockIpcRenderer();
    await expect(ipcRenderer.invoke('test')).rejects.toThrow(/Not connected/);
  });

  it('on/simulateEvent delivers events to listeners', () => {
    const ipcRenderer = createMockIpcRenderer();
    const payloads: unknown[] = [];
    ipcRenderer.on('test', (_event, payload) => payloads.push(payload));

    ipcRenderer.simulateEvent('test', 'hello');
    expect(payloads).toEqual(['hello']);
  });

  it('removeListener stops delivery', () => {
    const ipcRenderer = createMockIpcRenderer();
    const payloads: unknown[] = [];
    const listener = (_event: unknown, payload: unknown) => payloads.push(payload);
    ipcRenderer.on('test', listener);
    ipcRenderer.removeListener('test', listener);

    ipcRenderer.simulateEvent('test', 'hello');
    expect(payloads).toEqual([]);
  });

  it('supports multiple listeners on same channel', () => {
    const ipcRenderer = createMockIpcRenderer();
    const a: unknown[] = [];
    const b: unknown[] = [];
    ipcRenderer.on('ch', (_e, p) => a.push(p));
    ipcRenderer.on('ch', (_e, p) => b.push(p));

    ipcRenderer.simulateEvent('ch', 'x');
    expect(a).toEqual(['x']);
    expect(b).toEqual(['x']);
  });
});

describe('createMockContextBridge()', () => {
  it('exposes and retrieves APIs', () => {
    const bridge = createMockContextBridge();
    bridge.exposeInMainWorld('myApi', { foo: 'bar' });

    expect(bridge.getExposed('myApi')).toEqual({ foo: 'bar' });
    expect((globalThis as Record<string, unknown>)['myApi']).toEqual({ foo: 'bar' });

    // Cleanup
    delete (globalThis as Record<string, unknown>)['myApi'];
  });

  it('returns undefined for unexposed keys', () => {
    const bridge = createMockContextBridge();
    expect(bridge.getExposed('nope')).toBeUndefined();
  });
});

describe('createMockWebContents()', () => {
  it('records sent messages', () => {
    const wc = createMockWebContents();
    wc.send('ch1', 'a', 'b');
    wc.send('ch2', 42);

    const msgs = wc.getSentMessages();
    expect(msgs).toEqual([
      { channel: 'ch1', args: ['a', 'b'] },
      { channel: 'ch2', args: [42] },
    ]);
  });

  it('isDestroyed returns false by default', () => {
    expect(createMockWebContents().isDestroyed()).toBe(false);
  });
});
