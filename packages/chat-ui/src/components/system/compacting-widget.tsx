/**
 * CompactingWidget — Shows conversation context compression status with animated icons
 *
 * @ai-context
 * - Renders compacting/complete states for context window compression events
 * - Animated compressing/complete icons with token count summary
 * - Supports manual and auto trigger modes
 * - data-slot="compacting-widget"
 *
 * @example
 * <CompactingWidget status="compacting" trigger="auto" preTokens={8000} />
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS, TRANSITIONS } from '../../tokens';

export type CompactingStatus = 'compacting' | 'complete';
export type CompactingTrigger = 'manual' | 'auto';

export interface CompactingWidgetProps {
  status: CompactingStatus;
  trigger?: CompactingTrigger;
  preTokens?: number;
  timestamp?: number;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

function CompressingIcon({ size = 20 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={SPRINGS.SNAPPY}
    >
      <motion.rect
        x="4"
        y="4"
        width="16"
        height="3"
        rx="1"
        fill="currentColor"
        fillOpacity={0.3}
        animate={{ y: [4, 7, 4] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <rect x="4" y="10.5" width="16" height="3" rx="1" fill="currentColor" fillOpacity={0.6} />
      <motion.rect
        x="4"
        y="17"
        width="16"
        height="3"
        rx="1"
        fill="currentColor"
        fillOpacity={0.3}
        animate={{ y: [17, 14, 17] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M12 2v3M12 19v3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M10 4l2-2 2 2M10 20l2 2 2-2"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
}

function CompleteIcon({ size = 20 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={SPRINGS.BOUNCY}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        fill="currentColor"
        fillOpacity={0.15}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...SPRINGS.BOUNCY, delay: 0.1 }}
      />
      <motion.path
        d="M7 12l3 3 7-7"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

export const CompactingWidget = memo(function CompactingWidget({
  status,
  trigger,
  preTokens,
}: CompactingWidgetProps) {
  const isCompacting = status === 'compacting';
  const isComplete = status === 'complete';

  return (
    <motion.div
      data-slot="compacting-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={SPRINGS.GENTLE}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors duration-200 ${
        isCompacting
          ? 'bg-surface-info border-border-info'
          : 'bg-surface-success border-border-success'
      }`}
    >
      <div className={`flex-shrink-0 ${isCompacting ? 'text-info' : 'text-success'}`}>
        <AnimatePresence mode="wait">
          {isCompacting && <CompressingIcon key="compressing" size={16} />}
          {isComplete && <CompleteIcon key="complete" size={16} />}
        </AnimatePresence>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isCompacting ? 'text-info' : 'text-success'}`}>
            {isCompacting ? 'Compacting conversation...' : 'Context compacted'}
          </span>
          {trigger && isComplete && (
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                trigger === 'auto'
                  ? 'bg-surface-warning text-warning'
                  : 'bg-surface-interactive text-muted-foreground'
              }`}
            >
              {trigger === 'auto' ? 'Auto' : 'Manual'}
            </span>
          )}
        </div>
        <AnimatePresence>
          {isComplete && preTokens !== undefined && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={TRANSITIONS.standard}
              className="text-xs text-muted-foreground mt-0.5"
            >
              Summarized {formatTokens(preTokens)} tokens of context
            </motion.div>
          )}
          {isCompacting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSITIONS.fade}
              className="text-xs text-muted-foreground mt-0.5"
            >
              Summarizing older messages to free up space...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isCompacting && (
        <motion.div
          className="flex-shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-4 h-4 border-2 border-border-info border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
    </motion.div>
  );
});
