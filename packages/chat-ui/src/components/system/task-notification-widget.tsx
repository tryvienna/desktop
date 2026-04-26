/**
 * TaskNotificationWidget — Compact indicator for background task completion/failure/stop
 *
 * @ai-context
 * - Renders task completed/failed/stopped system events with status icon and summary
 * - Green check for completed, red X for failed, muted stop icon for stopped
 * - data-slot="task-notification-widget"
 *
 * @example
 * <TaskNotificationWidget status="completed" summary="Build finished" />
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { SPRINGS } from '../../tokens';

export interface TaskNotificationWidgetProps {
  status: 'completed' | 'failed' | 'stopped';
  summary: string;
}

export const TaskNotificationWidget = memo(function TaskNotificationWidget({
  status,
  summary,
}: TaskNotificationWidgetProps) {
  return (
    <motion.div
      data-slot="task-notification-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-surface-page border-border-muted"
    >
      {status === 'completed' ? (
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0 text-success"
        >
          <path
            d="M20 6L9 17L4 12"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : status === 'stopped' ? (
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0 text-muted-foreground"
        >
          <rect x="6" y="6" width="12" height="12" rx="1" stroke="currentColor" strokeWidth={2} />
        </svg>
      ) : (
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0 text-error"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} />
          <line
            x1="15"
            y1="9"
            x2="9"
            y2="15"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1="9"
            y1="9"
            x2="15"
            y2="15"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      )}
      <span className="text-xs font-medium text-muted-foreground">{summary}</span>
    </motion.div>
  );
});
