/**
 * PreparingIndicator — Animated typing dots shown while waiting for assistant response
 *
 * @ai-context
 * - Three bouncing dots with staggered animation (framer-motion)
 * - Fixed 48px min-height matches PROCESSING_INDICATOR_HEIGHT for smooth spacer transitions
 * - Shown between user message and assistant response during the "preparing" phase
 * - data-slot="preparing-indicator"
 *
 * @example
 * <PreparingIndicator useDots />
 */

import { motion } from 'framer-motion';

import { SPRINGS } from '../tokens';

const PROCESSING_INDICATOR_HEIGHT = '48px';

export interface PreparingIndicatorProps {
  /** Whether to show typing dots (true) or just the container */
  useDots?: boolean;
}

export function PreparingIndicator({ useDots = true }: PreparingIndicatorProps) {
  return (
    <motion.div
      data-slot="preparing-indicator"
      data-processing-indicator
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="flex items-start"
      style={{ minHeight: PROCESSING_INDICATOR_HEIGHT }}
    >
      {useDots && <TypingDots />}
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-3" data-preparing-indicator>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-text-ai"
          animate={{
            y: [0, -4, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export { PROCESSING_INDICATOR_HEIGHT };
