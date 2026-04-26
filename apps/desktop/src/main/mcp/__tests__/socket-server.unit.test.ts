/**
 * Tests for the MCP socket server.
 *
 * Tests the NDJSON protocol over a real Unix socket — verifies that
 * requests are routed to handlers and responses are correctly formatted.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Logger } from '@vienna/logger';
import { MCPSocketServer } from '../socket-server';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createTestLogger(): Logger {
  const noop = () => {};
  return {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => createTestLogger(),
    flush: () => Promise.resolve(),
  };
}

function testSocketPath(): string {
  return path.join(os.tmpdir(), `test-mcp-${randomUUID()}.sock`);
}

/** Send a request over the socket and wait for a response. */
function sendRequest(
  socketPath: string,
  request: { id: string; method: string; params?: Record<string, unknown> },
): Promise<{ id: string; result?: unknown; error?: { code: string; message: string } }> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath, () => {
      client.write(JSON.stringify(request) + '\n');
    });

    let buffer = '';
    client.on('data', (data) => {
      buffer += data.toString();
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx !== -1) {
        const line = buffer.slice(0, newlineIdx);
        client.destroy();
        try {
          resolve(JSON.parse(line));
        } catch (err) {
          reject(err);
        }
      }
    });

    client.on('error', reject);
    setTimeout(() => {
      client.destroy();
      reject(new Error('Timeout'));
    }, 5000);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

let server: MCPSocketServer | null = null;

afterEach(async () => {
  if (server) {
    await server.stop();
    server = null;
  }
});

describe('MCPSocketServer', () => {
  it('starts and stops cleanly', async () => {
    const socketPath = testSocketPath();
    server = new MCPSocketServer(socketPath, createTestLogger());
    await server.start();
    await server.stop();
    server = null;
  });

  it('routes requests to registered handlers', async () => {
    const socketPath = testSocketPath();
    server = new MCPSocketServer(socketPath, createTestLogger());

    server.registerHandler('echo', async (params) => {
      return { echo: params['message'] };
    });

    await server.start();

    const response = await sendRequest(socketPath, {
      id: 'req-1',
      method: 'echo',
      params: { message: 'hello' },
    });

    expect(response.id).toBe('req-1');
    expect(response.result).toEqual({ echo: 'hello' });
    expect(response.error).toBeUndefined();
  });

  it('returns METHOD_NOT_FOUND for unknown methods', async () => {
    const socketPath = testSocketPath();
    server = new MCPSocketServer(socketPath, createTestLogger());
    await server.start();

    const response = await sendRequest(socketPath, {
      id: 'req-2',
      method: 'nonexistent',
    });

    expect(response.id).toBe('req-2');
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe('METHOD_NOT_FOUND');
  });

  it('returns INTERNAL_ERROR when handler throws', async () => {
    const socketPath = testSocketPath();
    server = new MCPSocketServer(socketPath, createTestLogger());

    server.registerHandler('fail', async () => {
      throw new Error('Something broke');
    });

    await server.start();

    const response = await sendRequest(socketPath, {
      id: 'req-3',
      method: 'fail',
    });

    expect(response.id).toBe('req-3');
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe('INTERNAL_ERROR');
    expect(response.error!.message).toBe('Something broke');
  });

  it('handles multiple sequential requests on the same connection', async () => {
    const socketPath = testSocketPath();
    server = new MCPSocketServer(socketPath, createTestLogger());

    let callCount = 0;
    server.registerHandler('count', async () => {
      callCount++;
      return { count: callCount };
    });

    await server.start();

    // Send two requests on the same connection
    const results = await new Promise<unknown[]>((resolve, reject) => {
      const client = net.createConnection(socketPath, () => {
        client.write(JSON.stringify({ id: 'a', method: 'count' }) + '\n');
        client.write(JSON.stringify({ id: 'b', method: 'count' }) + '\n');
      });

      let buffer = '';
      const responses: unknown[] = [];

      client.on('data', (data) => {
        buffer += data.toString();
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.trim()) {
            responses.push(JSON.parse(line));
            if (responses.length === 2) {
              client.destroy();
              resolve(responses);
            }
          }
        }
      });

      client.on('error', reject);
      setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout'));
      }, 5000);
    });

    expect(results).toHaveLength(2);
  });

  it('returns INVALID_REQUEST for malformed JSON', async () => {
    const socketPath = testSocketPath();
    server = new MCPSocketServer(socketPath, createTestLogger());
    await server.start();

    // Send invalid JSON — should get an INVALID_REQUEST or INTERNAL_ERROR
    const response = await new Promise<{ id: string; error?: { code: string } }>((resolve, reject) => {
      const client = net.createConnection(socketPath, () => {
        // Valid JSON but missing required fields (no method)
        client.write(JSON.stringify({ id: 'req-bad' }) + '\n');
      });

      let buffer = '';
      client.on('data', (data) => {
        buffer += data.toString();
        const idx = buffer.indexOf('\n');
        if (idx !== -1) {
          client.destroy();
          resolve(JSON.parse(buffer.slice(0, idx)));
        }
      });

      client.on('error', reject);
      setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout'));
      }, 5000);
    });

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe('INVALID_REQUEST');
  });

  it('reports registered methods', () => {
    const socketPath = testSocketPath();
    server = new MCPSocketServer(socketPath, createTestLogger());

    server.registerHandler('a', async () => ({}));
    server.registerHandler('b', async () => ({}));

    expect(server.getRegisteredMethods()).toEqual(['a', 'b']);
  });
});
