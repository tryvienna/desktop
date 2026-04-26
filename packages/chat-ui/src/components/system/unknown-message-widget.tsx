/**
 * UnknownMessageWidget — Collapsible viewer for unrecognized messages that failed schema validation
 *
 * @ai-context
 * - Renders unrecognized message system events with parse errors and raw payload
 * - Expandable detail section with JSON viewer
 * - Shows up to 5 parse errors with overflow count
 * - data-slot="unknown-message-widget"
 *
 * @example
 * <UnknownMessageWidget rawPayload={{}} parseErrors={[]} timestamp={Date.now()} />
 */

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS } from '../../tokens';

export interface UnknownMessageWidgetProps {
  rawPayload: unknown;
  rawPayloadTruncated?: boolean;
  parseErrors: Array<{ code: string; message: string; path: Array<string | number> }>;
  originalType?: string;
  timestamp: number;
}

const MAX_VISIBLE_ERRORS = 5;

export const UnknownMessageWidget = memo(function UnknownMessageWidget({
  rawPayload,
  rawPayloadTruncated,
  parseErrors,
  originalType,
}: UnknownMessageWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  let payloadJson: string;
  try {
    payloadJson = JSON.stringify(rawPayload, null, 2);
  } catch {
    payloadJson = String(rawPayload);
  }

  const visibleErrors = parseErrors.slice(0, MAX_VISIBLE_ERRORS);
  const hiddenErrorCount = parseErrors.length - visibleErrors.length;

  return (
    <motion.div
      data-slot="unknown-message-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="rounded-lg border border-border-warning bg-surface-warning"
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-left cursor-pointer select-none"
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
        <span className="text-xs font-medium text-warning">Unrecognized message</span>
        {originalType && (
          <code className="text-[10px] px-1.5 py-0.5 rounded bg-surface-interactive text-muted-foreground font-mono">
            type=&quot;{originalType}&quot;
          </code>
        )}
        {rawPayloadTruncated && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-warning text-warning font-medium">
            Truncated
          </span>
        )}
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          className={`flex-shrink-0 ml-auto text-muted-foreground transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {visibleErrors.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Parse errors
                  </span>
                  {visibleErrors.map((err, i) => (
                    <div key={i} className="text-xs text-warning font-mono">
                      <span className="text-muted-foreground">{err.path.join('.')}: </span>
                      {err.message}
                    </div>
                  ))}
                  {hiddenErrorCount > 0 && (
                    <div className="text-xs text-muted-foreground italic">
                      ...and {hiddenErrorCount} more
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Raw payload
                </span>
                <pre className="text-xs font-mono p-2 rounded bg-surface-sunken text-foreground-secondary overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all">
                  {payloadJson}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
