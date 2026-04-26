/**
 * Token Usage Utility Tests
 *
 * Tests pure utility functions: formatTokens and computeUsageDisplay.
 * These have no store/context dependencies — just input → output.
 */

import { describe, it, expect } from 'vitest';
import { formatTokens, formatCost, computeUsageDisplay, DEFAULT_CONTEXT_WINDOW } from '../utils/token-usage';
import { fillColor } from '../components/token-usage-bar';
import type { TokenUsageState } from '../types/messages';

// ─── formatTokens ────────────────────────────────────────────────────────

describe('formatTokens', () => {
  it('formats numbers >= 100K without decimals', () => {
    expect(formatTokens(100_000)).toBe('100K');
    expect(formatTokens(150_000)).toBe('150K');
    expect(formatTokens(1_000_000)).toBe('1000K');
  });

  it('formats numbers >= 1K with one decimal', () => {
    expect(formatTokens(1_000)).toBe('1.0K');
    expect(formatTokens(1_500)).toBe('1.5K');
    expect(formatTokens(50_000)).toBe('50.0K');
    expect(formatTokens(99_999)).toBe('100.0K');
  });

  it('formats numbers < 1K as integers', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(1)).toBe('1');
    expect(formatTokens(999)).toBe('999');
  });

  it('returns "0" for NaN', () => {
    expect(formatTokens(NaN)).toBe('0');
  });

  it('returns "0" for negative numbers', () => {
    expect(formatTokens(-1)).toBe('0');
    expect(formatTokens(-1000)).toBe('0');
  });

  it('returns "0" for Infinity', () => {
    expect(formatTokens(Infinity)).toBe('0');
    expect(formatTokens(-Infinity)).toBe('0');
  });
});

// ─── formatCost ──────────────────────────────────────────────────────────

describe('formatCost', () => {
  it('returns null for null/undefined', () => {
    expect(formatCost(null)).toBeNull();
    expect(formatCost(undefined)).toBeNull();
  });

  it('returns null for zero or negative', () => {
    expect(formatCost(0)).toBeNull();
    expect(formatCost(-1)).toBeNull();
  });

  it('returns "<$0.01" for sub-cent costs', () => {
    expect(formatCost(0.005)).toBe('<$0.01');
    expect(formatCost(0.001)).toBe('<$0.01');
  });

  it('formats normal costs as $X.XX', () => {
    expect(formatCost(0.01)).toBe('$0.01');
    expect(formatCost(0.45)).toBe('$0.45');
    expect(formatCost(1.23)).toBe('$1.23');
    expect(formatCost(10)).toBe('$10.00');
  });
});

// ─── computeUsageDisplay ─────────────────────────────────────────────────

describe('computeUsageDisplay', () => {
  function makeUsage(overrides: Partial<TokenUsageState> = {}): TokenUsageState {
    return {
      currentInputTokens: 0,
      currentCacheReadTokens: 0,
      currentCacheCreationTokens: 0,
      outputTokens: 0,
      costUsd: null,
      contextWindow: null,
      ...overrides,
    };
  }

  it('computes currentContext as sum of input + cacheRead + cacheCreation', () => {
    const result = computeUsageDisplay(
      makeUsage({
        currentInputTokens: 10_000,
        currentCacheReadTokens: 40_000,
        currentCacheCreationTokens: 5_000,
      })
    );

    expect(result.currentContext).toBe(55_000);
  });

  it('computes remaining as contextWindow - currentContext (floor at 0)', () => {
    const result = computeUsageDisplay(
      makeUsage({
        currentInputTokens: 50_000,
        contextWindow: 200_000,
      })
    );

    expect(result.remaining).toBe(150_000);
  });

  it('floors remaining at 0 when context exceeds window', () => {
    const result = computeUsageDisplay(
      makeUsage({
        currentInputTokens: 250_000,
        contextWindow: 200_000,
      })
    );

    expect(result.remaining).toBe(0);
  });

  it('computes fillPercent capped at 100', () => {
    const result = computeUsageDisplay(
      makeUsage({
        currentInputTokens: 300_000,
        contextWindow: 200_000,
      })
    );

    expect(result.fillPercent).toBe(100);
  });

  it('computes fillPercent as percentage of window used', () => {
    const result = computeUsageDisplay(
      makeUsage({
        currentInputTokens: 100_000,
        contextWindow: 200_000,
      })
    );

    expect(result.fillPercent).toBe(50);
  });

  it('computes cachePercent as cacheRead / currentContext * 100', () => {
    const result = computeUsageDisplay(
      makeUsage({
        currentInputTokens: 20_000,
        currentCacheReadTokens: 80_000,
        currentCacheCreationTokens: 0,
      })
    );

    // 80000 / 100000 * 100 = 80
    expect(result.cachePercent).toBe(80);
  });

  it('returns cachePercent 0 when currentContext is 0 (no division by zero)', () => {
    const result = computeUsageDisplay(makeUsage());

    expect(result.cachePercent).toBe(0);
  });

  it('uses DEFAULT_CONTEXT_WINDOW when contextWindow is null', () => {
    const result = computeUsageDisplay(
      makeUsage({
        currentInputTokens: DEFAULT_CONTEXT_WINDOW / 2,
        contextWindow: null,
      })
    );

    expect(result.fillPercent).toBe(50);
    expect(result.remaining).toBe(DEFAULT_CONTEXT_WINDOW / 2);
  });

  it('handles all-zero state', () => {
    const result = computeUsageDisplay(makeUsage());

    expect(result.currentContext).toBe(0);
    expect(result.remaining).toBe(DEFAULT_CONTEXT_WINDOW);
    expect(result.fillPercent).toBe(0);
    expect(result.cachePercent).toBe(0);
  });
});

// ─── fillColor ──────────────────────────────────────────────────────────

describe('fillColor', () => {
  function parseHsl(hsl: string) {
    const m = hsl.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (!m) throw new Error(`Bad HSL: ${hsl}`);
    return { h: +m[1], s: +m[2], l: +m[3] };
  }

  it('returns green hue at 0%', () => {
    const { h } = parseHsl(fillColor(0));
    expect(h).toBe(120);
  });

  it('returns yellow-ish hue at 50%', () => {
    const { h } = parseHsl(fillColor(50));
    expect(h).toBe(45);
  });

  it('returns red hue at 80%', () => {
    const { h } = parseHsl(fillColor(80));
    expect(h).toBe(0);
  });

  it('returns deep crimson at 100%', () => {
    const { h, s, l } = parseHsl(fillColor(100));
    expect(h).toBe(350);
    expect(s).toBe(90);
    expect(l).toBe(40);
  });

  it('interpolates smoothly between stops', () => {
    const at25 = parseHsl(fillColor(25));
    const at65 = parseHsl(fillColor(65));
    // 25% should be between green (120) and yellow (45)
    expect(at25.h).toBeGreaterThan(45);
    expect(at25.h).toBeLessThan(120);
    // 65% should be between yellow (45) and red (0)
    expect(at65.h).toBeGreaterThan(0);
    expect(at65.h).toBeLessThan(45);
  });

  it('clamps below 0 and above 100', () => {
    expect(fillColor(-10)).toBe(fillColor(0));
    expect(fillColor(150)).toBe(fillColor(100));
  });
});
