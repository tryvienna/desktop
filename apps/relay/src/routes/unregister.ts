/**
 * DELETE /api/tunnel/:tunnelId — Unregister a tunnel.
 *
 * Desktop calls this when shutting down a tunnel.
 */

import { Router } from 'express';
import { verifyDesktopToken, extractBearerToken } from '../auth.js';
import { unregisterTunnel } from '../tunnel-registry.js';

const router = Router();

router.delete('/:tunnelId', async (req, res) => {
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

  const removed = unregisterTunnel(tunnelId, session.userId);
  if (!removed) {
    res.status(404).json({ error: 'Tunnel not found' });
    return;
  }

  res.json({ success: true });
});

export { router as unregisterRouter };
