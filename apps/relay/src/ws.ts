/**
 * WebSocket handler for mobile push events.
 *
 * Mobile clients connect via WS to receive real-time push events
 * from the desktop app. Auth is via apiKey query parameter since
 * React Native WebSocket doesn't support custom headers.
 *
 * Path: /api/tunnel/:tunnelId/ws?apiKey=...
 */

import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { getTunnel, addWsClient, removeWsClient } from './tunnel-registry.js';
import { safeEqual } from './auth.js';

const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 45_000;
const MAX_WS_PER_TUNNEL = 10;

export function setupWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const match = url.pathname.match(/^\/api\/tunnel\/([^/]+)\/ws$/);
    if (!match) {
      socket.destroy();
      return;
    }

    const tunnelId = match[1]!;
    const apiKey = url.searchParams.get('apiKey');

    const tunnel = getTunnel(tunnelId);
    if (!tunnel || !apiKey || !safeEqual(apiKey, tunnel.apiKey)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    if (tunnel.wsClients.size >= MAX_WS_PER_TUNNEL) {
      socket.write('HTTP/1.1 429 Too Many Connections\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, tunnelId);
    });
  });

  wss.on('connection', (ws: WebSocket, tunnelId: string) => {
    addWsClient(tunnelId, ws);

    // Send initial connected message
    ws.send(JSON.stringify({ type: 'connected' }));

    // Application-level ping/pong (React Native doesn't expose WS protocol pings)
    let lastPongAt = Date.now();

    const pingInterval = setInterval(() => {
      try {
        ws.send(JSON.stringify({ type: 'ping' }));
      } catch {
        cleanup();
      }
    }, PING_INTERVAL_MS);

    const staleCheck = setInterval(() => {
      if (Date.now() - lastPongAt > PONG_TIMEOUT_MS) {
        ws.terminate();
        cleanup();
      }
    }, PONG_TIMEOUT_MS);

    function cleanup() {
      clearInterval(pingInterval);
      clearInterval(staleCheck);
      removeWsClient(tunnelId, ws);
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'pong') {
          lastPongAt = Date.now();
        }
      } catch { /* ignore non-JSON */ }
    });

    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });
}
