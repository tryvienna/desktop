/**
 * PlanSlideView — Presentation-style slide viewer for plan content
 *
 * @ai-context
 * - 16:9 aspect-ratio slide cards with side navigation arrows
 * - Keyboard navigation (arrows, spacebar) + dot indicators
 * - renderMarkdown prop injects custom markdown rendering
 * - data-slot="plan-slide-view"
 *
 * @example
 * <PlanSlideView slides={slides} renderMarkdown={md => <Markdown>{md}</Markdown>} />
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';

import { cn } from '@tryvienna/ui';

import type { PlanSlide } from './split-plan-into-slides';

export interface PlanSlideViewProps {
  /** Slides to display */
  slides: PlanSlide[];
  /** Optional render prop for markdown content (defaults to <pre>) */
  renderMarkdown?: (content: string) => React.ReactNode;
  /** Optional footer actions slot */
  footerActions?: React.ReactNode;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PlanSlideView = memo(function PlanSlideView({
  slides,
  renderMarkdown,
  footerActions,
}: PlanSlideViewProps) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = slides.length;
  const canPrev = current > 0;
  const canNext = current < total - 1;

  // Clamp index when slides change
  useEffect(() => {
    if (total > 0 && current >= total) setCurrent(total - 1);
  }, [total, current]);

  const goToPrev = useCallback(() => {
    if (current > 0) setCurrent((c) => c - 1);
  }, [current]);

  const goToNext = useCallback(() => {
    if (current < total - 1) setCurrent((c) => c + 1);
  }, [current, total]);

  const goToSlide = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      }
    },
    [goToPrev, goToNext]
  );

  // Auto-focus for keyboard nav
  useEffect(() => {
    const id = requestAnimationFrame(() => containerRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-muted-foreground">
        No slides to display
      </div>
    );
  }

  const slide = slides[current]!;
  const isTitleSlide = slide.headingLevel <= 1;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex-1 flex flex-col min-h-0 outline-none bg-surface-sunken"
      data-slot="plan-slide-view"
    >
      {/* Slide area with side arrows */}
      <div className="flex-1 flex items-center min-h-0 px-1 py-3 gap-1">
        {/* Left arrow */}
        <button
          onClick={goToPrev}
          disabled={!canPrev}
          className={cn(
            'shrink-0 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors',
            !canPrev && 'invisible'
          )}
          aria-label="Previous slide"
        >
          <ChevronLeftIcon />
        </button>

        {/* Slide card */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div
            className={cn(
              'w-full max-w-[640px] aspect-video',
              'bg-surface-page rounded-lg border border-border-muted shadow-lg',
              'overflow-auto p-6',
              isTitleSlide && 'flex items-center justify-center text-center'
            )}
          >
            {renderMarkdown ? (
              renderMarkdown(slide.markdown)
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed m-0">
                {slide.markdown}
              </pre>
            )}
          </div>
        </div>

        {/* Right arrow */}
        <button
          onClick={goToNext}
          disabled={!canNext}
          className={cn(
            'shrink-0 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors',
            !canNext && 'invisible'
          )}
          aria-label="Next slide"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Bottom navigation bar */}
      <div className="flex items-center justify-center gap-3 px-3 py-2 border-t border-border-muted bg-surface-page">
        {/* Dot indicators */}
        <div className="flex items-center gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all duration-200',
                i === current ? 'bg-primary scale-125' : 'bg-disabled hover:bg-muted'
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Slide counter */}
        <span className="text-[10px] text-muted-foreground tabular-nums font-medium">
          {current + 1} / {total}
        </span>

        {footerActions}
      </div>
    </div>
  );
});
