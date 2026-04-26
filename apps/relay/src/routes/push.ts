/**
 * POST /api/tunnel/:tunnelId/push — Desktop push event to mobile.
 *
 * The desktop app pushes real-time events (e.g., workstream status changes)
 * to connected mobile clients via the relay's WebSocket broadcast.
 */

import { Router } from 'express';
import { verifyDesktopToken, extractBearerToken } from '../auth.js';
import { getTunnel, broadcastPush } from '../tunnel-registry.js';

const router = Router();

router.post('/:tunnelId/push', async (req, res) => {
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

  const body = req.body as { type?: string; payload?: Record<string, unknown> };

  if (!body.type || typeof body.type !== 'string') {
    res.status(400).json({ error: 'Missing required field: type' });
    return;
  }

  if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
    res.status(400).json({ error: 'Missing required field: payload' });
    return;
  }

  const result = broadcastPush(tunnelId, body.type, body.payload);
  if (!result) {
    res.status(404).json({ error: 'Tunnel not found' });
    return;
  }

  res.json({ success: true, seq: result.seq, clientCount: result.clientCount });
});

export { router as pushRouter };
