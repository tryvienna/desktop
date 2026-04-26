/**
 * Animation constants — matches Vienna's Framer Motion spring presets
 */

export const SPRINGS = {
  /** Quick, punchy — status changes, chevron rotation */
  SNAPPY: { type: 'spring' as const, stiffness: 500, damping: 30 },
  /** Smooth, natural — container entrance, content reveal */
  GENTLE: { type: 'spring' as const, stiffness: 200, damping: 20 },
  /** Playful — success/error celebrations */
  BOUNCY: { type: 'spring' as const, stiffness: 400, damping: 15 },
};

export const TRANSITIONS = {
  /** Simple fade in/out */
  fade: { duration: 0.15 },
};

/** Stagger children variant — use with `variants` prop on parent */
export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

/** Fade + slide up for stagger children */
export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: SPRINGS.GENTLE,
  },
};

/** Directional slide variants for AnimatePresence */
export const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};
