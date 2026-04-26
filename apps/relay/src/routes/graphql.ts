/**
 * POST /api/tunnel/:tunnelId/graphql — Mobile GraphQL request.
 *
 * Mobile sends GraphQL operations here. The relay forwards the request
 * to the connected desktop via SSE and waits for the result.
 */

import { Router } from 'express';
import { getTunnel, submitRequest } from '../tunnel-registry.js';
import { safeEqual } from '../auth.js';
import { createRateLimiter } from '../rate-limit.js';

const rateLimiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 100 });

const router = Router();

// CORS preflight — no Access-Control-Allow-Origin header means browsers
// cannot make cross-origin requests. React Native fetch is unaffected
// (native HTTP client, not subject to CORS). This blocks browser-based
// CSRF attacks against the relay.
// Intentionally omits Access-Control-Allow-Origin to block browser CORS requests
router.options('/:tunnelId/graphql', (_req, res) => {
  res.set({
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Max-Age': '86400',
  });
  res.sendStatus(204);
});

router.post('/:tunnelId/graphql', async (req, res) => {
  const { tunnelId } = req.params;

  const tunnel = getTunnel(tunnelId);
  if (!tunnel) {
    res.status(404).json({ error: 'Tunnel not found' });
    return;
  }

  // Validate API key
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || typeof apiKey !== 'string' || !safeEqual(apiKey, tunnel.apiKey)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Rate limit per tunnel
  const limit = rateLimiter.check(tunnelId);
  if (!limit.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded', retryAfterMs: limit.retryAfterMs });
    return;
  }

  const body = req.body as { query?: string; variables?: Record<string, unknown>; operationName?: string };

  if (!body.query || typeof body.query !== 'string') {
    res.status(400).json({ error: 'Missing required field: query (string)' });
    return;
  }

  // Check desktop is connected
  if (!tunnel.sseResponse) {
    res.status(502).json({ error: 'Desktop not connected' });
    return;
  }

  // Forward to desktop via SSE and wait for response
  try {
    const result = await submitRequest(tunnelId, {
      query: body.query,
      variables: body.variables,
      operationName: body.operationName,
    });

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    if (message === 'Request timeout') {
      res.status(504).json({ error: 'Gateway timeout' });
      return;
    }
    if (message === 'Too many pending requests') {
      res.status(429).json({ error: 'Too many pending requests' });
      return;
    }
    res.status(502).json({ error: message });
  }
});

export { router as graphqlRouter };
