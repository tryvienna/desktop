/**
 * TypewriterText — Word-by-word streaming text animation with fade-in
 *
 * @ai-context
 * - Reveals text progressively via requestAnimationFrame (60fps)
 * - Each word fades in with a subtle upward slide (80ms ease-out)
 * - Variable delays: sentence pauses, clause pauses, paragraph pauses, code fast-track
 * - Respects prefers-reduced-motion automatically
 * - Shows blinking cursor during active streaming
 * - data-slot="typewriter-text"
 *
 * @example
 * <TypewriterText text="Hello world" isStreaming={true} onContentGrow={scrollToBottom} />
 */

import { useState, useEffect, useRef, useMemo, memo } from 'react';

export interface TypewriterTextProps {
  text: string;
  isStreaming?: boolean;
  disabled?: boolean;
  speedMultiplier?: number;
  onContentGrow?: () => void;
  onAnimationComplete?: () => void;
}

interface WordToken {
  content: string;
  endsSentence: boolean;
  endsClause: boolean;
  hasParagraphBreak: boolean;
  isCode: boolean;
}

// ─── Timing constants (matched to drift-v2) ─────────────────────────────

const BASE_WORD_DELAY_MS = 50;
const PER_CHAR_DELAY_MS = 4;
const SENTENCE_PAUSE_MS = 80;
const CLAUSE_PAUSE_MS = 30;
const PARAGRAPH_PAUSE_MS = 150;
const CODE_DELAY_MS = 30;
const MAX_DELAY_MS = 120;
const WORD_FADE_MS = 80;

// ─── Fade-in keyframes (injected once) ──────────────────────────────────

let stylesInjected = false;

function ensureStreamingStyles(): void {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes streamingWordFadeIn {
      from { opacity: 0; transform: translateY(1px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

const WORD_FADE_ANIMATION = `streamingWordFadeIn ${WORD_FADE_MS}ms cubic-bezier(0.0, 0.0, 0.2, 1)`;

// ─── Tokenizer ────────────────────────────────────────────────────────────

function tokenize(text: string): WordToken[] {
  if (!text) return [];

  const tokens: WordToken[] = [];
  const wordRegex = /(\S+)(\s*)/g;
  let match;
  let inCodeBlock = false;

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[1];
    const whitespace = match[2];
    const combined = word + whitespace;

    if (combined.includes('```')) {
      inCodeBlock = !inCodeBlock;
    }

    tokens.push({
      content: combined,
      endsSentence: /[.!?]$/.test(word),
      endsClause: /[,;:]$/.test(word),
      hasParagraphBreak: whitespace.includes('\n\n'),
      isCode: inCodeBlock,
    });
  }

  return tokens;
}

function getDelay(token: WordToken, multiplier: number): number {
  if (token.isCode) return CODE_DELAY_MS / multiplier;

  const charCount = token.content.trim().length;
  let delay = BASE_WORD_DELAY_MS + charCount * PER_CHAR_DELAY_MS;

  if (token.hasParagraphBreak) delay += PARAGRAPH_PAUSE_MS;
  else if (token.endsSentence) delay += SENTENCE_PAUSE_MS;
  else if (token.endsClause) delay += CLAUSE_PAUSE_MS;

  return Math.min(delay, MAX_DELAY_MS) / multiplier;
}

// ─── Component ────────────────────────────────────────────────────────────

export const TypewriterText = memo(function TypewriterText({
  text,
  isStreaming = false,
  disabled = false,
  speedMultiplier = 1,
  onContentGrow,
  onAnimationComplete,
}: TypewriterTextProps) {
  useEffect(() => {
    ensureStreamingStyles();
  }, []);

  const tokens = useMemo(() => tokenize(text), [text]);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const canAnimate = !disabled && !prefersReducedMotion;
  // Fast-forward past any backlog so animation starts near the live edge
  const [visibleCount, setVisibleCount] = useState(() =>
    canAnimate ? Math.max(0, tokens.length - 8) : tokens.length
  );
  const visibleCountRef = useRef(visibleCount);
  visibleCountRef.current = visibleCount;

  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const isCompleteRef = useRef(false);

  const onContentGrowRef = useRef(onContentGrow);
  onContentGrowRef.current = onContentGrow;
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;
  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  // When disabled or reduced motion, show everything
  useEffect(() => {
    if (!canAnimate) {
      setVisibleCount(tokens.length);
    }
  }, [canAnimate, tokens.length]);

  // Animation loop — restarts when tokens.length grows (new streaming content)
  useEffect(() => {
    if (disabled || prefersReducedMotion) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    if (visibleCountRef.current >= tokensRef.current.length) {
      if (!isStreamingRef.current && !isCompleteRef.current) {
        isCompleteRef.current = true;
        onAnimationCompleteRef.current?.();
      }
      return;
    }

    if (isStreaming) {
      isCompleteRef.current = false;
    }

    // Don't start a second loop if one is already running
    if (frameRef.current) return;

    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (document.hidden) {
        lastTimeRef.current = now;
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentTokens = tokensRef.current;
      const currentVisible = visibleCountRef.current;

      if (currentVisible >= currentTokens.length) {
        frameRef.current = null;
        if (!isStreamingRef.current && !isCompleteRef.current) {
          isCompleteRef.current = true;
          onAnimationCompleteRef.current?.();
        }
        return;
      }

      // Batch: reveal as many words as elapsed time allows (catch up after frame drops)
      let elapsed = now - lastTimeRef.current;
      let wordsToReveal = 0;

      while (currentVisible + wordsToReveal < currentTokens.length && wordsToReveal < 10) {
        const delay = getDelay(currentTokens[currentVisible + wordsToReveal], speedRef.current);
        if (elapsed < delay) break;
        elapsed -= delay;
        wordsToReveal++;
      }

      if (wordsToReveal > 0) {
        lastTimeRef.current = now - elapsed; // preserve remainder for precise timing
        setVisibleCount((prev) => prev + wordsToReveal);
        onContentGrowRef.current?.();
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [tokens.length, disabled, prefersReducedMotion, isStreaming]);

  const isRevealing = visibleCount < tokens.length;
  const shouldFade = !prefersReducedMotion && (isRevealing || isStreaming);

  // Only the most recently revealed words need individual animated spans.
  // Older words are "settled" — merge them into a single text node to
  // cut React reconciliation from O(N) to O(1).
  const ANIMATING_WINDOW = 5;
  const settledCount = Math.max(0, visibleCount - ANIMATING_WINDOW);

  let settledText = '';
  for (let i = 0; i < settledCount; i++) {
    settledText += tokens[i].content;
  }
  const animatingTokens = tokens.slice(settledCount, visibleCount);

  return (
    <span
      data-slot="typewriter-text"
      data-typewriter={canAnimate && isRevealing ? 'animating' : 'complete'}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {canAnimate ? (
        <>
          {settledText}
          {animatingTokens.map((token, i) => (
            <span
              key={settledCount + i}
              style={{
                animation: shouldFade ? WORD_FADE_ANIMATION : undefined,
              }}
            >
              {token.content}
            </span>
          ))}
        </>
      ) : (
        text
      )}
      {canAnimate && isStreaming && visibleCount >= tokens.length && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[1em] w-0.5 rounded-[1px] bg-text-ai align-text-bottom"
          style={{ animation: 'streaming-cursor-blink 530ms ease-in-out infinite' }}
        />
      )}
    </span>
  );
});
