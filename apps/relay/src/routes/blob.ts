/**
 * Blob routes — upload and serve image attachments through the tunnel.
 *
 * POST /api/tunnel/:tunnelId/blob   — Desktop uploads an image (JSON: { data, mimeType })
 * GET  /api/tunnel/:tunnelId/blob/:blobId — Mobile fetches an image
 */

import { Router } from 'express';
import { verifyDesktopToken, extractBearerToken, safeEqual } from '../auth.js';
import { getTunnel } from '../tunnel-registry.js';
import { putBlob, getBlob } from '../blob-store.js';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

const router = Router();

// Desktop uploads a blob
router.post('/:tunnelId/blob', async (req, res) => {
  const { tunnelId } = req.params;

  const token = extractBearerToken(req.headers.authorization);
  if (!token) { res.status(401).json({ error: 'Missing authorization' }); return; }

  const session = await verifyDesktopToken(token);
  if (!session) { res.status(401).json({ error: 'Invalid session' }); return; }

  const tunnel = getTunnel(tunnelId);
  if (!tunnel || tunnel.userId !== session.userId) {
    res.status(404).json({ error: 'Tunnel not found' });
    return;
  }

  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) {
    res.status(400).json({ error: 'Missing data or mimeType' });
    return;
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ error: 'Unsupported mimeType' });
    return;
  }

  const buffer = Buffer.from(data, 'base64');
  const blobId = putBlob(tunnelId, buffer, mimeType);
  if (!blobId) {
    res.status(413).json({ error: 'Blob too large or storage limit exceeded' });
    return;
  }

  res.json({ blobId });
});

// Mobile fetches a blob
router.get('/:tunnelId/blob/:blobId', (req, res) => {
  const { tunnelId, blobId } = req.params;

  // Authenticate via query param (Image components can't set headers)
  const apiKey = req.query.apiKey as string;
  if (!apiKey) { res.status(401).json({ error: 'Missing apiKey' }); return; }

  const tunnel = getTunnel(tunnelId);
  if (!tunnel || !safeEqual(apiKey, tunnel.apiKey)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const blob = getBlob(blobId, tunnelId);
  if (!blob) {
    res.status(404).json({ error: 'Blob not found' });
    return;
  }

  res.set({
    'Content-Type': blob.mimeType,
    'Content-Length': String(blob.data.length),
    'Content-Disposition': 'attachment',
    'Cache-Control': 'private, max-age=1800',
  });
  res.send(blob.data);
});

export { router as blobRouter };
