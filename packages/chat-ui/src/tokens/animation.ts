/**
 * Animation Tokens
 *
 * Easing functions, spring configurations, and animation variants
 * for framer-motion. Canonical source for all animation config.
 *
 * @module chat-ui/tokens/animation
 */

import { type Transition } from 'framer-motion';
import { TIMING } from './timing';

/**
 * Easing curves as cubic-bezier arrays (CSS and framer-motion compatible).
 */
const EASING = {
  /** Standard ease-out for entrances (decelerating) */
  EASE_OUT: [0.0, 0.0, 0.2, 1] as const,
  /** Ease-in for exits (accelerating away) */
  EASE_IN: [0.4, 0.0, 1, 1] as const,
  /** Ease-in-out for state changes */
  EASE_IN_OUT: [0.4, 0.0, 0.2, 1] as const,
  /** Spring-like bounce for attention/delight */
  SPRING: [0.34, 1.56, 0.64, 1] as const,
} as const;

/**
 * Spring configurations for framer-motion.
 */
export const SPRINGS = {
  /** Quick, snappy interactions (buttons, toggles) */
  SNAPPY: {
    type: 'spring',
    mass: 1,
    stiffness: 400,
    damping: 30,
  } as Transition,

  /** Standard UI motion (cards, panels) */
  GENTLE: {
    type: 'spring',
    mass: 1,
    stiffness: 200,
    damping: 26,
  } as Transition,

  /** Slow, smooth transitions (modals, overlays) */
  SLOW: {
    type: 'spring',
    mass: 1,
    stiffness: 100,
    damping: 20,
  } as Transition,

  /** Bouncy attention-grabbing (notifications, badges) */
  BOUNCY: {
    type: 'spring',
    mass: 1,
    stiffness: 300,
    damping: 10,
  } as Transition,

  /** Scroll momentum (iOS-like feel) */
  SCROLL: {
    type: 'spring',
    mass: 1,
    stiffness: 170,
    damping: 26,
  } as Transition,
} as const;

/**
 * Duration-based transitions (for when springs aren't appropriate).
 */
export const TRANSITIONS = {
  /** Quick fade */
  fade: {
    duration: TIMING.FADE / 1000,
    ease: EASING.EASE_OUT,
  } as Transition,

  /** Standard transition */
  standard: {
    duration: TIMING.STANDARD / 1000,
    ease: EASING.EASE_OUT,
  } as Transition,

  /** Complex/slow transition */
  complex: {
    duration: TIMING.COMPLEX / 1000,
    ease: EASING.EASE_IN_OUT,
  } as Transition,

  /** Exit transition (faster) */
  exit: {
    duration: TIMING.FADE_OUT / 1000,
    ease: EASING.EASE_IN,
  } as Transition,

  /** Reduced motion (near-instant) */
  reducedMotion: {
    duration: TIMING.REDUCED_MOTION / 1000,
  } as Transition,
} as const;
