/**
 * ApiErrorWidget — Error display for Claude API errors with expandable details
 *
 * @ai-context
 * - Renders API error events (status code, error type, raw payload)
 * - Expandable detail section for request ID and raw error text
 * - data-slot="api-error-widget"
 *
 * @example
 * <ApiErrorWidget errorMessage="Rate limited" statusCode={429} rawText="..." />
 */

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS } from '../../tokens';

export interface ApiErrorWidgetProps {
  statusCode?: number;
  errorType?: string;
  errorMessage: string;
  requestId?: string;
  rawText: string;
}

export const ApiErrorWidget = memo(function ApiErrorWidget({
  statusCode,
  errorType,
  errorMessage,
  requestId,
  rawText,
}: ApiErrorWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = requestId || rawText !== errorMessage;

  return (
    <motion.div
      data-slot="api-error-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="rounded-lg border border-border-error bg-surface-error"
    >
      <button
        type="button"
        onClick={() => hasDetails && setExpanded((prev) => !prev)}
        className={`flex items-center gap-2 w-full px-3 py-1.5 text-left select-none ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0 text-error"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} />
          <path
            d="M15 9l-6 6M9 9l6 6"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs font-medium text-error truncate">{errorMessage}</span>
        {statusCode && (
          <code className="text-[10px] px-1.5 py-0.5 rounded bg-surface-error text-error font-mono font-semibold flex-shrink-0">
            {statusCode}
          </code>
        )}
        {errorType && (
          <code className="text-[10px] px-1.5 py-0.5 rounded bg-surface-interactive text-muted-foreground font-mono flex-shrink-0">
            {errorType}
          </code>
        )}
        {hasDetails && (
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
        )}
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
              {requestId && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Request ID
                  </span>
                  <code className="block text-xs font-mono text-foreground-secondary break-all">
                    {requestId}
                  </code>
                </div>
              )}
              {rawText !== errorMessage && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Raw error
                  </span>
                  <pre className="text-xs font-mono p-2 rounded bg-surface-sunken text-foreground-secondary overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all">
                    {rawText}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
