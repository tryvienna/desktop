/**
 * TokenUsageBar — Collapsible context window usage indicator
 *
 * @ai-context
 * - Single-line bar showing context in/out, cache %, remaining capacity, and cost
 * - Thin progress bar with green/amber/red color thresholds (50%, 80%)
 * - When collapsible=true: toggles between a compact icon+cost chip and the full bar
 * - Collapse state persisted to localStorage; defaults to collapsed
 * - Uses framer-motion AnimatePresence with simple opacity fade for expand/collapse
 * - Pure props-based, no context hooks; hidden when no tokens used
 * - Monospace font at 11px
 * - data-slot="token-usage-bar"
 *
 * @example
 * <TokenUsageBar contextSize={50000} maxContext={200000} outputTokens={1200} costUsd={0.45} collapsible />
 */

import { memo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@tryvienna/ui';

import { TRANSITIONS } from '../tokens';
import { formatTokens, formatCost } from '../utils/token-usage';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'vienna:token-usage-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenUsageBarProps {
  /** Current context window utilization in tokens (latest turn's total input) */
  contextSize: number;
  /** Maximum context window size in tokens */
  maxContext: number;
  /** Accumulated output tokens (optional) */
  outputTokens?: number;
  /** Cache hit rate as a percentage 0-100 (optional, from latest turn) */
  cacheHitRate?: number;
  /** Accumulated cost in USD (optional) */
  costUsd?: number | null;
  /** Enable collapse/expand toggle (default: false) */
  collapsible?: boolean;
  /** Additional className */
  className?: string;
}

/** Shared computed values passed to StaticBar / CollapsibleBar */
interface BarComputedProps {
  currentContext: number;
  output: number;
  cachePercent: number;
  remaining: number;
  fillPercent: number;
  costLabel: string | null;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Separator
// ─────────────────────────────────────────────────────────────────────────────

const Dot = memo(function Dot() {
  return (
    <span className="opacity-50" aria-hidden>
      &middot;
    </span>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Fill color — smooth HSL gradient from green → yellow → red → deep red
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps fillPercent (0-100) to a smooth HSL color string.
 *
 *   0%  → green  (hue 120, sat 60%, lum 45%)
 *  50%  → yellow (hue 45,  sat 80%, lum 48%)
 *  80%  → red    (hue 0,   sat 75%, lum 50%)
 * 100%  → deep crimson (hue 350, sat 90%, lum 40%)
 */
export function fillColor(pct: number): string {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  let h: number, s: number, l: number;

  if (t <= 0.5) {
    // green → yellow  (0..0.5 mapped to 0..1)
    const p = t / 0.5;
    h = 120 - p * 75;       // 120 → 45
    s = 60 + p * 20;        // 60% → 80%
    l = 45 + p * 3;         // 45% → 48%
  } else if (t <= 0.8) {
    // yellow → red  (0.5..0.8 mapped to 0..1)
    const p = (t - 0.5) / 0.3;
    h = 45 - p * 45;        // 45 → 0
    s = 80 - p * 5;         // 80% → 75%
    l = 48 + p * 2;         // 48% → 50%
  } else {
    // red → deep crimson  (0.8..1.0 mapped to 0..1)
    const p = (t - 0.8) / 0.2;
    h = 360 - p * 10;       // 0(360) → 350
    s = 75 + p * 15;        // 75% → 90%
    l = 50 - p * 10;        // 50% → 40%
  }

  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared indicator — dot (collapsed) ↔ progress bar (expanded) via layoutId
// ─────────────────────────────────────────────────────────────────────────────

/** Collapsed: small colored circle with radar pulse animation at ≥65% */
const IndicatorDot = memo(function IndicatorDot({ fillPercent }: { fillPercent: number }) {
  const color = fillColor(fillPercent);
  const pulsing = fillPercent >= 65;

  return (
    <span className="relative inline-flex items-center justify-center shrink-0 size-[5px]">
      {pulsing && (
        <>
          <span
            className="absolute inline-flex size-full rounded-full animate-ping"
            style={{ backgroundColor: color, opacity: 0.6 }}
          />
          <span
            className="absolute inline-flex size-full rounded-full animate-ping"
            style={{ backgroundColor: color, opacity: 0.35, animationDelay: '0.5s' }}
          />
        </>
      )}
      <span
        className="inline-block size-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
});

/** Expanded: progress bar */
const IndicatorBar = memo(function IndicatorBar({ fillPercent }: { fillPercent: number }) {
  return (
    <span className="inline-block w-10 h-[3px] rounded-sm overflow-hidden bg-border-muted shrink-0">
      <span
        className="block h-full rounded-sm transition-[width] duration-300 ease-out"
        style={{ width: `${fillPercent}%`, backgroundColor: fillColor(fillPercent) }}
      />
    </span>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared stats segments — used by both StaticBar and CollapsibleBar expanded
// ─────────────────────────────────────────────────────────────────────────────

/** Inline stats: "X in · Y out · Z% cached · $N.NN" */
const StatsSegments = memo(function StatsSegments({
  currentContext,
  output,
  cachePercent,
  costLabel,
}: Pick<BarComputedProps, 'currentContext' | 'output' | 'cachePercent' | 'costLabel'>) {
  return (
    <>
      <span>{formatTokens(currentContext)} in</span>
      <Dot />
      <span>{formatTokens(output)} out</span>

      {cachePercent > 0 && (
        <>
          <Dot />
          <span>{cachePercent}% cached</span>
        </>
      )}

      {costLabel && (
        <>
          <Dot />
          <span>{costLabel}</span>
        </>
      )}
    </>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const TokenUsageBar = memo(function TokenUsageBar({
  contextSize,
  maxContext,
  outputTokens = 0,
  cacheHitRate,
  costUsd,
  collapsible = false,
  className,
}: TokenUsageBarProps) {
  const currentContext = Number.isFinite(contextSize) ? contextSize : 0;
  const output = Number.isFinite(outputTokens) ? outputTokens : 0;

  // Hide when no tokens have been used
  if (currentContext === 0 && output === 0) {
    return null;
  }

  const contextWindow = maxContext > 0 ? maxContext : 200_000;
  const remaining = Math.max(0, contextWindow - currentContext);
  const fillPercent = Math.min(100, (currentContext / contextWindow) * 100);
  const cachePercent =
    cacheHitRate != null && Number.isFinite(cacheHitRate) ? Math.round(cacheHitRate) : 0;
  const costLabel = formatCost(costUsd);

  const computed: BarComputedProps = {
    currentContext,
    output,
    cachePercent,
    remaining,
    fillPercent,
    costLabel,
    className,
  };

  if (!collapsible) {
    return <StaticBar {...computed} />;
  }

  return <CollapsibleBar {...computed} />;
});

// ─────────────────────────────────────────────────────────────────────────────
// Static (non-collapsible) variant — original behavior
// ─────────────────────────────────────────────────────────────────────────────

const StaticBar = memo(function StaticBar({
  currentContext,
  output,
  cachePercent,
  remaining,
  fillPercent,
  costLabel,
  className,
}: BarComputedProps) {
  return (
    <div
      data-slot="token-usage-bar"
      data-token-usage-bar
      className={cn(
        'flex items-center justify-center gap-2',
        'px-4 pt-0.5 pb-1.5',
        'font-mono text-[11px] leading-none text-muted-foreground',
        'select-none opacity-80',
        className
      )}
    >
      <StatsSegments
        currentContext={currentContext}
        output={output}
        cachePercent={cachePercent}
        costLabel={costLabel}
      />

      <Dot />

      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-10 h-[3px] rounded-sm overflow-hidden bg-border-muted">
          <span
            className="block h-full rounded-sm transition-all duration-300 ease-out"
            style={{ width: `${fillPercent}%`, backgroundColor: fillColor(fillPercent) }}
          />
        </span>
        <span>{formatTokens(remaining)} left</span>
      </span>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible variant
// ─────────────────────────────────────────────────────────────────────────────

const CollapsibleBar = memo(function CollapsibleBar({
  currentContext,
  output,
  cachePercent,
  remaining,
  fillPercent,
  costLabel,
  className,
}: BarComputedProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={!collapsed}
      aria-label={collapsed ? 'Expand token usage' : 'Collapse token usage'}
      data-slot="token-usage-bar"
      data-token-usage-bar
      className={cn(
        'flex items-center gap-1.5',
        'pt-0.5 pb-1.5',
        'font-mono text-[11px] leading-none text-muted-foreground',
        'select-none opacity-80',
        'cursor-pointer hover:opacity-100 transition-opacity',
        'bg-transparent border-none outline-none',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {collapsed ? (
          <motion.span
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITIONS.fade}
            className="flex items-center gap-1.5"
          >
            {formatTokens(currentContext)}/{formatTokens(output)}
            <IndicatorDot fillPercent={fillPercent} />
          </motion.span>
        ) : (
          <motion.span
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITIONS.fade}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <StatsSegments
              currentContext={currentContext}
              output={output}
              cachePercent={cachePercent}
              costLabel={costLabel}
            />

            <Dot />
            <span>{formatTokens(remaining)} left</span>
            <IndicatorBar fillPercent={fillPercent} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
});
