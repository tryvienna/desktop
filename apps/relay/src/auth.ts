/**
 * Desktop session JWT validation — signature-only, no database.
 *
 * In production, verifies the JWT was signed by DESKTOP_JWT_SECRET.
 * Dev auth bypass requires explicit RELAY_ALLOW_DEV_AUTH=true — it is
 * never inferred from NODE_ENV alone to prevent accidental exposure.
 */

import { timingSafeEqual } from 'node:crypto';
import { jwtVerify, decodeJwt } from 'jose';
import { env } from './env.js';

/**
 * Timing-safe string comparison to prevent timing attacks on API keys.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify a desktop session JWT.
 *
 * - Production: full signature + claims verification.
 * - Dev bypass: only when RELAY_ALLOW_DEV_AUTH=true AND no DESKTOP_JWT_SECRET.
 */
export async function verifyDesktopToken(token: string): Promise<{ userId: string } | null> {
  try {
    if (env.RELAY_ALLOW_DEV_AUTH && !env.DESKTOP_JWT_SECRET) {
      // Explicit dev auth bypass: decode JWT without signature verification.
      // Only active when RELAY_ALLOW_DEV_AUTH=true is set explicitly.
      const payload = decodeJwt(token);
      const userId = payload.sub ?? (payload as Record<string, unknown>).userId as string | undefined;
      if (!userId) return null;
      return { userId };
    }

    const secret = new TextEncoder().encode(env.DESKTOP_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'vienna-web',
      audience: 'vienna-desktop',
    });
    const userId = payload.sub ?? (payload as Record<string, unknown>).userId as string | undefined;
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}

/**
 * Extract bearer token from an Authorization header value.
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}
