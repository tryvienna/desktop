/**
 * In-memory fixed-window rate limiter.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(config: { windowMs: number; maxAttempts: number }) {
  const store = new Map<string, RateLimitEntry>();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 5 * 60 * 1000);
  if (cleanupInterval.unref) cleanupInterval.unref();

  return {
    check(key: string): { allowed: boolean; remaining: number; retryAfterMs: number } {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + config.windowMs });
        return { allowed: true, remaining: config.maxAttempts - 1, retryAfterMs: 0 };
      }

      entry.count++;
      if (entry.count > config.maxAttempts) {
        return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
      }

      return { allowed: true, remaining: config.maxAttempts - entry.count, retryAfterMs: 0 };
    },
  };
}
