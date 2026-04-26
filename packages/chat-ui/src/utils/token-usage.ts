/**
 * Token Usage Utilities — Pure functions for formatting and computing usage display values
 *
 * @ai-context
 * - formatTokens: formats token counts for compact display (150000 → "150K")
 * - computeUsageDisplay: derives UI-ready values from TokenUsageState
 * - All functions are pure with no side effects — designed for direct unit testing
 *
 * @module chat-ui/utils/token-usage
 */

import type { TokenUsageState } from '../types/messages';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Default context window size when unknown (Claude models) */
export const DEFAULT_CONTEXT_WINDOW = 200_000;

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a token count for compact display.
 *
 * - >= 100K → "150K" (no decimal)
 * - >= 1K   → "1.5K" (one decimal)
 * - < 1K    → "999" (plain integer, no locale formatting)
 * - NaN/negative/Infinity → "0"
 */
export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 100_000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/**
 * Format a USD cost for compact display.
 *
 * - null/0/negative → null (caller should hide)
 * - < $0.01 → "<$0.01"
 * - otherwise → "$X.XX"
 */
export function formatCost(costUsd: number | null | undefined): string | null {
  if (costUsd == null || costUsd <= 0) return null;
  return costUsd < 0.01 ? '<$0.01' : `$${costUsd.toFixed(2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived Display Values
// ─────────────────────────────────────────────────────────────────────────────

export interface UsageDisplayValues {
  /** Total current context utilization (input + cacheRead + cacheCreation) */
  currentContext: number;
  /** Remaining tokens in context window */
  remaining: number;
  /** Fill percentage (0-100), capped at 100 */
  fillPercent: number;
  /** Cache hit percentage (0-100), 0 if no context */
  cachePercent: number;
}

/**
 * Compute derived display values from raw TokenUsageState.
 *
 * - currentContext: sum of latest API call's input + cache tokens
 * - remaining: contextWindow - currentContext (floor at 0)
 * - fillPercent: percentage of context window used (capped at 100)
 * - cachePercent: cache_read / currentContext * 100 (0 if no context)
 */
export function computeUsageDisplay(usage: TokenUsageState): UsageDisplayValues {
  const currentContext =
    usage.currentInputTokens + usage.currentCacheReadTokens + usage.currentCacheCreationTokens;

  const contextWindow = usage.contextWindow ?? DEFAULT_CONTEXT_WINDOW;

  const remaining = Math.max(0, contextWindow - currentContext);
  const fillPercent = contextWindow > 0 ? Math.min(100, (currentContext / contextWindow) * 100) : 0;
  const cachePercent =
    currentContext > 0 ? Math.round((usage.currentCacheReadTokens / currentContext) * 100) : 0;

  return { currentContext, remaining, fillPercent, cachePercent };
}
