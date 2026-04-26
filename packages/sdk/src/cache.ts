/**
 * Entity Cache — LRU cache with TTL.
 *
 * Uses Map insertion order for LRU eviction and time-based expiration.
 */

import type { EntityCacheConfig } from './schemas';

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class EntityCache<V> {
  private cache = new Map<string, CacheEntry<V>>();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(config: EntityCacheConfig) {
    this.ttl = config.ttl;
    this.maxSize = config.maxSize ?? 100;
  }

  /** Get a value, returning undefined if expired or missing. */
  get(key: string): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    // Move to end for LRU ordering
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /** Set a value, evicting the oldest entry if at capacity. */
  set(key: string, value: V): void {
    this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttl });
  }

  /** Remove a specific entry. */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /** Remove all expired entries. Returns the number of entries removed. */
  prune(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /** Clear all entries. */
  clear(): void {
    this.cache.clear();
  }

  /** Number of live (non-expired) entries. Prunes expired entries first. */
  get size(): number {
    this.prune();
    return this.cache.size;
  }
}
