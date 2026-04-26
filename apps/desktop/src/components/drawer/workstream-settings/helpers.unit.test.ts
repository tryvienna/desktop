import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeTime, formatStatusLabel, truncateId } from './helpers';

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for times within 60 seconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T12:00:30Z'));
    expect(formatRelativeTime('2026-03-02T12:00:00Z')).toBe('Just now');
  });

  it('returns minutes ago for times within an hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T12:05:00Z'));
    expect(formatRelativeTime('2026-03-02T12:00:00Z')).toBe('5m ago');
  });

  it('returns hours ago for times within a day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T15:00:00Z'));
    expect(formatRelativeTime('2026-03-02T12:00:00Z')).toBe('3h ago');
  });

  it('returns "Yesterday" for exactly 1 day ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T12:00:00Z'));
    expect(formatRelativeTime('2026-03-01T12:00:00Z')).toBe('Yesterday');
  });

  it('returns days ago for times within 30 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T12:00:00Z'));
    expect(formatRelativeTime('2026-02-25T12:00:00Z')).toBe('5d ago');
  });

  it('returns formatted date for times older than 30 days same year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T12:00:00Z'));
    const result = formatRelativeTime('2026-01-15T12:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });

  it('includes year for times in a different year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T12:00:00Z'));
    const result = formatRelativeTime('2025-12-01T12:00:00Z');
    expect(result).toContain('Dec');
    expect(result).toContain('2025');
  });

  it('accepts numeric timestamps', () => {
    vi.useFakeTimers();
    const now = new Date('2026-03-02T12:00:00Z');
    vi.setSystemTime(now);
    const fiveMinAgo = now.getTime() - 5 * 60 * 1000;
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
  });
});

describe('formatStatusLabel', () => {
  it('formats "active" to "Active"', () => {
    expect(formatStatusLabel('active')).toBe('Active');
  });

  it('formats "processing" to "Processing"', () => {
    expect(formatStatusLabel('processing')).toBe('Processing');
  });

  it('formats "completed_unviewed" to "Completed"', () => {
    expect(formatStatusLabel('completed_unviewed')).toBe('Completed');
  });

  it('formats "waiting_permission" to "Needs Review"', () => {
    expect(formatStatusLabel('waiting_permission')).toBe('Needs Review');
  });

  it('formats "idle" to "Idle"', () => {
    expect(formatStatusLabel('idle')).toBe('Idle');
  });

  it('handles unknown statuses with capitalization', () => {
    expect(formatStatusLabel('some_custom_status')).toBe('Some custom status');
  });
});

describe('truncateId', () => {
  it('returns short IDs unchanged', () => {
    expect(truncateId('abc')).toBe('abc');
  });

  it('truncates long IDs with ellipsis', () => {
    expect(truncateId('abcdefghijklmnop')).toBe('abcdefgh...');
  });

  it('returns IDs at exactly max length unchanged', () => {
    expect(truncateId('12345678')).toBe('12345678');
  });

  it('respects custom max length', () => {
    expect(truncateId('abcdefgh', 4)).toBe('abcd...');
  });
});
