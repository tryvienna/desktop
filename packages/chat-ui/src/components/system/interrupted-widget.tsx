/**
 * InterruptedWidget — Compact indicator when user interrupted agent response
 *
 * @ai-context
 * - Renders a pause-icon system event when the user interrupts a streaming response
 * - No props; stateless display-only widget
 * - data-slot="interrupted-widget"
 *
 * @example
 * <InterruptedWidget />
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { SPRINGS } from '../../tokens';

export const InterruptedWidget = memo(function InterruptedWidget() {
  return (
    <motion.div
      data-slot="interrupted-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-surface-page border-border-muted"
    >
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        className="flex-shrink-0 text-muted-foreground"
      >
        <rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
        <rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
      </svg>
      <span className="text-xs font-medium text-muted-foreground">Response interrupted</span>
    </motion.div>
  );
});
