/**
 * RateLimitWidget — Amber warning card for rate limit events with countdown timer
 *
 * @ai-context
 * - Renders rate-limit system events with limit type badge and reset countdown
 * - Uses dynamic setTimeout (fires at next display-change boundary, not fixed interval)
 * - Shows overage badge when user is consuming overage capacity
 * - data-slot="rate-limit-widget"
 *
 * @example
 * <RateLimitWidget rateLimitType="five_hour" resetsAt={1709400000} />
 */

import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SPRINGS } from '../../tokens';

export interface RateLimitWidgetProps {
  rateLimitType: string;
  resetsAt: number;
  isUsingOverage?: boolean;
}

function formatLimitType(rateLimitType: string): string {
  switch (rateLimitType) {
    case 'five_hour':
      return '5-hour';
    case 'seven_day':
      return '7-day';
    default:
      return rateLimitType.replace(/_/g, ' ');
  }
}

function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return 'now';
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${secondsRemaining}s`;
}

/** Calculate ms until the displayed countdown text would change. */
function msUntilNextChange(secondsRemaining: number): number {
  if (secondsRemaining <= 0) return 0;
  // Under 60s: update every second
  if (secondsRemaining <= 60) return 1_000;
  // Over 60s: update at the next minute boundary
  const secondsIntoMinute = secondsRemaining % 60;
  return (secondsIntoMinute === 0 ? 60 : secondsIntoMinute) * 1_000;
}

export const RateLimitWidget = memo(function RateLimitWidget({
  rateLimitType,
  resetsAt,
  isUsingOverage,
}: RateLimitWidgetProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    Math.max(0, resetsAt - Math.floor(Date.now() / 1000))
  );

  useEffect(() => {
    const remaining = Math.max(0, resetsAt - Math.floor(Date.now() / 1000));
    setSecondsRemaining(remaining);
    if (remaining <= 0) return;

    let timer: ReturnType<typeof setTimeout>;
    function scheduleUpdate() {
      const now = Math.max(0, resetsAt - Math.floor(Date.now() / 1000));
      setSecondsRemaining(now);
      if (now <= 0) return;
      timer = setTimeout(scheduleUpdate, msUntilNextChange(now));
    }
    timer = setTimeout(scheduleUpdate, msUntilNextChange(remaining));
    return () => clearTimeout(timer);
  }, [resetsAt]);

  return (
    <motion.div
      data-slot="rate-limit-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-surface-page border-warning/30"
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        className="flex-shrink-0 text-warning"
      >
        <path
          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-xs font-medium text-warning">Usage limit reached</span>
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/10 text-warning/80">
        {formatLimitType(rateLimitType)}
      </span>
      {isUsingOverage && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/15 text-warning/90">
          using overage
        </span>
      )}
      <span className="text-xs text-muted-foreground">
        {secondsRemaining > 0
          ? <>resets in {formatCountdown(secondsRemaining)}</>
          : 'resetting\u2026'}
      </span>
    </motion.div>
  );
});
