/**
 * StatusIndicator — Small colored dot indicating tool/activity status
 *
 * @ai-context
 * - Six status variants: pending, running, success, error, info, warning
 * - Uses CVA for status-color mapping, framer-motion for pulse animation
 * - Accessible with role="status" and aria-label
 * - data-slot="status-indicator"
 *
 * @example
 * <StatusIndicator status="running" size="md" />
 */

import { memo } from 'react';

import { motion } from 'framer-motion';
import { cva } from 'class-variance-authority';

import { SPRINGS } from '../tokens';

export type StatusType = 'pending' | 'running' | 'success' | 'error' | 'info' | 'warning';

export interface StatusIndicatorProps {
  /** Current status */
  status: StatusType;
  /** Size: sm=6px, md=8px, lg=10px (default: md) */
  size?: 'sm' | 'md' | 'lg';
  /** Custom label for screen readers */
  label?: string;
}

const STATUS_COLORS: Record<StatusType, string> = {
  pending: 'var(--color-status-ai)',
  running: 'var(--color-status-info)',
  success: 'var(--color-status-success)',
  error: 'var(--color-status-error)',
  info: 'var(--color-status-info)',
  warning: 'var(--color-status-warning)',
};

const STATUS_LABELS: Record<StatusType, string> = {
  pending: 'Pending approval',
  running: 'Running',
  success: 'Completed successfully',
  error: 'Failed with error',
  info: 'Information',
  warning: 'Warning',
};

/** CVA variants for status indicator (used for data-attributes, styles are inline via CSS vars) */
const statusIndicatorVariants = cva('shrink-0 rounded-full', {
  variants: {
    size: {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});
export const StatusIndicator = memo(function StatusIndicator({
  status,
  size = 'md',
  label,
}: StatusIndicatorProps) {
  const color = STATUS_COLORS[status];
  const isRunning = status === 'running';

  return (
    <motion.div
      data-slot="status-indicator"
      data-status={status}
      className={statusIndicatorVariants({ size })}
      role="status"
      aria-label={label ?? STATUS_LABELS[status]}
      initial={false}
      animate={{
        backgroundColor: color,
        scale: isRunning ? [1, 1.2, 1] : 1,
      }}
      transition={
        isRunning
          ? {
              scale: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' },
              backgroundColor: SPRINGS.SNAPPY,
            }
          : SPRINGS.SNAPPY
      }
    />
  );
});
