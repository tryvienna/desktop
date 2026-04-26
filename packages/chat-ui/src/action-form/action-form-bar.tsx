/**
 * ActionFormBar — Multi-step quick form replacing the chat input
 *
 * @ai-context
 * - Replaces the text input (like QuestionActionBar) via AnimatePresence morph
 * - Renders form steps declaratively from an ActionFormDefinition
 * - Step types: text, select, multi-select, combobox, confirm — each with distinct UI
 * - Select/multi-select steps support hotkey selection (1-9)
 * - Edit pencil icon opens customize overlay to toggle steps on/off
 * - Progress bar, slide animations, review screen, keyboard navigation
 * - Same container shape as ChatInput for seamless transition
 * - data-slot="action-form-bar"
 *
 * @example
 * <ActionFormBar definition={newWorkstreamForm} onSubmit={handleSubmit} onDismiss={handleDismiss} />
 */

import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@tryvienna/ui';
import { SPRINGS, TRANSITIONS } from '../tokens';
import type { ActionFormDefinition, ActionFormOption, TextStep, ConfirmStep, SelectStep, MultiSelectStep, ComboboxStep, DisplayStep } from './define-action-form';
import { useActionFormState } from './use-action-form-state';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionFormBarProps {
  /** The form definition */
  definition: ActionFormDefinition;
  /** Called when the form is submitted */
  onSubmit: (answers: Record<string, string>) => void;
  /** Called when the form is dismissed (Escape) */
  onDismiss: () => void;
  /** Step IDs disabled by user preferences */
  disabledStepIds?: string[];
  /** Called when user modifies step enabled/disabled preferences */
  onPreferencesChange?: (disabledStepIds: string[]) => void;
  /** Called when the user clicks a [?] help icon on a step with helpDocId */
  onHelpClick?: (docId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide animation (matches QuestionActionBar)
// ─────────────────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? 12 : -12,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? -12 : 12,
    opacity: 0,
  }),
};

/** Tighter spring for step transitions — power-user speed */
const STEP_TRANSITION = {
  type: 'spring' as const,
  mass: 0.6,
  stiffness: 600,
  damping: 35,
};

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function FormIcon() {
  return (
    <motion.svg width={13} height={13} viewBox="0 0 24 24" fill="none" className="shrink-0">
      <motion.rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
        animate={{ strokeOpacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M8 10h8M8 14h5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
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

function EditPencilIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function HelpIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Kbd / Pill (reused from QuestionActionBar pattern)
// ─────────────────────────────────────────────────────────────────────────────

function Kbd({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center',
        'w-4 h-4 text-[10px] font-mono font-medium',
        'text-inherit leading-none rounded',
        light ? 'opacity-70 bg-white/25' : 'opacity-50 bg-surface-sunken',
      )}
    >
      {children}
    </kbd>
  );
}

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
  autoFocus,
}: {
  children: React.ReactNode;
  onClick: () => void;
  kind: PillKind;
  autoFocus?: boolean;
}) {
  const s = pillStyles[kind];
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (autoFocus) {
      // Delay slightly so Radix dropdown focus restoration completes first
      const timer = setTimeout(() => btnRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  return (
    <motion.button
      ref={btnRef}
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
        s.hover,
      )}
    >
      {children}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step Renderers
// ─────────────────────────────────────────────────────────────────────────────

function TextStepView({
  step,
  value,
  context: _context,
  onChange,
  onSubmit,
}: {
  step: TextStep;
  value: string;
  context: Record<string, string>;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <input
        data-focus-target
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={step.placeholder ?? `Type your answer...`}
        className={cn(
          'w-full px-3 py-2',
          'text-xs font-inherit',
          'bg-surface-sunken border border-border-muted rounded-lg',
          'text-foreground outline-none box-border',
          'transition-[border-color] duration-100 ease-linear',
          'focus:border-ai',
        )}
      />
    </div>
  );
}

function ComboboxStepView({
  step,
  options,
  loading,
  value,
  recommendedValue: recommendedValueProp,
  onChange,
  onSubmit,
}: {
  step: ComboboxStep;
  options: ActionFormOption[];
  loading: boolean;
  value: string;
  /** Pre-computed recommended default (e.g. sanitized branch name from workstream title) */
  recommendedValue?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Initialize input text to the recommended value so it's visible immediately
  const [inputText, setInputText] = useState(() => recommendedValueProp ?? '');
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  // Track whether the user has manually edited the input text
  const [userHasEdited, setUserHasEdited] = useState(false);
  // Track whether user picked an existing option vs typed freeform
  const isExistingSelection = options.some((o) => o.value === value);

  // ── Dynamic input resolution (resolveOnInput) ────────────────────────────
  const [dynamicOptions, setDynamicOptions] = useState<ActionFormOption[]>([]);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveSeqRef = useRef(0); // ignore stale responses

  useEffect(() => {
    if (!step.resolveOnInput || !inputText.trim()) {
      setDynamicOptions([]);
      return;
    }

    // Debounce 200ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const seq = ++resolveSeqRef.current;
    debounceRef.current = setTimeout(() => {
      setDynamicLoading(true);
      step.resolveOnInput!(inputText).then((results) => {
        // Only apply if this is still the latest request
        if (seq === resolveSeqRef.current) {
          setDynamicOptions(results);
          setDynamicLoading(false);
        }
      }).catch(() => {
        if (seq === resolveSeqRef.current) {
          setDynamicOptions([]);
          setDynamicLoading(false);
        }
      });
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputText, step.resolveOnInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track whether an async onSelectOption is in progress (to disable UI)
  const [selectingAsync, setSelectingAsync] = useState(false);

  // The recommended value is fixed from the prop (computed in parent on step entry)
  const recommendedValue = recommendedValueProp ?? '';
  const isRecommendedFreeform = !!recommendedValue
    && recommendedValue !== step.noneValue
    && !options.some((o) => o.value === recommendedValue);

  // When the default matches an existing option, show it selected in the input.
  // Also handles the case where async options load and reveal the default is an existing branch.
  useEffect(() => {
    if (userHasEdited) return;
    if (isExistingSelection) {
      const opt = options.find((o) => o.value === value);
      setInputText(opt?.label ?? '');
    }
  }, [step.id, isExistingSelection, value]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeholder = step.placeholder ?? 'Type or select...';

  // Merge static + dynamic options, deduplicating by value
  const allOptions = (() => {
    if (dynamicOptions.length === 0) return options;
    const staticValues = new Set(options.map((o) => o.value));
    const merged = [...options];
    for (const opt of dynamicOptions) {
      if (!staticValues.has(opt.value)) merged.push(opt);
    }
    return merged;
  })();

  // Filter options based on input text (case-insensitive)
  // Skip client-side filtering when resolveOnInput is active (server already filtered)
  const noneValue = step.noneValue;
  const filteredOptions = inputText.trim()
    ? step.resolveOnInput
      // When resolveOnInput is active: show all static options that match + all dynamic options
      ? [
          ...options.filter(
            (o) =>
              o.value !== noneValue &&
              o.label.toLowerCase().includes(inputText.toLowerCase()),
          ),
          ...dynamicOptions.filter(
            (o) => !options.some((s) => s.value === o.value),
          ),
        ]
      : allOptions.filter(
          (o) =>
            o.value !== noneValue &&
            o.label.toLowerCase().includes(inputText.toLowerCase()),
        )
    : allOptions.filter((o) => o.value !== noneValue);

  // Build the suggestion list: None → Recommended → filtered branches
  const noneOption = noneValue
    ? allOptions.find((o) => o.value === noneValue) ?? { value: noneValue, label: step.noneLabel ?? 'None' }
    : null;
  const showNone = !!noneOption;

  // Create a synthetic "recommended" option for freeform defaults (new branch names).
  // Only shown when the recommended value doesn't already match an existing option.
  const recommendedOption: ActionFormOption | null = isRecommendedFreeform
    ? { value: recommendedValue, label: recommendedValue, description: 'recommended' }
    : null;
  // Show recommended when input is empty or the recommended value matches the filter
  const showRecommended = !!recommendedOption && (
    !inputText.trim() || recommendedValue.toLowerCase().includes(inputText.toLowerCase())
  );

  const suggestions: ActionFormOption[] = [
    ...(showNone ? [noneOption] : []),
    ...(showRecommended ? [recommendedOption] : []),
    ...filteredOptions,
  ];
  const selectedSuggestionIndex = suggestions.findIndex((s) => s.value === value);

  // Reset focused index when suggestions change
  useEffect(() => {
    setFocusedSuggestionIndex(-1);
  }, [inputText]);

  // Scroll focused suggestion into view (useLayoutEffect to avoid flicker)
  useLayoutEffect(() => {
    if (focusedSuggestionIndex >= 0) {
      suggestionRefs.current[focusedSuggestionIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedSuggestionIndex]);

  const handleSelect = (optionValue: string) => {
    // If onSelectOption is defined, intercept the selection
    if (step.onSelectOption) {
      setSelectingAsync(true);
      step.onSelectOption(optionValue).then((result) => {
        setSelectingAsync(false);
        if (result === null) {
          // Selection cancelled (e.g. user dismissed a file picker) — stay on this step
          inputRef.current?.focus();
          return;
        }
        // Use the transformed value
        onChange(result);
        setInputText(result);
        onSubmit();
      }).catch(() => {
        setSelectingAsync(false);
        inputRef.current?.focus();
      });
      return;
    }

    onChange(optionValue);
    const opt = suggestions.find((o) => o.value === optionValue);
    if (opt && optionValue !== noneValue) {
      setInputText(opt.label);
    } else {
      setInputText('');
    }
    onSubmit();
  };

  const handleInputChange = (text: string) => {
    setUserHasEdited(true);
    setInputText(text);
    // When typing, store the raw text as the value (freeform / new branch)
    onChange(text);
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        data-focus-target
        type="text"
        value={inputText}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedSuggestionIndex((prev) => {
              const start = prev === -1 ? selectedSuggestionIndex : prev;
              return start < suggestions.length - 1 ? start + 1 : 0;
            });
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedSuggestionIndex((prev) => {
              const start = prev === -1 ? selectedSuggestionIndex : prev;
              return start <= 0 ? suggestions.length - 1 : start - 1;
            });
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < suggestions.length) {
              handleSelect(suggestions[focusedSuggestionIndex]!.value);
            } else if (value.trim() || (!inputText.trim() && value)) {
              onSubmit();
            }
            return;
          }
        }}
        placeholder={placeholder}
        className={cn(
          'w-full px-3 py-2',
          'text-xs font-inherit',
          'bg-surface-sunken border border-border-muted rounded-lg',
          'text-foreground outline-none box-border',
          'transition-[border-color] duration-100 ease-linear',
          'focus:border-ai',
        )}
      />

      {/* Suggestion list */}
      {!loading && suggestions.length > 0 && (
        <div className="flex flex-col gap-0.5 h-40 overflow-y-auto">
          {suggestions.map((option, index) => {
            const isSelected = value === option.value;
            const isFocused = focusedSuggestionIndex === index;
            const isNone = option.value === noneValue;
            // When keyboard navigation is active, the focused item takes visual
            // priority. The previously-selected item dims so the user can tell
            // their arrow key actually moved the cursor.
            const isKeyboardNavActive = focusedSuggestionIndex >= 0;
            const showActive = isKeyboardNavActive ? isFocused : isSelected;

            return (
              <motion.button
                key={option.value}
                ref={(el) => { suggestionRefs.current[index] = el; }}
                type="button"
                onClick={() => handleSelect(option.value)}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRINGS.SNAPPY, delay: Math.min(index * 0.01, 0.15) }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5',
                  'rounded-lg cursor-pointer text-left outline-none font-inherit',
                  showActive
                    ? 'bg-surface-ai border border-ai'
                    : (isSelected || isFocused)
                      ? 'bg-surface-hover border border-border-default'
                      : 'bg-transparent border border-transparent',
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center',
                    'w-5 h-5 rounded',
                    'text-[10px] font-mono font-semibold shrink-0',
                    showActive
                      ? 'bg-ai text-surface-page'
                      : 'bg-surface-interactive text-foreground-secondary',
                  )}
                >
                  {showActive ? <CheckIcon size={10} /> : null}
                </span>
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      'text-xs',
                      isNone ? 'text-muted-foreground' : 'text-foreground',
                      showActive ? 'font-medium' : 'font-normal',
                    )}
                  >
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {option.description}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {(loading || dynamicLoading || selectingAsync) && (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3 h-3 rounded-full bg-ai animate-pulse" />
          <span className="text-xs text-muted-foreground">
            {selectingAsync ? 'Opening...' : 'Loading options...'}
          </span>
        </div>
      )}
    </div>
  );
}

function SelectStepView({
  options,
  allOptions,
  loading,
  selectedValue,
  focusedIndex,
  onSelect,
  onFocusChange,
  freeformOption,
  context,
  onFreeformChange,
  onFreeformSubmit,
  multiSelect,
  onCreateOption,
  createPlaceholder,
  onOptionsChange,
  createFilter,
  onCreateFilterChange,
}: {
  /** The options to render (already filtered when a create-filter is active) */
  options: ActionFormOption[];
  /** Full unfiltered options — used for exact-match checking and option creation */
  allOptions?: ActionFormOption[];
  loading: boolean;
  selectedValue: string;
  focusedIndex: number;
  onSelect: (value: string) => void;
  onFocusChange: (index: number) => void;
  freeformOption?: SelectStep['freeformOption'];
  context?: Record<string, string>;
  onFreeformChange?: (value: string) => void;
  onFreeformSubmit?: () => void;
  multiSelect?: boolean;
  onCreateOption?: (text: string) => Promise<ActionFormOption>;
  createPlaceholder?: string;
  onOptionsChange?: (options: ActionFormOption[]) => void;
  /** Current filter text (controlled by parent) */
  createFilter?: string;
  /** Filter text change handler (controlled by parent) */
  onCreateFilterChange?: (filter: string) => void;
}) {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const freeformInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // allOptions defaults to options when not provided (non-filtered mode)
  const effectiveAllOptions = allOptions ?? options;

  // Determine if freeform mode is active: selected value doesn't match any non-freeform option.
  // Includes empty string — freeform with no text typed yet is still freeform mode.
  // The initial "no answer" state uses a known option value (e.g. __none__), not empty string,
  // so empty string reliably indicates freeform was activated.
  const nonFreeformOptions = freeformOption
    ? options.filter((o) => o.value !== freeformOption.optionValue)
    : options;
  const isFreeformActive =
    !!freeformOption &&
    !nonFreeformOptions.some((o) => o.value === selectedValue);

  // Local freeform text — remembers branch name across Yes→No→Yes toggles
  const initialFreeformText = isFreeformActive
    ? selectedValue
    : freeformOption
      ? (typeof freeformOption.defaultText === 'function'
          ? freeformOption.defaultText(context ?? {})
          : (freeformOption.defaultText ?? ''))
      : '';
  const freeformTextRef = useRef<string>(initialFreeformText);
  // Sync freeformTextRef when value arrives from outside (e.g. default applied)
  if (isFreeformActive && selectedValue !== freeformTextRef.current) {
    freeformTextRef.current = selectedValue;
  }

  // Focus freeform input when it becomes visible
  useEffect(() => {
    if (isFreeformActive) {
      freeformInputRef.current?.focus();
    }
  }, [isFreeformActive]);

  // Don't auto-focus the create input — let arrow keys work immediately.
  // The input gets focus naturally when the user clicks it or starts typing.

  // Scroll focused option into view
  useLayoutEffect(() => {
    if (focusedIndex >= 0) {
      optionRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Check if the typed text matches any existing option (checked against full list)
  const filterText = createFilter ?? '';
  const hasExactMatch = filterText
    ? effectiveAllOptions.some((o) => o.label.toLowerCase() === filterText.toLowerCase())
    : true;

  const handleCreateSubmit = useCallback(async () => {
    if (!onCreateOption || !filterText.trim() || hasExactMatch || isCreating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const newOption = await onCreateOption(filterText.trim());
      // Notify parent of new options list
      const updatedOptions = [...effectiveAllOptions, newOption];
      onOptionsChange?.(updatedOptions);
      // Select the new option
      onSelect(newOption.value);
      onCreateFilterChange?.('');
      // Scroll the new option into view after render
      requestAnimationFrame(() => {
        const newIndex = updatedOptions.length - 1;
        optionRefs.current[newIndex]?.scrollIntoView({ block: 'nearest' });
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create option');
    } finally {
      setIsCreating(false);
    }
  }, [onCreateOption, filterText, hasExactMatch, isCreating, effectiveAllOptions, onOptionsChange, onSelect, onCreateFilterChange]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-3 h-3 rounded-full bg-ai animate-pulse" />
        <span className="text-xs text-muted-foreground">Loading options...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 max-h-[240px] overflow-y-auto">
      {/* Search/create input for multi-select with onCreateOption */}
      {multiSelect && onCreateOption && (
        <div className="flex items-center gap-2 mb-1">
          <input
            ref={createInputRef}
            type="text"
            value={filterText}
            onChange={(e) => { onCreateFilterChange?.(e.target.value); setCreateError(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filterText.trim()) {
                e.preventDefault();
                e.stopPropagation();
                if (!hasExactMatch) {
                  void handleCreateSubmit();
                } else {
                  // Select the matching option
                  const match = effectiveAllOptions.find(
                    (o) => o.label.toLowerCase() === filterText.toLowerCase(),
                  );
                  if (match) {
                    onSelect(match.value);
                    onCreateFilterChange?.('');
                  }
                }
              }
              // Arrow keys: blur the input so Space/Enter target the focused option
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                createInputRef.current?.blur();
                return; // propagate to global handler
              }
              // Escape propagates for form dismiss
              if (e.key === 'Escape') return;
              // Enter with no filter text: let it propagate to advance the step
              if (e.key === 'Enter' && !filterText.trim()) {
                createInputRef.current?.blur();
                return;
              }
              // Stop other keys from triggering global shortcuts while typing
              e.stopPropagation();
            }}
            placeholder={createPlaceholder ?? 'Search or create...'}
            className={cn(
              'flex-1 px-3 py-2',
              'text-xs font-inherit',
              'bg-surface-sunken border border-border-muted rounded-lg',
              'text-foreground outline-none box-border',
              'transition-[border-color] duration-100 ease-linear',
              'focus:border-ai',
            )}
          />
          {isCreating && (
            <div className="w-3 h-3 rounded-full bg-ai animate-pulse shrink-0" />
          )}
        </div>
      )}
      {createError && (
        <p className="text-[11px] text-destructive px-1">{createError}</p>
      )}
      {/* "Create" option shown when typed text doesn't match */}
      {multiSelect && onCreateOption && filterText.trim() && !hasExactMatch && (
        <motion.button
          type="button"
          onClick={() => void handleCreateSubmit()}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRINGS.SNAPPY}
          className={cn(
            'flex items-center gap-2 px-3 py-2',
            'rounded-lg cursor-pointer text-left outline-none font-inherit',
            'transition-colors duration-100 ease-linear',
            'bg-surface-hover border border-border-default',
          )}
        >
          <span className="flex items-center justify-center w-5 h-5 rounded bg-surface-interactive text-foreground-secondary text-[10px] font-mono font-semibold shrink-0">
            +
          </span>
          <span className="text-xs text-foreground">
            Create &ldquo;{filterText.trim()}&rdquo;
          </span>
        </motion.button>
      )}
      {options.map((option, index) => {
        const isFreeformTrigger = freeformOption && option.value === freeformOption.optionValue;
        // For the freeform trigger option, highlight based on isFreeformActive.
        // For multi-select, check if value is in the comma-separated list.
        const isSelected = isFreeformTrigger
          ? isFreeformActive
          : multiSelect
            ? selectedValue.split(', ').includes(option.value)
            : selectedValue === option.value;
        const isFocused = focusedIndex === index;
        const shortcutNum = index + 1;

        return (
          <React.Fragment key={option.value}>
            <motion.button
              ref={(el) => { optionRefs.current[index] = el; }}
              type="button"
              onClick={() => {
                if (isFreeformTrigger) {
                  // Restore last freeform text (or default) and don't auto-advance
                  const text = freeformTextRef.current ||
                    (typeof freeformOption!.defaultText === 'function'
                      ? freeformOption!.defaultText(context ?? {})
                      : (freeformOption!.defaultText ?? ''));
                  freeformTextRef.current = text;
                  onFreeformChange?.(text);
                } else {
                  onSelect(option.value);
                }
              }}
              onMouseEnter={() => onFocusChange(index)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRINGS.SNAPPY, delay: index * 0.01 }}
              className={cn(
                'flex items-center gap-2 px-3 py-2',
                'rounded-lg cursor-pointer text-left outline-none font-inherit',
                'transition-colors duration-100 ease-linear',
                isSelected
                  ? 'bg-surface-ai border border-ai'
                  : isFocused
                    ? 'bg-surface-hover border border-border-default'
                    : 'bg-transparent border border-border-muted',
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
                    : 'bg-surface-interactive text-foreground-secondary',
                )}
              >
                {isSelected ? <CheckIcon size={10} /> : shortcutNum <= 9 ? shortcutNum : null}
              </span>

              <div className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  {option.color && (
                    <span
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span
                    className={cn(
                      'text-xs text-foreground',
                      isSelected ? 'font-medium' : 'font-normal',
                    )}
                  >
                    {option.label}
                  </span>
                </span>
                {option.description && (
                  <span className="text-[10px] text-muted-foreground ml-4">
                    {option.description}
                  </span>
                )}
              </div>
            </motion.button>

            {/* Freeform text input — shown inline below the freeform trigger option */}
            {isFreeformTrigger && isFreeformActive && (
              <motion.div
                key="freeform-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={SPRINGS.SNAPPY}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 mt-1">
                  <input
                    ref={freeformInputRef}
                    type="text"
                    value={selectedValue}
                    onChange={(e) => {
                      freeformTextRef.current = e.target.value;
                      onFreeformChange?.(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedValue.trim()) {
                        e.preventDefault();
                        onFreeformSubmit?.();
                      }
                      // Arrow navigation — highlight the adjacent non-freeform option and
                      // release focus so Enter can confirm, consistent with normal select UX.
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const freeformIdx = options.findIndex(
                          (o) => o.value === freeformOption!.optionValue,
                        );
                        const candidates =
                          e.key === 'ArrowUp'
                            ? options.slice(0, freeformIdx).reverse()
                            : options.slice(freeformIdx + 1);
                        const target = candidates.find(
                          (o) => o.value !== freeformOption!.optionValue,
                        );
                        if (target) {
                          onFocusChange(options.indexOf(target));
                          freeformInputRef.current?.blur();
                        }
                      }
                    }}
                    placeholder={freeformOption!.placeholder ?? 'Type a value...'}
                    className={cn(
                      'flex-1 px-3 py-2',
                      'text-xs font-inherit',
                      'bg-surface-sunken border border-border-muted rounded-lg',
                      'text-foreground outline-none box-border',
                      'transition-[border-color] duration-100 ease-linear',
                      'focus:border-ai',
                    )}
                  />
                  {onFreeformSubmit && (
                    <Pill
                      onClick={onFreeformSubmit}
                      kind={selectedValue.trim() ? 'primary' : 'disabled'}
                    >
                      Continue
                    </Pill>
                  )}
                </div>
              </motion.div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ConfirmStepView({
  step,
  value,
  context,
  focusedIndex,
  onSelect,
  onFocusChange,
}: {
  step: ConfirmStep;
  value: string;
  context: Record<string, string>;
  focusedIndex: number;
  onSelect: (value: string) => void;
  onFocusChange: (index: number) => void;
}) {
  const preview = step.previewText?.(context);
  const confirmLabel = step.confirmLabel ?? 'Yes';
  const denyLabel = step.denyLabel ?? 'No';
  const options = [
    { value: 'yes', label: confirmLabel },
    { value: 'no', label: denyLabel },
  ];

  return (
    <div>
      {preview && (
        <div className="text-xs text-muted-foreground mb-2 px-1 font-mono">
          {preview}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {options.map((option, index) => {
          const isSelected = value === option.value;
          const isFocused = focusedIndex === index;

          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              onMouseEnter={() => onFocusChange(index)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRINGS.SNAPPY, delay: index * 0.01 }}
              className={cn(
                'flex items-center gap-2 px-3 py-2',
                'rounded-lg cursor-pointer text-left outline-none font-inherit',
                'transition-colors duration-100 ease-linear',
                isSelected
                  ? 'bg-surface-ai border border-ai'
                  : isFocused
                    ? 'bg-surface-hover border border-border-default'
                    : 'bg-transparent border border-border-muted',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center',
                  'w-5 h-5 rounded',
                  'text-[10px] font-mono font-semibold shrink-0',
                  isSelected
                    ? 'bg-ai text-surface-page'
                    : 'bg-surface-interactive text-foreground-secondary',
                )}
              >
                {isSelected ? <CheckIcon size={10} /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-xs text-foreground',
                  isSelected ? 'font-medium' : 'font-normal',
                )}
              >
                {option.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DisplayStepView
// ─────────────────────────────────────────────────────────────────────────────

function DisplayStepView({
  items,
  loading,
}: {
  items: ActionFormOption[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 px-1">
        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-xs text-muted-foreground px-1 py-2">
        No items
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <motion.div
          key={item.value}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRINGS.SNAPPY, delay: index * 0.02 }}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5',
            'rounded-lg bg-surface-sunken border border-border-muted',
            'text-xs text-foreground',
          )}
        >
          {item.icon && (
            <span className="text-muted-foreground shrink-0">{item.icon}</span>
          )}
          <span className="font-medium">{item.label}</span>
          {item.description && (
            <span className="text-muted-foreground">{item.description}</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Customize Overlay
// ─────────────────────────────────────────────────────────────────────────────

function CustomizeOverlay({
  definition,
  disabledStepIds,
  answers,
  onToggle,
  onClose,
}: {
  definition: ActionFormDefinition;
  disabledStepIds: string[];
  answers: Record<string, string>;
  onToggle: (stepId: string) => void;
  onClose: () => void;
}) {
  const overrides = new Set(disabledStepIds);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={SPRINGS.SNAPPY}
      className="flex flex-col gap-1"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-foreground">Customize steps</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>

      {definition.steps.filter((s) => !s.condition || s.condition(answers)).map((step) => {
        // overrides set acts as toggle from defaultEnabled
        const isOverridden = overrides.has(step.id);
        const isEnabled = step.required || (isOverridden ? !step.defaultEnabled : step.defaultEnabled);
        const isDisabled = !isEnabled;
        const isRequired = step.required;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => !isRequired && onToggle(step.id)}
            disabled={isRequired}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-left',
              'transition-colors duration-100 ease-linear font-inherit',
              isRequired
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer hover:bg-surface-hover',
              isDisabled && !isRequired ? 'opacity-40' : '',
            )}
          >
            {/* Toggle indicator */}
            <span
              className={cn(
                'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center',
                'transition-colors duration-100',
                isDisabled && !isRequired
                  ? 'border-border-muted bg-transparent'
                  : 'border-ai bg-ai',
              )}
            >
              {(!isDisabled || isRequired) && <CheckIcon size={8} />}
            </span>

            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-foreground">{step.header}</span>
              <span className="text-[10px] text-muted-foreground ml-2">{step.question}</span>
            </div>

            {isRequired && (
              <span className="text-[9px] text-muted-foreground font-mono uppercase">Required</span>
            )}
          </button>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const ActionFormBar = memo(function ActionFormBar({
  definition,
  onSubmit,
  onDismiss,
  disabledStepIds: initialDisabledStepIds,
  onPreferencesChange,
  onHelpClick,
}: ActionFormBarProps) {
  const [state, actions] = useActionFormState(definition, onSubmit, initialDisabledStepIds);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [reviewFocusedIndex, setReviewFocusedIndex] = useState(-1);
  // Filter text for multi-select create-input — lifted here so the keyboard
  // handler can navigate over the filtered list, not the full options array.
  const [multiSelectFilter, setMultiSelectFilter] = useState('');
  // Guards against phantom hover-selects when the bar appears beneath a
  // resting cursor. Only honour hover after the user has genuinely moved.
  const mouseHasMovedRef = useRef(false);

  // Guards against double-advance from Enter key-repeat after a text input
  // unmounts during a step transition. When Enter triggers goToNext from an
  // input's onKeyDown, the input unmounts. Key-repeat fires again but now
  // e.target is <body>, not an HTMLInputElement, so the window handler
  // processes it as a new Enter press. We track the step identity at the time
  // Enter was first pressed; if it changes while Enter is still held, we block
  // subsequent Enter keydowns until the physical key is released.
  const enterStepRef = useRef<string | null>(null);

  const {
    activeSteps,
    currentIndex,
    currentStep,
    answers,
    resolvedOptions,
    resolving,
    isReviewing,
    direction,
    progress,
    hasCurrentAnswer,
    isFirstStep,
    isLastStep,
    derivedContext,
    disabledStepIds,
    isCustomizing,
    validationError,
    isValidating,
    isSubmitting,
    submissionError,
  } = state;

  // Compute the recommended value for combobox steps during render (not in
  // an effect) so it's available immediately when ComboboxStepView mounts.
  // Frozen per step via ref so it doesn't shift as the user types.
  const comboboxRecommendedRef = useRef<{ stepId: string; value: string } | null>(null);
  if (currentStep?.type === 'combobox') {
    if (comboboxRecommendedRef.current?.stepId !== currentStep.id) {
      const cStep = currentStep as ComboboxStep;
      const val = typeof cStep.defaultValue === 'function'
        ? cStep.defaultValue(derivedContext)
        : cStep.defaultValue;
      comboboxRecommendedRef.current = {
        stepId: currentStep.id,
        value: val && val !== (cStep.noneValue ?? '') ? val : '',
      };
    }
  } else {
    comboboxRecommendedRef.current = null;
  }

  // Reset focused index, filter, and mouse guard when step changes
  useEffect(() => {
    setFocusedIndex(-1);
    setMultiSelectFilter('');
    mouseHasMovedRef.current = false;
  }, [currentIndex]);

  // Reset focused index when filter text changes (the visible list length changed)
  useEffect(() => {
    setFocusedIndex(-1);
  }, [multiSelectFilter]);

  // Reset review focused index and mouse guard when entering review so Enter always submits by default
  useEffect(() => {
    if (isReviewing) {
      setReviewFocusedIndex(-1);
      mouseHasMovedRef.current = false;
    }
  }, [isReviewing]);

  // Notify parent of preference changes
  useEffect(() => {
    onPreferencesChange?.(disabledStepIds);
  }, [disabledStepIds, onPreferencesChange]);

  // ── Option selection for select steps ─────────────────────────────────────
  const handleSelectOption = useCallback(
    (value: string) => {
      if (!currentStep) return;

      // If this is the freeform trigger on a select step, activate freeform
      // instead of storing the raw option value and auto-advancing.
      if (currentStep.type === 'select') {
        const step = currentStep as SelectStep;
        if (step.freeformOption && value === step.freeformOption.optionValue) {
          const dt = step.freeformOption.defaultText;
          const defaultText = typeof dt === 'function' ? dt(derivedContext) : (dt ?? '');
          // Restore previously typed text if available; otherwise use default.
          // Use resolvedOptions (covers both static and async-resolved options).
          const currentVal = answers[currentStep.id] ?? '';
          const allOptions = resolvedOptions[currentStep.id] ?? step.options ?? [];
          const nonFreeformVals = allOptions
            .filter((o) => o.value !== step.freeformOption!.optionValue)
            .map((o) => o.value);
          const prevText = currentVal !== '' && !nonFreeformVals.includes(currentVal)
            ? currentVal
            : defaultText;
          actions.setAnswer(currentStep.id, prevText);
          return; // Don't auto-advance
        }
      }

      actions.setAnswer(currentStep.id, value);

      // Single-select auto-advances after a brief delay
      if (currentStep.type === 'select' || currentStep.type === 'confirm') {
        setTimeout(() => actions.goToNext(), 80);
      }
    },
    [currentStep, actions, derivedContext, answers, resolvedOptions],
  );

  // ── Freeform change for select steps with freeformOption ──────────────────
  const handleFreeformChange = useCallback(
    (value: string) => {
      if (!currentStep) return;
      actions.setAnswer(currentStep.id, value);
    },
    [currentStep, actions],
  );

  // ── Multi-select toggle ───────────────────────────────────────────────────
  const handleMultiSelectToggle = useCallback(
    (value: string) => {
      if (!currentStep) return;
      const current = answers[currentStep.id] || '';
      const selected = current ? current.split(', ') : [];
      const next = selected.includes(value)
        ? selected.filter((s) => s !== value)
        : [...selected, value];
      actions.setAnswer(currentStep.id, next.join(', '));
    },
    [currentStep, answers, actions],
  );

  // ── Mouse-guarded focus changes ─────────────────────────────────────────
  // Only honour hover-based focus after the user has genuinely moved the mouse.
  const handleHoverFocus = useCallback(
    (index: number) => {
      if (mouseHasMovedRef.current) setFocusedIndex(index);
    },
    [],
  );

  const handleReviewHoverFocus = useCallback(
    (index: number) => {
      if (mouseHasMovedRef.current) setReviewFocusedIndex(index);
    },
    [],
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (isCustomizing) return;

    // Stable step identity for Enter key-hold tracking.
    // Uses currentStep?.id for step screens, '__review__' for review.
    const stepKey = isReviewing ? '__review__' : (currentStep?.id ?? null);

    function onKey(e: KeyboardEvent) {
      const isInInput = e.target instanceof HTMLInputElement;

      // Escape always dismisses
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }

      // Track Enter from inside text inputs so the key-hold guard works
      // even when the input's own onKeyDown triggers goToNext. The input
      // will unmount during the step transition and key-repeat will arrive
      // with e.target === <body>, bypassing the isInInput early-return below.
      if (isInInput && e.key === 'Enter') {
        if (enterStepRef.current === null) {
          enterStepRef.current = stepKey;
        }
      }

      // Let arrow keys through for option navigation. For multi-select steps,
      // also let Enter (advance) and Space (toggle) through from the filter input.
      const isMultiSelect = currentStep?.type === 'multi-select';
      const allowedInInput = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (isMultiSelect) allowedInInput.push('Enter', ' ');
      if (isInInput && !allowedInInput.includes(e.key)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Review screen navigation
      if (isReviewing) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setReviewFocusedIndex((prev) =>
            prev < activeSteps.length - 1 ? prev + 1 : 0,
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setReviewFocusedIndex((prev) =>
            prev <= 0 ? activeSteps.length - 1 : prev - 1,
          );
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (isSubmitting) return; // Block Enter during submission
          if (reviewFocusedIndex >= 0) {
            actions.goToStep(reviewFocusedIndex);
          } else {
            actions.submit();
          }
          return;
        }
        if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
          e.preventDefault();
          actions.goToPrevious();
          return;
        }
        return;
      }

      if (!currentStep) return;

      // Get full options, then compute the filtered (displayed) subset.
      // `focusedIndex` always indexes into `displayOptions`.
      const allOptions: Array<{ value: string; label?: string }> =
        currentStep.type === 'select' || currentStep.type === 'multi-select'
          ? resolvedOptions[currentStep.id] ?? []
          : currentStep.type === 'confirm'
            ? [{ value: 'yes' }, { value: 'no' }]
            : [];
      const displayOptions =
        currentStep.type === 'multi-select' && multiSelectFilter
          ? allOptions.filter((o) =>
              (o.label ?? o.value).toLowerCase().includes(multiSelectFilter.toLowerCase()),
            )
          : allOptions;
      const totalOptions = displayOptions.length;

      // Find the index of the currently selected option in displayOptions,
      // so arrow keys start from the selection rather than the top.
      function findSelectedIndex(): number {
        const answer = answers[currentStep!.id];
        if (!answer) return -1;
        if (currentStep!.type === 'multi-select') {
          // For multi-select, find the last selected item as the anchor
          const selected = answer.split(', ').filter(Boolean);
          for (let i = displayOptions.length - 1; i >= 0; i--) {
            if (selected.includes(displayOptions[i].value)) return i;
          }
          return -1;
        }
        return displayOptions.findIndex((o) => o.value === answer);
      }

      // Arrow up/down — navigate options (indexes into displayOptions)
      // When focus is unset (-1), start relative to the selected option.
      if (e.key === 'ArrowDown' && totalOptions > 0) {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === -1 || prev >= totalOptions) {
            const sel = findSelectedIndex();
            if (sel >= 0) return sel < totalOptions - 1 ? sel + 1 : 0;
            return 0;
          }
          return prev < totalOptions - 1 ? prev + 1 : 0;
        });
        return;
      }
      if (e.key === 'ArrowUp' && totalOptions > 0) {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === -1 || prev >= totalOptions) {
            const sel = findSelectedIndex();
            if (sel >= 0) return sel > 0 ? sel - 1 : totalOptions - 1;
            return totalOptions - 1;
          }
          return prev <= 0 ? totalOptions - 1 : prev - 1;
        });
        return;
      }

      // Space — toggle focused option in multi-select (when not in an input)
      if (e.key === ' ' && !isInInput && currentStep.type === 'multi-select' && totalOptions > 0) {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < totalOptions) {
          handleMultiSelectToggle(displayOptions[focusedIndex].value);
        }
        return;
      }

      // Enter — advance to next step (for multi-select, Space handles toggling)
      if (e.key === 'Enter') {
        // Block Enter key-repeat events that fired after a step transition.
        if (enterStepRef.current !== null && enterStepRef.current !== stepKey) {
          e.preventDefault();
          return;
        }
        enterStepRef.current = stepKey;

        e.preventDefault();
        // Block advancement during async validation
        if (isValidating) return;
        if (currentStep.type === 'text' && hasCurrentAnswer) {
          actions.goToNext();
          return;
        }
        // Multi-select: Enter always advances (Space toggles options)
        if (currentStep.type === 'multi-select') {
          actions.goToNext();
          return;
        }
        // Single-select/confirm: Enter selects the focused option
        if (focusedIndex >= 0 && focusedIndex < totalOptions) {
          const val = displayOptions[focusedIndex].value;
          handleSelectOption(val);
          return;
        }
        if (hasCurrentAnswer) {
          actions.goToNext();
          return;
        }
        return;
      }

      if (isInInput) return;

      // Number keys for selection (1-9) — indexes into displayOptions
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= totalOptions && num <= 9) {
        e.preventDefault();
        const val = displayOptions[num - 1].value;
        if (currentStep.type === 'multi-select') {
          handleMultiSelectToggle(val);
        } else {
          handleSelectOption(val);
        }
        return;
      }

      // Left/Right — step navigation
      if (e.key === 'ArrowLeft' && !isFirstStep) {
        e.preventDefault();
        actions.goToPrevious();
        return;
      }
      if (e.key === 'ArrowRight' && hasCurrentAnswer && !isLastStep) {
        e.preventDefault();
        actions.goToNext();
        return;
      }

      // Backspace — back navigation (only when not filtering)
      if (e.key === 'Backspace') {
        if (multiSelectFilter) {
          // Focus the create input so the user can edit the filter
          const input = formRef.current?.querySelector<HTMLInputElement>('input[type="text"]');
          input?.focus();
          return;
        }
        if (!isFirstStep) {
          e.preventDefault();
          actions.goToPrevious();
        }
        return;
      }

      // Printable characters in multi-select with create-input: focus the input
      // so the user can start typing to filter/create without clicking first.
      if (
        currentStep.type === 'multi-select' &&
        (currentStep as MultiSelectStep).onCreateOption &&
        e.key.length === 1 &&
        !e.metaKey && !e.ctrlKey && !e.altKey
      ) {
        const input = formRef.current?.querySelector<HTMLInputElement>('input[type="text"]');
        if (input) {
          input.focus();
          // Don't preventDefault — let the character be typed into the now-focused input
          return;
        }
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        enterStepRef.current = null;
      }
    }

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    isCustomizing,
    isReviewing,
    currentStep,
    activeSteps,
    hasCurrentAnswer,
    isFirstStep,
    isLastStep,
    focusedIndex,
    reviewFocusedIndex,
    resolvedOptions,
    answers,
    handleSelectOption,
    handleMultiSelectToggle,
    multiSelectFilter,
    actions,
    onDismiss,
  ]);

  // ── Focus management ──────────────────────────────────────────────────────
  // Centralized: focus fires once the step's slide animation settles, so
  // closing menus / dropdowns can't steal it (they finish well within the
  // ~150 ms spring). Works for initial mount AND step-to-step navigation.
  const formRef = useRef<HTMLDivElement>(null);

  const focusStepInput = useCallback(() => {
    const target = formRef.current?.querySelector<HTMLElement>('[data-focus-target]');
    if (target) target.focus();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const skippableStepIds = definition.getSkippableStepIds();
  const hasSkippableSteps = skippableStepIds.length > 0;

  return (
    <div
      ref={formRef}
      data-slot="action-form-bar"
      onMouseMove={() => { mouseHasMovedRef.current = true; }}
      className={cn(
        'flex flex-col',
        'p-3 border border-border-default rounded-xl bg-surface-page',
        'transition-[border-color] duration-150 ease-linear',
        'box-border',
      )}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-surface-sunken rounded-[1px] mb-2 overflow-hidden">
        <motion.div
          className="h-full bg-ai rounded-[1px]"
          initial={{ width: 0 }}
          animate={{ width: isReviewing ? '100%' : `${progress}%` }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {isCustomizing ? (
          /* ── Customize overlay ────────────────────────────────────── */
          <motion.div
            key="customize"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITIONS.fade}
          >
            <CustomizeOverlay
              definition={definition}
              disabledStepIds={disabledStepIds}
              answers={answers}
              onToggle={actions.toggleStep}
              onClose={() => actions.setCustomizing(false)}
            />
          </motion.div>
        ) : isReviewing ? (
          /* ── Review Screen ───────────────────────────────────────── */
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={STEP_TRANSITION}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-success flex">
                <CheckIcon size={12} />
              </span>
              <span className="text-xs font-medium text-foreground">
                Review — {definition.title}
              </span>
              <div className="flex-1" />
              {hasSkippableSteps && (
                <button
                  type="button"
                  onClick={() => actions.setCustomizing(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
                  title="Customize steps"
                >
                  <EditPencilIcon size={11} />
                </button>
              )}
            </div>

            {/* Answer list */}
            <div className="flex flex-col gap-1 mb-2">
              {activeSteps.map((step, i) => {
                const isRowFocused = reviewFocusedIndex === i;
                return (
                  <div
                    key={step.id}
                    onMouseEnter={() => handleReviewHoverFocus(i)}
                    onClick={() => step.type !== 'display' && actions.goToStep(i)}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1 rounded-md text-xs',
                      step.type !== 'display' ? 'cursor-pointer' : 'cursor-default',
                      'transition-colors duration-100 ease-linear',
                      isRowFocused
                        ? 'bg-surface-hover border border-border-default'
                        : 'bg-surface-sunken border border-transparent',
                    )}
                  >
                    <span className="font-mono font-medium text-ai uppercase text-[9px] tracking-wide shrink-0">
                      {step.header}
                    </span>
                    <span className="flex-1 text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                      {(() => {
                        const raw = answers[step.id];
                        if (!raw) return <span className="text-muted-foreground italic">No answer</span>;
                        // Display steps: show item labels
                        if (step.type === 'display') {
                          const opts = resolvedOptions[step.id];
                          return opts?.map((o) => o.label).join(', ') ?? raw;
                        }
                        const opts = resolvedOptions[step.id];
                        const match = opts?.find((o) => o.value === raw);
                        return match?.label ?? raw;
                      })()}
                    </span>
                    {step.type !== 'display' && (
                      <span
                        className={cn(
                          'text-[10px] shrink-0',
                          isRowFocused ? 'text-foreground-secondary' : 'text-muted-foreground',
                        )}
                      >
                        Edit
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submission error */}
            {submissionError && (
              <p className="text-[11px] text-destructive mt-1">{submissionError}</p>
            )}

            {/* Submit row */}
            <div className="flex items-center gap-1 h-8">
              <span className="text-[9px] text-disabled">
                &uarr;&darr; select &middot; &crarr; edit &middot; Esc dismiss
              </span>
              <div className="flex-1" />
              {isSubmitting ? (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-full bg-ai animate-pulse" />
                  Creating...
                </span>
              ) : (
                <Pill onClick={actions.submit} kind="primary">
                  <Kbd light>&#9166;</Kbd>{definition.title}
                </Pill>
              )}
            </div>
          </motion.div>
        ) : currentStep ? (
          /* ── Step Screen ─────────────────────────────────────────── */
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={`step-${currentIndex}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={STEP_TRANSITION}
              onAnimationComplete={(variant) => {
                if (variant === 'center') focusStepInput();
              }}
            >
              {/* Header: icon + badge + counter + edit button */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-ai flex shrink-0">
                  <FormIcon />
                </span>
                <span className="text-[9px] font-mono font-medium text-ai uppercase tracking-wide">
                  {currentStep.header}
                </span>
                <div className="flex-1" />
                {hasSkippableSteps && (
                  <button
                    type="button"
                    onClick={() => actions.setCustomizing(true)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
                    title="Customize steps"
                  >
                    <EditPencilIcon size={11} />
                  </button>
                )}
                <span className="text-[10px] text-disabled font-mono">
                  {currentIndex + 1}/{activeSteps.length}
                </span>
              </div>

              {/* Question text */}
              <div className="text-sm font-medium text-foreground leading-[1.4] mb-2 flex items-center gap-1.5">
                <span>{currentStep.question}</span>
                {currentStep.helpDocId && onHelpClick && (
                  <button
                    type="button"
                    onClick={() => onHelpClick(currentStep.helpDocId!)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 shrink-0"
                    title="Learn more"
                  >
                    <HelpIcon size={14} />
                  </button>
                )}
              </div>

              {/* Step-specific content */}
              {currentStep.type === 'text' && (
                <TextStepView
                  step={currentStep as TextStep}
                  value={answers[currentStep.id] ?? ''}
                  context={derivedContext}
                  onChange={(v) => actions.setAnswer(currentStep.id, v)}
                  onSubmit={actions.goToNext}
                />
              )}

              {currentStep.type === 'combobox' && (
                <ComboboxStepView
                  step={currentStep as ComboboxStep}
                  options={resolvedOptions[currentStep.id] ?? []}
                  loading={!!resolving[currentStep.id]}
                  value={answers[currentStep.id] ?? ''}
                  recommendedValue={comboboxRecommendedRef.current?.value}
                  onChange={(v) => actions.setAnswer(currentStep.id, v)}
                  onSubmit={actions.goToNext}
                />
              )}

              {currentStep.type === 'select' && (
                <SelectStepView
                  options={resolvedOptions[currentStep.id] ?? []}
                  loading={!!resolving[currentStep.id]}
                  selectedValue={answers[currentStep.id] ?? ''}
                  focusedIndex={focusedIndex}
                  onSelect={handleSelectOption}
                  onFocusChange={handleHoverFocus}
                  freeformOption={(currentStep as SelectStep).freeformOption}
                  context={derivedContext}
                  onFreeformChange={handleFreeformChange}
                  onFreeformSubmit={actions.goToNext}
                />
              )}

              {currentStep.type === 'multi-select' && (() => {
                const fullOpts = resolvedOptions[currentStep.id] ?? [];
                const hasCreate = !!(currentStep as MultiSelectStep).onCreateOption;
                const displayOpts = hasCreate && multiSelectFilter
                  ? fullOpts.filter((o) =>
                      o.label.toLowerCase().includes(multiSelectFilter.toLowerCase()),
                    )
                  : fullOpts;
                return (
                  <SelectStepView
                    options={displayOpts}
                    allOptions={fullOpts}
                    loading={!!resolving[currentStep.id]}
                    selectedValue={answers[currentStep.id] ?? ''}
                    focusedIndex={focusedIndex}
                    onSelect={handleMultiSelectToggle}
                    onFocusChange={handleHoverFocus}
                    multiSelect
                    onCreateOption={(currentStep as MultiSelectStep).onCreateOption}
                    createPlaceholder={(currentStep as MultiSelectStep).placeholder}
                    onOptionsChange={(opts) => actions.updateResolvedOptions(currentStep.id, opts)}
                    createFilter={multiSelectFilter}
                    onCreateFilterChange={setMultiSelectFilter}
                  />
                );
              })()}

              {currentStep.type === 'confirm' && (
                <ConfirmStepView
                  step={currentStep as ConfirmStep}
                  value={answers[currentStep.id] ?? ''}
                  context={derivedContext}
                  focusedIndex={focusedIndex}
                  onSelect={handleSelectOption}
                  onFocusChange={handleHoverFocus}
                />
              )}

              {currentStep.type === 'display' && (
                <DisplayStepView
                  items={resolvedOptions[currentStep.id] ?? (currentStep as DisplayStep).items ?? []}
                  loading={!!resolving[currentStep.id]}
                />
              )}

              {/* Validation error */}
              {validationError && (
                <p className="text-[11px] text-destructive mt-1">{validationError}</p>
              )}

              {/* Bottom controls row */}
              <div className="flex items-center gap-1 mt-2 h-8">
                <span className="text-[9px] text-disabled">
                  {currentStep.type === 'text' || currentStep.type === 'combobox'
                    ? 'Type and press Enter'
                    : currentStep.type === 'display'
                      ? 'Enter continue'
                      : (
                        <>
                          &uarr;&darr; navigate
                          {(currentStep.type === 'select' ||
                            currentStep.type === 'multi-select' ||
                            currentStep.type === 'confirm') &&
                            ` \u00B7 1-${
                              currentStep.type === 'confirm'
                                ? '2'
                                : (resolvedOptions[currentStep.id]?.length ?? 0)
                            } select`}
                          {currentStep.type === 'multi-select' && ' \u00B7 Space select \u00B7 Enter continue'}
                          {!isFirstStep && ' \u00B7 \u2190 prev'}
                          {hasCurrentAnswer && !isLastStep && ' \u00B7 \u2192 next'}
                        </>
                      )}
                  {' \u00B7 Esc dismiss'}
                </span>

                <div className="flex-1" />

                {/* Display step continue button */}
                {currentStep.type === 'display' && (
                  <Pill
                    onClick={actions.goToNext}
                    kind="primary"
                    autoFocus
                  >
                    {isLastStep ? 'Review' : 'Continue'}
                  </Pill>
                )}

                {/* Multi-select continue button */}
                {currentStep.type === 'multi-select' && (
                  <Pill
                    onClick={actions.goToNext}
                    kind={hasCurrentAnswer ? 'primary' : 'disabled'}
                  >
                    {isLastStep ? 'Review' : 'Continue'}
                  </Pill>
                )}

                {/* Combobox continue button */}
                {currentStep.type === 'combobox' && hasCurrentAnswer && (
                  isValidating ? (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="w-3 h-3 rounded-full bg-ai animate-pulse" />
                      Checking...
                    </span>
                  ) : (
                    <Pill onClick={actions.goToNext} kind="primary">
                      {isLastStep ? 'Review' : 'Continue'}
                    </Pill>
                  )
                )}

                {/* Text step continue button */}
                {currentStep.type === 'text' && hasCurrentAnswer && (
                  isValidating ? (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="w-3 h-3 rounded-full bg-ai animate-pulse" />
                      Checking...
                    </span>
                  ) : (
                    <Pill onClick={actions.goToNext} kind="primary">
                      {isLastStep ? 'Review' : 'Continue'}
                    </Pill>
                  )
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
