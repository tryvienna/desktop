/**
 * VerificationActionWidget — Shows post-verification actions with live status indicator
 *
 * @ai-context
 * - Renders verification action system events with pending/running/done/error states
 * - Animated status indicator (dots, spinner, check, X)
 * - Status is a prop (composition-first pattern, not store-driven)
 * - data-slot="verification-action-widget"
 *
 * @example
 * <VerificationActionWidget actionId="run-tests" actionLabel="Run tests" actionType="builtin" status="running" />
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS } from '../../tokens';

export type ActionExecStatus = 'pending' | 'running' | 'done' | 'error';

export interface VerificationActionWidgetProps {
  actionId: string;
  actionLabel: string;
  actionType: 'builtin' | 'prompt';
  prompt?: string;
  status?: ActionExecStatus;
}

function StatusIndicator({ status }: { status: ActionExecStatus }) {
  return (
    <AnimatePresence mode="wait">
      {status === 'pending' && (
        <motion.div
          key="pending"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex gap-[3px] items-center"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full bg-muted block"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </motion.div>
      )}
      {status === 'running' && (
        <motion.div
          key="running"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center"
        >
          <motion.svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx={12}
              cy={12}
              r={9}
              stroke="var(--text-muted)"
              strokeWidth={2}
              strokeOpacity={0.25}
            />
            <path
              d="M12 3a9 9 0 0 1 9 9"
              stroke="var(--text-warning)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </motion.svg>
        </motion.div>
      )}
      {status === 'done' && (
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={SPRINGS.SNAPPY}
          className="text-success flex"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17L4 12"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      )}
      {status === 'error' && (
        <motion.div
          key="error"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={SPRINGS.SNAPPY}
          className="text-error flex"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const VerificationActionWidget = memo(function VerificationActionWidget({
  actionLabel,
  prompt,
  status = 'pending',
}: VerificationActionWidgetProps) {
  const promptPreview = prompt
    ? prompt.length > 80
      ? prompt.slice(0, 80).trimEnd() + '\u2026'
      : prompt
    : null;

  return (
    <motion.div
      data-slot="verification-action-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="inline-flex items-start gap-2 px-3 py-1.5 rounded-lg border border-border-muted bg-surface-page max-w-[480px] min-w-[220px]"
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        className="flex-shrink-0 mt-0.5 text-warning"
      >
        <path
          d="M13 2L4.5 13H12L11 22L19.5 11H12L13 2Z"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-xs font-medium text-foreground">{actionLabel}</span>
        {promptPreview && (
          <span className="text-[11px] text-muted-foreground leading-[1.4]">{promptPreview}</span>
        )}
      </div>
      <div className="flex-shrink-0 mt-0.5">
        <StatusIndicator status={status} />
      </div>
    </motion.div>
  );
});
