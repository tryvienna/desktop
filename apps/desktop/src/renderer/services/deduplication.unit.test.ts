import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDeduplicator } from './deduplication';

describe('createDeduplicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true on first call for a key', () => {
    const dedup = createDeduplicator(2000);
    expect(dedup.shouldNotify('key-a')).toBe(true);
  });

  it('returns false within dedup window', () => {
    const dedup = createDeduplicator(2000);
    dedup.shouldNotify('key-a');
    vi.advanceTimersByTime(500);
    expect(dedup.shouldNotify('key-a')).toBe(false);
  });

  it('returns true after window expires', () => {
    const dedup = createDeduplicator(2000);
    dedup.shouldNotify('key-a');
    vi.advanceTimersByTime(2001);
    expect(dedup.shouldNotify('key-a')).toBe(true);
  });

  it('tracks different keys independently', () => {
    const dedup = createDeduplicator(2000);
    expect(dedup.shouldNotify('key-a')).toBe(true);
    expect(dedup.shouldNotify('key-b')).toBe(true);
    expect(dedup.shouldNotify('key-a')).toBe(false);
    expect(dedup.shouldNotify('key-b')).toBe(false);
  });

  it('reset clears all entries', () => {
    const dedup = createDeduplicator(2000);
    dedup.shouldNotify('key-a');
    dedup.shouldNotify('key-b');
    dedup.reset();
    expect(dedup.shouldNotify('key-a')).toBe(true);
    expect(dedup.shouldNotify('key-b')).toBe(true);
  });
});
