/**
 * DevCallbackServer — Local HTTP server for deep link callbacks in dev mode.
 *
 * In production, the browser redirects to `vienna://...` URLs which the
 * OS routes to Electron via the registered protocol handler.
 *
 * In dev mode, protocol handlers aren't registered, so deep links can be
 * tested by visiting `http://localhost:{port}/...` instead. This server
 * receives those requests and forwards them to DeepLinkHandler.
 */

import http from 'node:http';
import type { MainLogger } from '@vienna/logger/main';
import type { DeepLinkHandler } from './DeepLinkHandler';

export interface DevCallbackServerOptions {
  deepLinkHandler: DeepLinkHandler;
  protocolScheme: string;
  logger: MainLogger;
}

export class DevCallbackServer {
  private server: http.Server | null = null;
  private port: number | null = null;

  constructor(private readonly options: DevCallbackServerOptions) {}

  /**
   * Start the server on a random available port.
   * Returns the port number once listening.
   */
  async start(): Promise<number> {
    const { deepLinkHandler, protocolScheme, logger } = this.options;

    return new Promise<number>((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        // Exact match for leaf routes, prefix match for routes with dynamic segments
        // (e.g. /profile/:id). startsWith on exact paths like '/plugin/install' is
        // harmless because query params live in url.search, not url.pathname.
        const knownPaths = ['/auth/callback', '/plugin/install', '/profile/'];

        if (knownPaths.some((p) => url.pathname === p || url.pathname.startsWith(p))) {
          // Forward to deep link handler as a protocol URL
          const deepLinkUrl = `${protocolScheme}://${url.pathname.slice(1)}${url.search}`;
          void deepLinkHandler.handleUrl(deepLinkUrl);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            '<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh">' +
              '<p>Done. You can close this tab.</p>' +
              '<script>window.close()</script></body></html>',
          );
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      this.server.on('error', reject);

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address();
        this.port = typeof addr === 'object' ? addr!.port : 0;
        logger.info('Dev auth callback server listening', { port: this.port });
        resolve(this.port);
      });
    });
  }

  getPort(): number | null {
    return this.port;
  }

  stop(): void {
    this.server?.close();
    this.server = null;
    this.port = null;
  }
}
