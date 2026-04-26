/**
 * GET /api/tunnel/:tunnelId/connect — SSE stream for desktop.
 *
 * The desktop connects here to receive GraphQL requests.
 * Requests arrive as SSE events; the desktop processes them
 * and POSTs results back to /api/tunnel/:tunnelId/response.
 */

import { Router } from 'express';
import { verifyDesktopToken, extractBearerToken } from '../auth.js';
import { getTunnel, setSSEResponse } from '../tunnel-registry.js';

const KEEPALIVE_INTERVAL_MS = 30_000;

const router = Router();

router.get('/:tunnelId/connect', async (req, res) => {
  const { tunnelId } = req.params;

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Missing authorization' });
    return;
  }

  const session = await verifyDesktopToken(token);
  if (!session) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const tunnel = getTunnel(tunnelId);
  if (!tunnel || tunnel.userId !== session.userId) {
    res.status(404).json({ error: 'Tunnel not found' });
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Register this response as the SSE channel
  setSSEResponse(tunnelId, res);

  // Send initial connected event
  res.write('event: connected\ndata: {}\n\n');

  // Keepalive pings
  const keepaliveTimer = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepaliveTimer);
    }
  }, KEEPALIVE_INTERVAL_MS);

  // Clean up on disconnect — only clear if this response is still the active one
  // (avoids a reconnection race where the old close handler nulls the new SSE)
  req.on('close', () => {
    clearInterval(keepaliveTimer);
    const tunnel = getTunnel(tunnelId);
    if (tunnel?.sseResponse === res) {
      setSSEResponse(tunnelId, null);
    }
  });
});

export { router as connectRouter };
