/**
 * useActionFormState — State management hook for ActionFormBar
 *
 * @ai-context
 * - Manages multi-step form state: current step, answers, resolved options, direction
 * - Handles async option resolution for select/multi-select steps
 * - Derives context from prior answers for later steps
 * - Tracks which steps are enabled/disabled by user preferences
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  ActionFormDefinition,
  ActionFormStep,
  ActionFormOption,
  SelectStep,
  MultiSelectStep,
  ComboboxStep,
  TextStep,
  ConfirmStep,
  DisplayStep,
} from './define-action-form';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionFormState {
  /** Active steps (after filtering disabled ones) */
  activeSteps: ActionFormStep[];
  /** Current step index */
  currentIndex: number;
  /** Current step definition */
  currentStep: ActionFormStep | undefined;
  /** All answers collected so far: stepId -> value */
  answers: Record<string, string>;
  /** Resolved options for select/multi-select steps (stepId -> options) */
  resolvedOptions: Record<string, ActionFormOption[]>;
  /** Loading state for async resolvers (stepId -> boolean) */
  resolving: Record<string, boolean>;
  /** Whether we're on the review screen */
  isReviewing: boolean;
  /** Slide direction for animations */
  direction: 'forward' | 'backward';
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether current step has an answer */
  hasCurrentAnswer: boolean;
  /** Whether we're on the first step */
  isFirstStep: boolean;
  /** Whether we're on the last step */
  isLastStep: boolean;
  /** Derived context from all answers so far */
  derivedContext: Record<string, string>;
  /** Step IDs disabled by user */
  disabledStepIds: string[];
  /** Whether the customize overlay is open */
  isCustomizing: boolean;
  /** Validation error for the current step (null if valid) */
  validationError: string | null;
  /** Whether async validation is in progress */
  isValidating: boolean;
  /** Whether async submission is in progress */
  isSubmitting: boolean;
  /** Error from the last submission attempt (null if none) */
  submissionError: string | null;
}

export interface ActionFormActions {
  /** Set answer for the current step */
  setAnswer: (stepId: string, value: string) => void;
  /** Navigate to next step */
  goToNext: () => void;
  /** Navigate to previous step */
  goToPrevious: () => void;
  /** Jump to a specific step index */
  goToStep: (index: number) => void;
  /** Enter review mode */
  goToReview: () => void;
  /** Submit the form */
  submit: () => void;
  /** Allow resubmission after a failed async submit (resets the submitted guard) */
  allowResubmit: () => void;
  /** Set a submission error to display in the review screen */
  setSubmissionError: (error: string | null) => void;
  /** Toggle a step's enabled/disabled state */
  toggleStep: (stepId: string) => void;
  /** Open/close the customize overlay */
  setCustomizing: (open: boolean) => void;
  /** Reset the form to initial state */
  reset: () => void;
  /** Update resolved options for a specific step (e.g. after creating a new option) */
  updateResolvedOptions: (stepId: string, options: ActionFormOption[]) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useActionFormState(
  definition: ActionFormDefinition,
  onSubmit: (answers: Record<string, string>) => void | Promise<void | { error?: string }>,
  initialDisabledStepIds?: string[],
): [ActionFormState, ActionFormActions] {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Ref mirrors `answers` so goToNext validation always reads the latest value,
  // even when setAnswer + goToNext fire in the same synchronous tick.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const [resolvedOptions, setResolvedOptions] = useState<Record<string, ActionFormOption[]>>({});
  const [resolving, setResolving] = useState<Record<string, boolean>>({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [disabledStepIds, setDisabledStepIds] = useState<string[]>(initialDisabledStepIds ?? []);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Track which resolvers have been kicked off
  const resolvedRef = useRef<Set<string>>(new Set());

  // Guard against double-submission when Enter is pressed rapidly.
  // React 18 batches state updates asynchronously, so two quick keypresses can
  // both fire the window keydown handler before setActiveForm(null) is committed.
  const submittedRef = useRef(false);

  // Shared reset logic used by both the public reset() action and the definition-change effect.
  const resetForm = useCallback(() => {
    setCurrentIndex(0);
    setAnswers({});
    answersRef.current = {};
    setIsReviewing(false);
    setDirection('forward');
    resolvedRef.current.clear();
    setResolvedOptions({});
    setResolving({});
    submittedRef.current = false;
  }, []);

  // Reset all form state when the definition changes (e.g. group form chains into workstream form).
  // Without this, stale state (isReviewing, answers, currentIndex) carries over and the new form
  // skips straight to the review screen with undefined values.
  const prevDefinitionId = useRef(definition.id);
  useEffect(() => {
    if (definition.id !== prevDefinitionId.current) {
      prevDefinitionId.current = definition.id;
      resetForm();
      setDisabledStepIds(initialDisabledStepIds ?? []);
    }
  }, [definition.id, initialDisabledStepIds, resetForm]);

  const activeSteps = useMemo(
    () => definition.getActiveSteps(disabledStepIds, answers),
    [definition, disabledStepIds, answers],
  );

  // When activeSteps changes due to a condition flipping, stabilize the
  // current position by tracking the step ID rather than the numeric index.
  const currentStepIdRef = useRef<string | null>(null);
  useEffect(() => {
    const targetId = currentStepIdRef.current;
    if (!targetId) return;
    const newIdx = activeSteps.findIndex((s) => s.id === targetId);
    if (newIdx !== -1 && newIdx !== currentIndex) {
      setCurrentIndex(newIdx);
    } else if (newIdx === -1 && activeSteps.length > 0) {
      // Current step was removed by condition — clamp to valid range
      setCurrentIndex(Math.min(currentIndex, activeSteps.length - 1));
    }
  }, [activeSteps]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    currentStepIdRef.current = activeSteps[currentIndex]?.id ?? null;
  }, [activeSteps, currentIndex]);

  // Clear answers for conditional steps that are no longer active
  useEffect(() => {
    const activeIds = new Set(activeSteps.map((s) => s.id));
    setAnswers((prev) => {
      const stale = Object.keys(prev).filter((id) => {
        const step = definition.getStep(id);
        return step?.condition && !activeIds.has(id);
      });
      if (stale.length === 0) return prev;
      const next = { ...prev };
      for (const id of stale) delete next[id];
      return next;
    });
  }, [activeSteps, definition]);

  const currentStep = activeSteps[currentIndex];
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === activeSteps.length - 1;
  const progress = activeSteps.length > 0 ? ((currentIndex + 1) / activeSteps.length) * 100 : 0;

  // Derive context from all answers
  const derivedContext = useMemo(() => {
    let context: Record<string, string> = {};
    for (const step of activeSteps) {
      if (step.deriveContext && answers[step.id]) {
        context = { ...context, ...step.deriveContext(answers) };
      }
    }
    // Also include raw answers as context
    return { ...answers, ...context };
  }, [activeSteps, answers]);

  const hasCurrentAnswer = currentStep ? (answers[currentStep.id] ?? '').length > 0 : false;

  // Resolve options for select/multi-select/combobox/display steps when they become current
  useEffect(() => {
    if (!currentStep) return;

    // Display steps use items/resolve instead of options/resolve
    if (currentStep.type === 'display') {
      const step = currentStep as DisplayStep;
      if (step.items && !step.resolve) {
        setResolvedOptions((prev) => ({ ...prev, [step.id]: step.items! }));
        return;
      }
      if (step.resolve && !resolvedRef.current.has(step.id)) {
        resolvedRef.current.add(step.id);
        setResolving((prev) => ({ ...prev, [step.id]: true }));
        step.resolve().then((items) => {
          setResolvedOptions((prev) => ({ ...prev, [step.id]: items }));
          setResolving((prev) => ({ ...prev, [step.id]: false }));
        });
      }
      return;
    }

    if (currentStep.type !== 'select' && currentStep.type !== 'multi-select' && currentStep.type !== 'combobox') return;

    const step = currentStep as SelectStep | MultiSelectStep | ComboboxStep;

    // If static options, store them directly
    if (step.options && !step.resolve) {
      setResolvedOptions((prev) => ({ ...prev, [step.id]: step.options! }));
      return;
    }

    // If async resolve and we haven't resolved yet
    if (step.resolve && !resolvedRef.current.has(step.id)) {
      resolvedRef.current.add(step.id);
      setResolving((prev) => ({ ...prev, [step.id]: true }));

      step.resolve().then((options) => {
        setResolvedOptions((prev) => ({ ...prev, [step.id]: options }));
        setResolving((prev) => ({ ...prev, [step.id]: false }));
      });
    }
  }, [currentStep]);

  // Apply default values when entering a step
  useEffect(() => {
    if (!currentStep || answers[currentStep.id] !== undefined) return;

    let defaultVal: string | undefined;

    if (currentStep.type === 'text') {
      const step = currentStep as TextStep;
      defaultVal = typeof step.defaultValue === 'function'
        ? step.defaultValue(derivedContext)
        : step.defaultValue;
    } else if (currentStep.type === 'select') {
      const step = currentStep as SelectStep;
      defaultVal = typeof step.defaultValue === 'function'
        ? step.defaultValue(derivedContext)
        : step.defaultValue;
    } else if (currentStep.type === 'combobox') {
      const step = currentStep as ComboboxStep;
      defaultVal = typeof step.defaultValue === 'function'
        ? step.defaultValue(derivedContext)
        : step.defaultValue;
    } else if (currentStep.type === 'multi-select') {
      const step = currentStep as MultiSelectStep;
      const val = typeof step.defaultValue === 'function'
        ? step.defaultValue(derivedContext)
        : step.defaultValue;
      if (val) defaultVal = Array.isArray(val) ? val.join(', ') : val;
    } else if (currentStep.type === 'confirm') {
      const step = currentStep as ConfirmStep;
      const val = typeof step.defaultValue === 'function'
        ? step.defaultValue(derivedContext)
        : step.defaultValue;
      if (val !== undefined) defaultVal = val ? 'yes' : 'no';
    } else if (currentStep.type === 'display') {
      const step = currentStep as DisplayStep;
      if (step.value !== undefined) {
        defaultVal = step.value;
      } else {
        // Auto-set from resolved items (comma-separated values)
        const items = resolvedOptions[step.id] ?? step.items;
        if (items) {
          defaultVal = items.map((i) => i.value).join(',');
        }
      }
    }

    if (defaultVal !== undefined) {
      setAnswers((prev) => ({ ...prev, [currentStep.id]: defaultVal! }));
    }
  }, [currentStep?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────

  const setAnswer = useCallback((stepId: string, value: string) => {
    // Update ref synchronously so goToNext validation in the same tick reads it
    answersRef.current = { ...answersRef.current, [stepId]: value };
    setAnswers((prev) => ({ ...prev, [stepId]: value }));
    setValidationError(null);
  }, []);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Ref for disabledStepIds so goToNext can read the latest value synchronously
  const disabledStepIdsRef = useRef(disabledStepIds);
  disabledStepIdsRef.current = disabledStepIds;

  const goToNext = useCallback(() => {
    const advance = () => {
      setValidationError(null);
      // Recompute active steps using the latest answers (from ref) so that
      // conditional steps that just became active are accounted for.
      const freshSteps = definition.getActiveSteps(disabledStepIdsRef.current, answersRef.current);
      const currentId = currentStepIdRef.current;
      const currentIdx = currentId ? freshSteps.findIndex((s) => s.id === currentId) : currentIndex;
      const effectiveIdx = currentIdx >= 0 ? currentIdx : currentIndex;
      const isLast = effectiveIdx >= freshSteps.length - 1;

      if (isLast) {
        setIsReviewing(true);
      } else {
        setDirection('forward');
        setCurrentIndex(effectiveIdx + 1);
      }
    };

    // Read from ref so validation sees the latest answers even when
    // setAnswer + goToNext fire in the same synchronous tick.
    const latestAnswers = answersRef.current;

    // Run validation if the current step has a validate function
    if (currentStep && 'validate' in currentStep) {
      const step = currentStep as { validate?: (value: string, answers: Record<string, string>) => string | null | Promise<string | null> };
      if (step.validate) {
        const result = step.validate(latestAnswers[currentStep.id] ?? '', latestAnswers);
        // Handle async validation (returns a Promise)
        if (result && typeof result === 'object' && 'then' in result) {
          setIsValidating(true);
          (result as Promise<string | null>).then((error) => {
            setIsValidating(false);
            if (error) {
              setValidationError(error);
            } else {
              advance();
            }
          }).catch(() => {
            setIsValidating(false);
          });
          return;
        }
        // Sync validation
        if (result) {
          setValidationError(result);
          return;
        }
      }
    }
    advance();
  }, [definition, currentIndex, currentStep]);

  const goToPrevious = useCallback(() => {
    setValidationError(null);
    if (isReviewing) {
      setIsReviewing(false);
      setDirection('backward');
      return;
    }
    if (!isFirstStep) {
      setDirection('backward');
      setCurrentIndex((i) => i - 1);
    }
  }, [isFirstStep, isReviewing]);

  const goToStep = useCallback(
    (index: number) => {
      setValidationError(null);
      setDirection(index > currentIndex ? 'forward' : 'backward');
      setIsReviewing(false);
      setCurrentIndex(index);
    },
    [currentIndex],
  );

  const goToReview = useCallback(() => {
    setIsReviewing(true);
  }, []);

  const submit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);

    const result = onSubmit(answers);

    // If onSubmit returns a Promise, handle async success/failure
    if (result && typeof result === 'object' && 'then' in result) {
      (result as Promise<void | { error?: string }>).then((res) => {
        setIsSubmitting(false);
        if (res && 'error' in res && res.error) {
          // Submission failed — show error, allow retry
          setSubmissionError(res.error);
          submittedRef.current = false;
        }
      }).catch((err) => {
        setIsSubmitting(false);
        setSubmissionError(err instanceof Error ? err.message : String(err));
        submittedRef.current = false;
      });
    }
    // Sync path: reset isSubmitting so the UI doesn't get stuck if the
    // form isn't immediately dismissed by the caller.
    if (!result || typeof result !== 'object' || !('then' in result)) {
      setIsSubmitting(false);
    }
  }, [answers, onSubmit]);

  const allowResubmit = useCallback(() => {
    submittedRef.current = false;
    setIsSubmitting(false);
  }, []);

  const toggleStep = useCallback(
    (stepId: string) => {
      const step = definition.getStep(stepId);
      if (!step || step.required) return;

      setDisabledStepIds((prev) => {
        if (prev.includes(stepId)) {
          return prev.filter((id) => id !== stepId);
        }
        return [...prev, stepId];
      });
    },
    [definition],
  );

  // Public reset action — delegates to shared resetForm.
  const reset = resetForm;

  const state: ActionFormState = {
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
  };

  const updateResolvedOptions = useCallback(
    (stepId: string, options: ActionFormOption[]) => {
      setResolvedOptions((prev) => ({ ...prev, [stepId]: options }));
    },
    [],
  );

  const actions: ActionFormActions = {
    setAnswer,
    goToNext,
    goToPrevious,
    goToStep,
    goToReview,
    submit,
    allowResubmit,
    setSubmissionError,
    toggleStep,
    setCustomizing: setIsCustomizing,
    reset,
    updateResolvedOptions,
  };

  return [state, actions];
}
