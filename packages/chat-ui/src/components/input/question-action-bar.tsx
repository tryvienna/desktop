/**
 * QuestionActionBar — Multi-step question wizard replacing chat input
 *
 * @ai-context
 * - Replaces the text input when AskUserQuestion tool awaits answers
 * - Same container shape as ChatInput for seamless AnimatePresence morph
 * - Multi-step wizard: single/multi-select options with auto "Other" free-text
 * - Progress bar, slide animations between questions, review screen
 * - Keyboard: number keys select, arrows navigate, Enter confirms
 * - Resets state on toolId change
 * - data-slot="question-action-bar"
 *
 * @example
 * <QuestionActionBar toolId="tool-1" questions={questions} onSubmit={handleSubmit} />
 */

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@tryvienna/ui';
import { SPRINGS, TRANSITIONS } from '../../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AskUserQuestionItem {
  question: string;
  header: string;
  options: Array<{ label: string; description: string }>;
  multiSelect?: boolean;
}

export interface QuestionActionBarProps {
  toolId: string;
  questions: AskUserQuestionItem[];
  onSubmit: (answers: Record<string, string>) => void;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function QuestionBubbleIcon() {
  return (
    <motion.svg width={13} height={13} viewBox="0 0 24 24" fill="none" className="shrink-0">
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
        animate={{ strokeOpacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </motion.svg>
  );
}

function CheckIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Slide animation for question transitions
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? 20 : -20,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? -20 : 20,
    opacity: 0,
  }),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const QuestionActionBar = memo(function QuestionActionBar({
  toolId,
  questions,
  onSubmit,
}: QuestionActionBarProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [otherSelected, setOtherSelected] = useState<Record<string, boolean>>({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [focusedIndex, setFocusedIndex] = useState(-1); // -1 = no focus highlight
  const [reviewFocusedIndex, setReviewFocusedIndex] = useState(-1);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Guards against phantom hover-selects when the bar appears beneath a
  // resting cursor. Only honour hover after the user has genuinely moved.
  const mouseHasMovedRef = useRef(false);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.header] : undefined;
  const hasAnswer = currentAnswer !== undefined && currentAnswer !== '';
  const isLastQuestion = currentIndex === questions.length - 1;
  const isFirstQuestion = currentIndex === 0;

  const isOtherActive = currentQuestion ? !!otherSelected[currentQuestion.header] : false;
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Focus "Other" input when selected
  useEffect(() => {
    if (isOtherActive && otherInputRef.current) {
      otherInputRef.current.focus();
    }
  }, [isOtherActive]);

  // Reset state when toolId changes (new question)
  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setOtherTexts({});
    setOtherSelected({});
    setIsReviewing(false);
    setFocusedIndex(-1);
    setReviewFocusedIndex(-1);
    mouseHasMovedRef.current = false;
  }, [toolId]);

  // Reset focused index and mouse guard when question changes
  useEffect(() => {
    setFocusedIndex(-1);
    mouseHasMovedRef.current = false;
  }, [currentIndex]);

  // -- Option selection --

  const handleSelect = useCallback(
    (label: string) => {
      if (!currentQuestion) return;

      const isOther = label === 'Other';

      if (isOther) {
        setOtherSelected((prev) => {
          const wasSelected = prev[currentQuestion.header];
          if (wasSelected) {
            setAnswers((prev) => {
              const copy = { ...prev };
              delete copy[currentQuestion.header];
              return copy;
            });
          }
          return { ...prev, [currentQuestion.header]: !wasSelected };
        });
        return;
      }

      // Clear "Other" selection when picking a predefined option
      setOtherSelected((prev) => ({ ...prev, [currentQuestion.header]: false }));

      if (currentQuestion.multiSelect) {
        const current = answers[currentQuestion.header] || '';
        const selected = current ? current.split(', ') : [];
        const newSelected = selected.includes(label)
          ? selected.filter((s) => s !== label)
          : [...selected, label];
        setAnswers((prev) => ({
          ...prev,
          [currentQuestion.header]: newSelected.join(', '),
        }));
      } else {
        // Single select -- set and auto-advance
        setAnswers((prev) => ({ ...prev, [currentQuestion.header]: label }));
        setTimeout(() => {
          if (isLastQuestion) {
            setIsReviewing(true);
          } else {
            setDirection('forward');
            setCurrentIndex((i) => i + 1);
          }
        }, 200);
      }
    },
    [currentQuestion, answers, isLastQuestion]
  );

  const handleOtherTextChange = useCallback(
    (text: string) => {
      if (!currentQuestion) return;
      setOtherTexts((prev) => ({ ...prev, [currentQuestion.header]: text }));
      if (text.trim()) {
        setAnswers((prev) => ({ ...prev, [currentQuestion.header]: text.trim() }));
      } else {
        setAnswers((prev) => {
          const copy = { ...prev };
          delete copy[currentQuestion.header];
          return copy;
        });
      }
    },
    [currentQuestion]
  );

  // -- Navigation --

  const goToNext = useCallback(() => {
    if (isLastQuestion) {
      setIsReviewing(true);
    } else {
      setDirection('forward');
      setCurrentIndex((i) => i + 1);
    }
  }, [isLastQuestion]);

  const goToPrevious = useCallback(() => {
    if (!isFirstQuestion) {
      setDirection('backward');
      setCurrentIndex((i) => i - 1);
    }
  }, [isFirstQuestion]);

  const goToQuestion = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 'forward' : 'backward');
      setIsReviewing(false);
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  // -- Submit --

  const handleSubmit = useCallback(() => {
    onSubmit(answers);
  }, [answers, onSubmit]);

  // -- Keyboard shortcuts --

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't intercept when typing in "Other" input (except arrow keys for navigation)
      const isInInput = e.target instanceof HTMLInputElement;
      if (isInInput && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (isReviewing) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setReviewFocusedIndex((prev) => (prev < questions.length - 1 ? prev + 1 : 0));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setReviewFocusedIndex((prev) => (prev <= 0 ? questions.length - 1 : prev - 1));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (reviewFocusedIndex >= 0) {
            goToQuestion(reviewFocusedIndex);
          } else {
            handleSubmit();
          }
          return;
        }
        return;
      }

      if (!currentQuestion) return;

      const totalOptions = currentQuestion.options.length + 1; // +1 for "Other"

      // Arrow up/down -- navigate options
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < totalOptions - 1 ? prev + 1 : 0;
          optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev <= 0 ? totalOptions - 1 : prev - 1;
          optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        return;
      }

      // Enter -- select focused option, or continue for multi-select/Other
      if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < totalOptions) {
          const label =
            focusedIndex < currentQuestion.options.length
              ? currentQuestion.options[focusedIndex].label
              : 'Other';
          handleSelect(label);
        } else if (hasAnswer && (currentQuestion.multiSelect || isOtherActive)) {
          goToNext();
        }
        return;
      }

      // Don't process remaining shortcuts when in an input
      if (isInInput) return;

      const num = parseInt(e.key);

      // Number keys for selection
      if (!isNaN(num) && num >= 1 && num <= totalOptions) {
        e.preventDefault();
        if (num <= currentQuestion.options.length) {
          handleSelect(currentQuestion.options[num - 1].label);
        } else {
          handleSelect('Other');
        }
        return;
      }

      // Left/Right -- question navigation
      if (e.key === 'ArrowLeft' && !isFirstQuestion) {
        e.preventDefault();
        goToPrevious();
        return;
      }
      if (e.key === 'ArrowRight' && hasAnswer && !isLastQuestion) {
        e.preventDefault();
        goToNext();
        return;
      }

      // Backspace -- back navigation
      if (e.key === 'Backspace' && !isFirstQuestion) {
        e.preventDefault();
        goToPrevious();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    isReviewing,
    currentQuestion,
    questions,
    hasAnswer,
    isFirstQuestion,
    isLastQuestion,
    isOtherActive,
    focusedIndex,
    reviewFocusedIndex,
    handleSelect,
    goToNext,
    goToPrevious,
    goToQuestion,
    handleSubmit,
  ]);

  // All predefined options + auto-generated "Other"
  const allOptions = currentQuestion
    ? [...currentQuestion.options, { label: 'Other', description: 'Provide a custom answer' }]
    : [];
  const selectedLabels = currentAnswer ? currentAnswer.split(', ') : [];

  return (
    <div
      data-slot="question-action-bar"
      onMouseMove={() => { mouseHasMovedRef.current = true; }}
      className={cn(
        'flex flex-col',
        'p-3 border border-border-default rounded-xl bg-surface-page',
        'transition-[border-color] duration-150 ease-linear',
        'box-border'
      )}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-surface-sunken rounded-[1px] mb-2 overflow-hidden">
        <motion.div
          className="h-full bg-ai rounded-[1px]"
          initial={{ width: 0 }}
          animate={{ width: isReviewing ? '100%' : `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {isReviewing ? (
        /* -- Review Screen -- */
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-success flex">
              <CheckIcon size={12} />
            </span>
            <span className="text-xs font-medium text-foreground">Review your answers</span>
          </div>

          {/* Answer list */}
          <div className="flex flex-col gap-1 mb-2">
            {questions.map((q, i) => {
              const isRowFocused = reviewFocusedIndex === i;
              return (
                <div
                  key={q.header}
                  onMouseEnter={() => { if (mouseHasMovedRef.current) setReviewFocusedIndex(i); }}
                  onClick={() => goToQuestion(i)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1 rounded-md text-xs cursor-pointer',
                    'transition-colors duration-100 ease-linear',
                    isRowFocused
                      ? 'bg-surface-hover border border-border-default'
                      : 'bg-surface-sunken border border-transparent'
                  )}
                >
                  <span className="font-mono font-medium text-ai uppercase text-[9px] tracking-wide shrink-0">
                    {q.header}
                  </span>
                  <span className="flex-1 text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                    {answers[q.header] || (
                      <span className="text-muted-foreground italic">No answer</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] shrink-0',
                      isRowFocused ? 'text-foreground-secondary' : 'text-muted-foreground'
                    )}
                  >
                    Edit
                  </span>
                </div>
              );
            })}
          </div>

          {/* Submit row */}
          <div className="flex items-center gap-1 h-8">
            <span className="text-[9px] text-disabled">
              &uarr;&darr; select &middot; &crarr; edit
            </span>
            <div className="flex-1" />
            <Pill onClick={handleSubmit} kind="primary">
              <Kbd light>&#9166;</Kbd>Send answers
            </Pill>
          </div>
        </div>
      ) : currentQuestion ? (
        /* -- Question Screen -- */
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`q-${currentIndex}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={SPRINGS.SNAPPY}
          >
            {/* Header: icon + badge + counter */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-ai flex shrink-0">
                <QuestionBubbleIcon />
              </span>
              <span className="text-[9px] font-mono font-medium text-ai uppercase tracking-wide">
                {currentQuestion.header}
              </span>
              <div className="flex-1" />
              <span className="text-[10px] text-disabled font-mono">
                {currentIndex + 1}/{questions.length}
              </span>
            </div>

            {/* Question text */}
            <div className="text-sm font-medium text-foreground leading-[1.4] mb-2">
              {currentQuestion.question}
            </div>

            {/* Options */}
            <div className="flex flex-col gap-1">
              {allOptions.map((option, index) => {
                const isOther = option.label === 'Other' && index === allOptions.length - 1;
                const isSelected = isOther ? isOtherActive : selectedLabels.includes(option.label);
                const isFocused = focusedIndex === index;
                const shortcutNum = index + 1;

                return (
                  <motion.button
                    key={option.label}
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    type="button"
                    onClick={() => handleSelect(option.label)}
                    onMouseEnter={() => { if (mouseHasMovedRef.current) setFocusedIndex(index); }}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...SPRINGS.SNAPPY, delay: index * 0.02 }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2',
                      'rounded-lg cursor-pointer text-left outline-none font-inherit',
                      'transition-colors duration-100 ease-linear',
                      isSelected
                        ? 'bg-surface-ai border border-ai'
                        : isFocused
                          ? 'bg-surface-hover border border-border-default'
                          : 'bg-transparent border border-border-muted'
                    )}
                  >
                    {/* Number badge / check */}
                    <span
                      className={cn(
                        'flex items-center justify-center',
                        'w-5 h-5 rounded',
                        'text-[10px] font-mono font-semibold shrink-0',
                        isSelected
                          ? 'bg-ai text-surface-page'
                          : 'bg-surface-interactive text-foreground-secondary'
                      )}
                    >
                      {isSelected ? <CheckIcon size={10} /> : shortcutNum}
                    </span>

                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          'text-xs text-foreground',
                          isSelected ? 'font-medium' : 'font-normal'
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {option.description}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* "Other" text input */}
            <AnimatePresence>
              {isOtherActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ height: SPRINGS.SNAPPY, opacity: TRANSITIONS.fade }}
                  className="overflow-hidden"
                >
                  <input
                    ref={otherInputRef}
                    type="text"
                    value={otherTexts[currentQuestion.header] || ''}
                    onChange={(e) => handleOtherTextChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (otherTexts[currentQuestion.header] || '').trim()) {
                        e.preventDefault();
                        goToNext();
                      }
                    }}
                    placeholder="Type your answer..."
                    className={cn(
                      'w-full mt-2 px-3 py-2',
                      'text-xs font-inherit',
                      'bg-surface-sunken border border-border-muted rounded-lg',
                      'text-foreground outline-none box-border',
                      'transition-[border-color] duration-100 ease-linear',
                      'focus:border-ai'
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom controls row */}
            <div className="flex items-center gap-1 mt-2 h-8">
              {/* Keyboard hints */}
              <span className="text-[9px] text-disabled">
                &uarr;&darr; navigate &middot; 1-{allOptions.length} select
                {currentQuestion.multiSelect && ' \u00B7 Enter continue'}
                {!isFirstQuestion && ' \u00B7 \u2190 prev'}
                {hasAnswer && !isLastQuestion && ' \u00B7 \u2192 next'}
              </span>

              <div className="flex-1" />

              {/* Navigation for multi-select or "Other" */}
              {(currentQuestion.multiSelect || isOtherActive) && (
                <Pill onClick={goToNext} kind={hasAnswer ? 'primary' : 'disabled'}>
                  {isLastQuestion ? 'Review' : 'Continue'}
                </Pill>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      ) : null}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Kbd -- keyboard hint
// ---------------------------------------------------------------------------

function Kbd({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center',
        'w-4 h-4 text-[10px] font-mono font-medium',
        'text-inherit leading-none rounded',
        light ? 'opacity-70 bg-white/25' : 'opacity-50 bg-surface-sunken'
      )}
    >
      {children}
    </kbd>
  );
}

// ---------------------------------------------------------------------------
// Pill -- compact action button (same pattern as PermissionActionBar)
// ---------------------------------------------------------------------------

type PillKind = 'primary' | 'subtle' | 'disabled';

const pillStyles: Record<PillKind, { base: string; hover: string }> = {
  primary: {
    base: 'bg-ai text-white border-transparent',
    hover: 'hover:bg-ai-hover',
  },
  subtle: {
    base: 'bg-transparent text-foreground-secondary border border-border-muted',
    hover: 'hover:bg-surface-hover',
  },
  disabled: {
    base: 'bg-transparent text-disabled border border-border-muted cursor-not-allowed',
    hover: '',
  },
};

function Pill({
  children,
  onClick,
  kind,
}: {
  children: React.ReactNode;
  onClick: () => void;
  kind: PillKind;
}) {
  const s = pillStyles[kind];

  return (
    <motion.button
      type="button"
      onClick={kind !== 'disabled' ? onClick : undefined}
      whileHover={kind !== 'disabled' ? { scale: 1.04 } : undefined}
      whileTap={kind !== 'disabled' ? { scale: 0.96 } : undefined}
      transition={SPRINGS.SNAPPY}
      className={cn(
        'inline-flex items-center gap-1 shrink-0',
        'px-2 py-0.5 h-7',
        'text-xs font-medium font-inherit',
        'rounded-md whitespace-nowrap leading-none',
        'transition-colors duration-100 ease-linear',
        kind !== 'disabled' && 'cursor-pointer',
        s.base,
        s.hover
      )}
    >
      {children}
    </motion.button>
  );
}
