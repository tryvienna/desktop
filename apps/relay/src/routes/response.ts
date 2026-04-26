/**
 * POST /api/tunnel/:tunnelId/response — Desktop result callback.
 *
 * After the desktop processes a GraphQL request, it POSTs the result
 * back here. The relay resolves the pending mobile request.
 */

import { Router } from 'express';
import { verifyDesktopToken, extractBearerToken } from '../auth.js';
import { getTunnel, resolveRequest } from '../tunnel-registry.js';

const router = Router();

router.post('/:tunnelId/response', async (req, res) => {
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

  const body = req.body as { requestId?: string; data?: unknown; errors?: unknown[] };

  if (!body.requestId || typeof body.requestId !== 'string') {
    res.status(400).json({ error: 'Missing required field: requestId' });
    return;
  }

  const resolved = resolveRequest(tunnelId, body.requestId, {
    data: body.data,
    errors: body.errors as Array<{ message: string }>,
  });

  if (!resolved) {
    res.status(404).json({ error: 'Request not found or already resolved' });
    return;
  }

  res.json({ success: true });
});

export { router as responseRouter };
