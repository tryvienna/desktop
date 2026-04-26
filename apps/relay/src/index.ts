/**
 * Vienna Relay Server
 *
 * Standalone Express server that relays GraphQL requests between
 * mobile clients and desktop apps via SSE. Designed for deployment
 * on Railway (or any long-running Node.js host).
 *
 * The desktop connects via SSE to receive requests. Mobile sends
 * GraphQL operations via HTTP POST. The relay bridges them.
 */

import 'dotenv/config';
import express from 'express';
import { env } from './env.js';
import { getStats, getAllTunnels, unregisterTunnel } from './tunnel-registry.js';
import { registerRouter } from './routes/register.js';
import { connectRouter } from './routes/connect.js';
import { graphqlRouter } from './routes/graphql.js';
import { responseRouter } from './routes/response.js';
import { unregisterRouter } from './routes/unregister.js';
import { pushRouter } from './routes/push.js';
import { probeRouter } from './routes/probe.js';
import { blobRouter } from './routes/blob.js';
import { setupWebSocket } from './ws.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));

// Security headers
app.use((_req, res, next) => {
  res.set({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  next();
});

// HTTPS enforcement in production — Railway terminates TLS and sets X-Forwarded-Proto
if (!env.isDev) {
  const RELAY_HOST = process.env.RELAY_HOST || 'vienna-relay-production.up.railway.app';
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'http') {
      res.redirect(301, `https://${RELAY_HOST}${req.url}`);
      return;
    }
    next();
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  const stats = getStats();
  res.json({ status: 'ok', timestamp: Date.now(), ...stats });
});

// Tunnel routes
app.use('/api/tunnel/register', registerRouter);
app.use('/api/tunnel', connectRouter);
app.use('/api/tunnel', graphqlRouter);
app.use('/api/tunnel', responseRouter);
app.use('/api/tunnel', unregisterRouter);
app.use('/api/tunnel', pushRouter);
app.use('/api/tunnel', probeRouter);
app.use('/api/tunnel', blobRouter);

const server = app.listen(env.PORT, () => {
  console.log(
    [
      `Vienna Relay Server running on http://localhost:${env.PORT}`,
      `  POST /api/tunnel/register              — register tunnel`,
      `  GET  /api/tunnel/:id/connect           — SSE stream (desktop)`,
      `  POST /api/tunnel/:id/graphql           — GraphQL request (mobile)`,
      `  POST /api/tunnel/:id/response          — result callback (desktop)`,
      `  POST /api/tunnel/:id/push              — push event to mobile`,
      `  GET  /api/tunnel/:id/probe            — check if tunnel is alive`,
      `  POST /api/tunnel/:id/blob              — upload image blob (desktop)`,
      `  GET  /api/tunnel/:id/blob/:blobId      — fetch image blob (mobile)`,
      `  WS   /api/tunnel/:id/ws               — WebSocket (mobile)`,
      `  DELETE /api/tunnel/:id                 — unregister tunnel`,
      `  GET  /api/health                       — health check`,
    ].join('\n'),
  );
});

setupWebSocket(server);

// Graceful shutdown — drain all tunnel connections before closing
function shutdown() {
  // Unregister all tunnels (closes SSE, WS, rejects pending requests, clears blobs)
  for (const { tunnelId, userId } of getAllTunnels()) {
    unregisterTunnel(tunnelId, userId);
  }

  server.close(() => {
    process.exit(0);
  });

  // Force exit after 5 seconds if drain stalls
  setTimeout(() => {
    process.exit(1);
  }, 5_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
