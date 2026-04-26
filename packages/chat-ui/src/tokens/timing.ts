/**
 * Timing Tokens
 *
 * Perceptual thresholds and animation timing based on UX research.
 * Source: Nielsen Norman Group, Doherty Threshold
 *
 * @module chat-ui/tokens/timing
 */

/** Core timing constants in milliseconds */
export const TIMING = {
  // ─── Perceptual Thresholds ──────────────────────────────────────────────────
  /** Feels immediate — no perceived delay */
  INSTANT: 100,
  /** Micro-interactions — quick feedback */
  MICRO: 150,
  /** Standard transitions — comfortable pace */
  STANDARD: 200,
  /** Complex animations — noticeable but not slow */
  COMPLEX: 300,
  /** Maximum wait without feedback before user anxiety */
  MAX_WAIT: 400,

  // ─── Animation Durations ────────────────────────────────────────────────────
  /** Quick fade transitions */
  FADE: 100,
  /** Standard UI transitions */
  TRANSITION: 200,
  /** Slide/reveal animations */
  SLIDE: 250,
  /** Expand/collapse animations */
  EXPAND: 300,

  // ─── Exit Animations (25% faster than entrances) ────────────────────────────
  /** Fast fade out */
  FADE_OUT: 80,
  /** Quick slide out */
  SLIDE_OUT: 150,

  // ─── Typewriter Animation ───────────────────────────────────────────────────
  /** Base delay between words */
  WORD_DELAY_BASE: 50,
  /** Additional delay per character in word */
  WORD_DELAY_PER_CHAR: 4,
  /** Maximum delay for long words */
  WORD_DELAY_MAX: 120,
  /** Pause after sentence-ending punctuation */
  SENTENCE_PAUSE: 80,
  /** Pause after clause punctuation (comma, semicolon) */
  CLAUSE_PAUSE: 30,
  /** Pause after paragraph breaks */
  PARAGRAPH_PAUSE: 150,
  /** Word fade-in duration */
  WORD_FADE: 80,
  /** Cursor blink interval */
  CURSOR_BLINK: 530,

  // ─── Scrolling ──────────────────────────────────────────────────────────────
  /** Scroll event debounce (one frame) */
  SCROLL_DEBOUNCE: 16,
  /** Smooth scroll duration */
  SCROLL_SMOOTH: 200,
  /** Streaming content scroll debounce */
  STREAMING_SCROLL_DEBOUNCE: 32,

  // ─── Accessibility ──────────────────────────────────────────────────────────
  /** Reduced motion duration (near-instant) */
  REDUCED_MOTION: 0.01,
  /** ARIA live region debounce */
  ARIA_LIVE_DEBOUNCE: 500,

  // ─── Cognitive Pacing ───────────────────────────────────────────────────────
  /** Minimum interval between animations */
  ANIMATION_INTERVAL_MIN: 100,
  /** Minimum toast display duration */
  TOAST_MIN_DURATION: 5000,
} as const;

export type TimingKey = keyof typeof TIMING;
