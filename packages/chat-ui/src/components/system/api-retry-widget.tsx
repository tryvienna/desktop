/**
 * ApiRetryWidget — Amber status bar for transient API retry events
 *
 * @ai-context
 * - Renders api_retry system events showing retry attempt progress
 * - Updates in-place as subsequent retry events arrive (store replaces content block)
 * - Shows attempt counter, error status badge, and delay info
 * - Visually similar to RateLimitWidget but for transient 529/overloaded errors
 * - data-slot="api-retry-widget"
 *
 * @example
 * <ApiRetryWidget attempt={2} maxRetries={10} retryDelayMs={1024} errorStatus={529} error="rate_limit" />
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { SPRINGS } from '../../tokens';

export interface ApiRetryWidgetProps {
  attempt: number;
  maxRetries: number;
  retryDelayMs: number;
  errorStatus: number;
  error: string;
}

function formatDelay(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatError(error: string): string {
  return error.replace(/_/g, ' ');
}

export const ApiRetryWidget = memo(function ApiRetryWidget({
  attempt,
  maxRetries,
  retryDelayMs,
  errorStatus,
  error,
}: ApiRetryWidgetProps) {
  return (
    <motion.div
      data-slot="api-retry-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-surface-page border-warning/30"
    >
      {/* Pulsing dot to indicate active retry */}
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning/60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
      </span>
      <span className="text-xs font-medium text-warning">Retrying API call</span>
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/10 text-warning/80">
        {attempt}/{maxRetries}
      </span>
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/10 text-warning/80">
        {errorStatus}
      </span>
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">
        {formatError(error)}
      </span>
      <span className="text-xs text-muted-foreground">
        next retry in {formatDelay(retryDelayMs)}
      </span>
    </motion.div>
  );
});
