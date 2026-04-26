/**
 * Deduplication utility for rate-limiting repeated notifications.
 *
 * @ai-context
 * - Pure utility, no external dependencies
 * - Tracks notification keys with timestamps
 * - Suppresses duplicates within a configurable time window
 * - Auto-cleans stale entries when map exceeds 50 items
 */

export interface Deduplicator {
  /** Returns true if the key should fire, false if within the dedup window. */
  shouldNotify(key: string): boolean;
  /** Clear all tracked entries. */
  reset(): void;
}

export function createDeduplicator(windowMs: number): Deduplicator {
  const recent = new Map<string, number>();

  return {
    shouldNotify(key: string): boolean {
      const now = Date.now();
      const lastTime = recent.get(key);

      if (lastTime !== undefined && now - lastTime < windowMs) {
        return false;
      }

      recent.set(key, now);

      // Auto-cleanup when map grows large
      if (recent.size > 50) {
        const cutoff = now - windowMs * 2;
        for (const [k, v] of recent) {
          if (v < cutoff) recent.delete(k);
        }
      }

      return true;
    },

    reset(): void {
      recent.clear();
    },
  };
}
