/**
 * GET /api/tunnel/:tunnelId/probe — Check if a tunnel is still alive.
 *
 * Returns 200 with tunnel status if alive, 404 if not found or expired.
 * Used by the desktop app to check if a previously-registered tunnel
 * can be reconnected to (avoiding re-registration and hitting limits).
 */

import { Router } from 'express';
import { verifyDesktopToken, extractBearerToken } from '../auth.js';
import { getTunnel } from '../tunnel-registry.js';

const router = Router();

router.get('/:tunnelId/probe', async (req, res) => {
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

  res.json({
    tunnelId: tunnel.tunnelId,
    alive: true,
    hasSSE: tunnel.sseResponse !== null,
    wsClients: tunnel.wsClients.size,
    createdAt: tunnel.createdAt,
    lastActivityAt: tunnel.lastActivityAt,
  });
});

export { router as probeRouter };
