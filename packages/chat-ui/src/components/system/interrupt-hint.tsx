/**
 * InterruptHint — Fixed-position hint shown during the double-escape flow
 *
 * @ai-context
 * - Shown when isPendingInterrupt is true (first Escape pressed)
 * - Auto-dismissed by the useDoubleEscapeInterrupt hook after timeout
 * - Fixed at bottom center of the chat area
 * - data-slot="interrupt-hint"
 *
 * @example
 * {showHint && <InterruptHint />}
 */

import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SPRINGS } from '../../tokens';

export interface InterruptHintProps {
  /** Whether the hint is visible. */
  visible: boolean;
}

export const InterruptHint = memo(function InterruptHint({ visible }: InterruptHintProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-slot="interrupt-hint"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={SPRINGS.GENTLE}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-surface-page border-border-muted shadow-lg"
        >
          <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded border border-border-muted bg-surface-secondary text-[10px] font-medium text-muted-foreground">
            Esc
          </kbd>
          <span className="text-xs font-medium text-muted-foreground">
            Press Esc again to interrupt
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
