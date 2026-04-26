import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'node:http';
import { DevCallbackServer } from './DevCallbackServer';
import type { DeepLinkHandler } from './DeepLinkHandler';
import type { MainLogger } from '@vienna/logger/main';

function createMockLogger(): MainLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
    flush: vi.fn(),
    close: vi.fn(),
  } as unknown as MainLogger;
}

function createMockDeepLinkHandler(): DeepLinkHandler {
  return {
    handleUrl: vi.fn(),
    setPendingAuthState: vi.fn(),
  } as unknown as DeepLinkHandler;
}

/** Helper to make HTTP requests against the local server. */
function request(
  port: number,
  path: string,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'GET' },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode ?? 0, body });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('DevCallbackServer', () => {
  let logger: MainLogger;
  let deepLinkHandler: DeepLinkHandler;
  let server: DevCallbackServer;

  beforeEach(() => {
    logger = createMockLogger();
    deepLinkHandler = createMockDeepLinkHandler();
    server = new DevCallbackServer({
      deepLinkHandler,
      protocolScheme: 'vienna-dev',
      logger,
    });
  });

  afterEach(() => {
    server.stop();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // start()
  // ─────────────────────────────────────────────────────────────────────────

  describe('start()', () => {
    it('starts and returns a port number', async () => {
      const port = await server.start();

      expect(port).toBeTypeOf('number');
      expect(port).toBeGreaterThan(0);
      expect(logger.info).toHaveBeenCalledWith('Dev auth callback server listening', { port });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // /auth/callback route
  // ─────────────────────────────────────────────────────────────────────────

  describe('/auth/callback route', () => {
    it('forwards to DeepLinkHandler as protocol URL', async () => {
      const port = await server.start();

      await request(port, '/auth/callback?token=tok&userId=uid&state=s');

      expect(deepLinkHandler.handleUrl).toHaveBeenCalledWith(
        'vienna-dev://auth/callback?token=tok&userId=uid&state=s',
      );
    });

    it('returns 200 with success HTML', async () => {
      const port = await server.start();

      const res = await request(port, '/auth/callback?token=tok&userId=uid&state=s');

      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Authentication successful');
      expect(res.body).toContain('window.close');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Unknown routes
  // ─────────────────────────────────────────────────────────────────────────

  describe('unknown routes', () => {
    it('returns 404', async () => {
      const port = await server.start();

      const res = await request(port, '/some/unknown/path');

      expect(res.statusCode).toBe(404);
      expect(deepLinkHandler.handleUrl).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // stop()
  // ─────────────────────────────────────────────────────────────────────────

  describe('stop()', () => {
    it('closes the server', async () => {
      const port = await server.start();

      server.stop();

      // After stopping, the port should be cleared
      expect(server.getPort()).toBeNull();

      // Requests to the old port should fail
      await expect(request(port, '/')).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getPort()
  // ─────────────────────────────────────────────────────────────────────────

  describe('getPort()', () => {
    it('returns null before start', () => {
      expect(server.getPort()).toBeNull();
    });

    it('returns the port after start', async () => {
      const port = await server.start();

      expect(server.getPort()).toBe(port);
    });

    it('returns null after stop', async () => {
      await server.start();
      server.stop();

      expect(server.getPort()).toBeNull();
    });
  });
});
