/**
 * Tests for BridgeToolContext — Unix socket NDJSON client.
 *
 * Spins up a local net.Server speaking NDJSON to test the bridge
 * without needing the Electron app.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as net from 'node:net';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BridgeToolContext } from '../bridge';

// ─────────────────────────────────────────────────────────────────────────────
// Test NDJSON Server
// ─────────────────────────────────────────────────────────────────────────────

type RequestHandler = (req: { id: string; method: string; params?: unknown }) => unknown;

function createTestServer(socketPath: string, handler: RequestHandler): net.Server {
  const server = net.createServer((conn) => {
    let buffer = '';
    conn.on('data', (data) => {
      buffer += data.toString();
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        const req = JSON.parse(line);
        try {
          const result = handler(req);
          conn.write(JSON.stringify({ id: req.id, result }) + '\n');
        } catch (err) {
          conn.write(
            JSON.stringify({
              id: req.id,
              error: { code: 'TEST_ERROR', message: (err as Error).message },
            }) + '\n'
          );
        }
      }
    });
  });
  return server;
}

function listenAsync(server: net.Server, socketPath: string): Promise<void> {
  return new Promise((resolve) => server.listen(socketPath, resolve));
}

function closeAsync(server: net.Server): Promise<void> {
  return new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('BridgeToolContext', () => {
  let socketPath: string;
  let server: net.Server;
  let bridge: BridgeToolContext;

  beforeEach(() => {
    socketPath = path.join(os.tmpdir(), `bridge-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sock`);
  });

  afterEach(async () => {
    bridge?.disconnect();
    if (server?.listening) {
      await closeAsync(server);
    }
    try {
      fs.unlinkSync(socketPath);
    } catch {
      // already cleaned up
    }
  });

  it('connects and sends a request/response cycle', async () => {
    server = createTestServer(socketPath, (req) => {
      if (req.method === 'entity.get') return { entity: { id: '1', title: 'Test' } };
      return {};
    });
    await listenAsync(server, socketPath);

    bridge = new BridgeToolContext(socketPath);
    await bridge.connect();

    const entity = await bridge.getEntity('@vienna//test/1');
    expect(entity).toEqual({ id: '1', title: 'Test' });
  });

  it('handles server-side errors', async () => {
    server = createTestServer(socketPath, () => {
      throw new Error('Something went wrong');
    });
    await listenAsync(server, socketPath);

    bridge = new BridgeToolContext(socketPath);
    await bridge.connect();

    await expect(bridge.getEntity('@vienna//test/1')).rejects.toThrow('TEST_ERROR: Something went wrong');
  });

  it('correlates concurrent requests by id', async () => {
    server = createTestServer(socketPath, (req) => {
      const params = req.params as { uri?: string };
      return { entity: { id: '1', uri: params?.uri ?? 'unknown' } };
    });
    await listenAsync(server, socketPath);

    bridge = new BridgeToolContext(socketPath);
    await bridge.connect();

    const [r1, r2, r3] = await Promise.all([
      bridge.getEntity('@vienna//test/alpha'),
      bridge.getEntity('@vienna//test/beta'),
      bridge.getEntity('@vienna//test/gamma'),
    ]);

    expect(r1).toEqual({ id: '1', uri: '@vienna//test/alpha' });
    expect(r2).toEqual({ id: '1', uri: '@vienna//test/beta' });
    expect(r3).toEqual({ id: '1', uri: '@vienna//test/gamma' });
  });

  it('handles partial NDJSON line buffering', async () => {
    // Server that sends response in chunks to test buffering
    const rawServer = net.createServer((conn) => {
      let buffer = '';
      conn.on('data', (data) => {
        buffer += data.toString();
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          const req = JSON.parse(line);
          const response = JSON.stringify({ id: req.id, result: { entity: { id: 'x' } } }) + '\n';
          // Send in two chunks to test buffering
          const mid = Math.floor(response.length / 2);
          conn.write(response.slice(0, mid));
          setTimeout(() => conn.write(response.slice(mid)), 10);
        }
      });
    });
    server = rawServer;
    await listenAsync(server, socketPath);

    bridge = new BridgeToolContext(socketPath);
    await bridge.connect();

    const entity = await bridge.getEntity('@vienna//test/x');
    expect(entity).toEqual({ id: 'x' });
  });

  it('coalesces concurrent connect() calls (no orphaned sockets)', async () => {
    let connectionCount = 0;
    server = net.createServer((conn) => {
      connectionCount++;
      let buffer = '';
      conn.on('data', (data) => {
        buffer += data.toString();
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          const req = JSON.parse(line);
          conn.write(JSON.stringify({ id: req.id, result: { types: [] } }) + '\n');
        }
      });
    });
    await listenAsync(server, socketPath);

    bridge = new BridgeToolContext(socketPath);

    // Fire multiple connect() calls concurrently
    await Promise.all([bridge.connect(), bridge.connect(), bridge.connect()]);

    // Should have only created one socket connection
    expect(connectionCount).toBe(1);
  });

  it('rejects pending requests when connection closes', async () => {
    server = net.createServer((conn) => {
      // Accept connection then immediately close
      conn.destroy();
    });
    await listenAsync(server, socketPath);

    bridge = new BridgeToolContext(socketPath);
    await bridge.connect();

    await expect(bridge.getEntityTypes()).rejects.toThrow();
  });

  it('auto-connects on first request if not connected', async () => {
    server = createTestServer(socketPath, () => ({ types: [] }));
    await listenAsync(server, socketPath);

    bridge = new BridgeToolContext(socketPath);
    // Don't call connect() — should auto-connect on request
    const types = await bridge.getEntityTypes();
    expect(types).toEqual([]);
  });

  it('rejects with connection timeout for non-existent socket', async () => {
    bridge = new BridgeToolContext('/tmp/nonexistent-socket-path.sock');
    await expect(bridge.connect()).rejects.toThrow();
  });

  it('disconnect is idempotent', async () => {
    server = createTestServer(socketPath, () => ({}));
    await listenAsync(server, socketPath);

    bridge = new BridgeToolContext(socketPath);
    await bridge.connect();

    // Should not throw when called multiple times
    bridge.disconnect();
    bridge.disconnect();
  });
});
