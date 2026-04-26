/**
 * POST /api/tunnel/register — Register a new relay tunnel.
 *
 * Desktop calls this to create a tunnel entry.
 * Returns tunnelId + apiKey for mobile to use.
 */

import { Router } from 'express';
import { verifyDesktopToken, extractBearerToken } from '../auth.js';
import { registerTunnel } from '../tunnel-registry.js';
import { createRateLimiter } from '../rate-limit.js';

const rateLimiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 10 });

const router = Router();

router.post('/', async (req, res) => {
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

  const limit = rateLimiter.check(session.userId);
  if (!limit.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded', retryAfterMs: limit.retryAfterMs });
    return;
  }

  try {
    const { tunnelId, apiKey } = registerTunnel(session.userId);
    res.json({ tunnelId, apiKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

export { router as registerRouter };
