import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityCache } from '../cache';

describe('EntityCache', () => {
  describe('set / get', () => {
    it('stores and retrieves values', () => {
      const cache = new EntityCache<string>({ ttl: 5_000 });
      cache.set('a', 'alpha');
      cache.set('b', 'beta');

      expect(cache.get('a')).toBe('alpha');
      expect(cache.get('b')).toBe('beta');
    });

    it('returns undefined for a missing key', () => {
      const cache = new EntityCache<number>({ ttl: 5_000 });
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('updates an existing key without increasing size', () => {
      const cache = new EntityCache<string>({ ttl: 5_000 });
      cache.set('a', 'first');
      cache.set('b', 'second');
      expect(cache.size).toBe(2);

      cache.set('a', 'updated');
      expect(cache.size).toBe(2);
      expect(cache.get('a')).toBe('updated');
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns the value before expiration', () => {
      const cache = new EntityCache<string>({ ttl: 1_000 });
      cache.set('key', 'value');

      vi.advanceTimersByTime(999);
      expect(cache.get('key')).toBe('value');
    });

    it('returns undefined after expiration', () => {
      const cache = new EntityCache<string>({ ttl: 1_000 });
      cache.set('key', 'value');

      vi.advanceTimersByTime(1_001);
      expect(cache.get('key')).toBeUndefined();
    });
  });

  describe('LRU eviction', () => {
    it('evicts the oldest entry when at capacity', () => {
      const cache = new EntityCache<string>({ ttl: 60_000, maxSize: 2 });
      cache.set('a', 'alpha');
      cache.set('b', 'beta');
      cache.set('c', 'gamma');

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('beta');
      expect(cache.get('c')).toBe('gamma');
      expect(cache.size).toBe(2);
    });

    it('accessing an entry refreshes its position', () => {
      const cache = new EntityCache<string>({ ttl: 60_000, maxSize: 2 });
      cache.set('a', 'alpha');
      cache.set('b', 'beta');

      // Access 'a' so it moves to the end (most recently used)
      cache.get('a');

      // Insert 'c' — 'b' should be evicted as the oldest
      cache.set('c', 'gamma');

      expect(cache.get('a')).toBe('alpha');
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe('gamma');
    });
  });

  describe('invalidate', () => {
    it('removes a specific entry', () => {
      const cache = new EntityCache<string>({ ttl: 5_000 });
      cache.set('a', 'alpha');
      cache.set('b', 'beta');

      cache.invalidate('a');
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('beta');
      expect(cache.size).toBe(1);
    });

    it('is a no-op for a missing key', () => {
      const cache = new EntityCache<string>({ ttl: 5_000 });
      cache.set('a', 'alpha');

      cache.invalidate('nonexistent');
      expect(cache.size).toBe(1);
      expect(cache.get('a')).toBe('alpha');
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      const cache = new EntityCache<string>({ ttl: 5_000 });
      cache.set('a', 'alpha');
      cache.set('b', 'beta');
      cache.set('c', 'gamma');

      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBeUndefined();
    });
  });

  describe('size', () => {
    it('tracks the entry count', () => {
      const cache = new EntityCache<string>({ ttl: 5_000 });
      expect(cache.size).toBe(0);

      cache.set('a', 'alpha');
      expect(cache.size).toBe(1);

      cache.set('b', 'beta');
      expect(cache.size).toBe(2);

      cache.invalidate('a');
      expect(cache.size).toBe(1);

      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('prune', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('removes expired entries and returns the count', () => {
      const cache = new EntityCache<string>({ ttl: 1_000 });
      cache.set('a', 'alpha');
      cache.set('b', 'beta');

      vi.advanceTimersByTime(1_001);
      cache.set('c', 'gamma'); // not expired

      const removed = cache.prune();
      expect(removed).toBe(2);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe('gamma');
    });

    it('returns 0 when nothing is expired', () => {
      const cache = new EntityCache<string>({ ttl: 60_000 });
      cache.set('a', 'alpha');
      expect(cache.prune()).toBe(0);
    });
  });

  describe('size (prunes expired)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('excludes expired entries from the count', () => {
      const cache = new EntityCache<string>({ ttl: 1_000 });
      cache.set('a', 'alpha');
      cache.set('b', 'beta');

      vi.advanceTimersByTime(1_001);
      cache.set('c', 'gamma');

      expect(cache.size).toBe(1); // only 'c' is live
    });
  });

  describe('maxSize=1 edge case', () => {
    it('evicts the single entry when a new one is added', () => {
      const cache = new EntityCache<string>({ ttl: 60_000, maxSize: 1 });
      cache.set('a', 'alpha');
      expect(cache.get('a')).toBe('alpha');

      cache.set('b', 'beta');
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('beta');
      expect(cache.size).toBe(1);
    });
  });

  describe('defaults', () => {
    it('defaults maxSize to 100 when not specified', () => {
      const cache = new EntityCache<number>({ ttl: 5_000 });

      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, i);
      }
      expect(cache.size).toBe(100);

      // Adding the 101st should evict the first
      cache.set('overflow', 999);
      expect(cache.size).toBe(100);
      expect(cache.get('key-0')).toBeUndefined();
      expect(cache.get('overflow')).toBe(999);
    });
  });
});
