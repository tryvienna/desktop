/**
 * In-memory blob store for image attachments.
 *
 * Desktop uploads image data; mobile fetches by blob ID.
 * Blobs auto-expire after a configurable TTL.
 */

import { randomUUID } from 'node:crypto';

interface Blob {
  id: string;
  tunnelId: string;
  data: Buffer;
  mimeType: string;
  expiresAt: number;
}

const BLOB_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_BLOBS_PER_TUNNEL = 100;
const MAX_BLOB_SIZE = 2 * 1024 * 1024; // 2MB per blob
const MAX_TOTAL_BYTES = 500 * 1024 * 1024; // 500MB global budget
const store = new Map<string, Blob>();
let totalBytes = 0;

/** Store a blob and return its ID, or null if size limits are exceeded. */
export function putBlob(tunnelId: string, data: Buffer, mimeType: string): string | null {
  if (data.length > MAX_BLOB_SIZE) return null;

  cleanup();

  // Evict oldest if at per-tunnel limit
  const tunnelBlobs = Array.from(store.values()).filter((b) => b.tunnelId === tunnelId);
  if (tunnelBlobs.length >= MAX_BLOBS_PER_TUNNEL) {
    tunnelBlobs.sort((a, b) => a.expiresAt - b.expiresAt);
    const evicted = tunnelBlobs[0]!;
    totalBytes -= evicted.data.length;
    store.delete(evicted.id);
  }

  if (totalBytes + data.length > MAX_TOTAL_BYTES) return null;

  const id = randomUUID();
  store.set(id, { id, tunnelId, data, mimeType, expiresAt: Date.now() + BLOB_TTL_MS });
  totalBytes += data.length;
  return id;
}

/** Get a blob by ID (returns null if expired or not found). */
export function getBlob(blobId: string, tunnelId: string): { data: Buffer; mimeType: string } | null {
  const blob = store.get(blobId);
  if (!blob || blob.tunnelId !== tunnelId) return null;
  if (Date.now() > blob.expiresAt) {
    totalBytes -= blob.data.length;
    store.delete(blobId);
    return null;
  }
  return { data: blob.data, mimeType: blob.mimeType };
}

/** Remove all blobs for a tunnel. */
export function clearTunnelBlobs(tunnelId: string): void {
  for (const [id, blob] of store) {
    if (blob.tunnelId === tunnelId) {
      totalBytes -= blob.data.length;
      store.delete(id);
    }
  }
}

/** Remove expired blobs. */
function cleanup(): void {
  const now = Date.now();
  for (const [id, blob] of store) {
    if (now > blob.expiresAt) {
      totalBytes -= blob.data.length;
      store.delete(id);
    }
  }
}
