/**
 * useActionFormState Unit Tests
 *
 * Tests the form state machine: step navigation, validation enforcement,
 * answer management, and async option resolution.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { defineActionForm } from '../action-form/define-action-form';
import type { ActionFormDefinition, ActionFormOption } from '../action-form/define-action-form';
import { useActionFormState } from '../action-form/use-action-form-state';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createBasicForm(overrides?: Partial<Parameters<typeof defineActionForm>[0]>): ActionFormDefinition {
  return defineActionForm({
    id: 'test-form',
    title: 'Test Form',
    steps: [
      { id: 'name', header: 'Name', question: 'Enter name', type: 'text', required: true },
      { id: 'color', header: 'Color', question: 'Pick color', type: 'select', options: [
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' },
      ] },
    ],
    onSubmit: vi.fn(),
    ...overrides,
  });
}

function renderFormState(definition: ActionFormDefinition, onSubmit?: (answers: Record<string, string>) => void) {
  return renderHook(() => useActionFormState(definition, onSubmit ?? vi.fn()));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useActionFormState', () => {
  describe('basic navigation', () => {
    it('starts at step 0', () => {
      const form = createBasicForm();
      const { result } = renderFormState(form);
      const [state] = result.current;

      expect(state.currentIndex).toBe(0);
      expect(state.currentStep?.id).toBe('name');
      expect(state.isFirstStep).toBe(true);
      expect(state.isLastStep).toBe(false);
    });

    it('advances to next step', () => {
      const form = createBasicForm();
      const { result } = renderFormState(form);

      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'test');
        actions.goToNext();
      });

      const [state] = result.current;
      expect(state.currentIndex).toBe(1);
      expect(state.currentStep?.id).toBe('color');
    });

    it('goes back to previous step', () => {
      const form = createBasicForm();
      const { result } = renderFormState(form);

      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'test');
        actions.goToNext();
      });

      act(() => {
        const [, actions] = result.current;
        actions.goToPrevious();
      });

      const [state] = result.current;
      expect(state.currentIndex).toBe(0);
      expect(state.currentStep?.id).toBe('name');
    });

    it('enters review mode after last step', () => {
      const form = createBasicForm();
      const { result } = renderFormState(form);

      // Advance through both steps
      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'test');
        actions.goToNext();
      });

      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('color', 'red');
        actions.goToNext();
      });

      const [state] = result.current;
      expect(state.isReviewing).toBe(true);
    });
  });

  describe('validation enforcement', () => {
    it('blocks goToNext when validate returns an error', () => {
      const form = defineActionForm({
        id: 'validated-form',
        title: 'Validated',
        steps: [
          {
            id: 'name',
            header: 'Name',
            question: 'Enter name',
            type: 'text',
            required: true,
            validate: (value: string) => {
              if (!/^[a-z-]+$/.test(value)) return 'Must be lowercase with hyphens';
              return null;
            },
          },
          { id: 'done', header: 'Done', question: 'Confirm', type: 'text' },
        ],
        onSubmit: vi.fn(),
      });

      const { result } = renderFormState(form);

      // Set invalid value and try to advance
      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'INVALID NAME');
        actions.goToNext();
      });

      const [state] = result.current;
      // Should NOT have advanced
      expect(state.currentIndex).toBe(0);
      expect(state.currentStep?.id).toBe('name');
      expect(state.validationError).toBe('Must be lowercase with hyphens');
    });

    it('allows goToNext when validate returns null', () => {
      const form = defineActionForm({
        id: 'validated-form',
        title: 'Validated',
        steps: [
          {
            id: 'name',
            header: 'Name',
            question: 'Enter name',
            type: 'text',
            required: true,
            validate: (value: string) => {
              if (!/^[a-z-]+$/.test(value)) return 'Must be lowercase with hyphens';
              return null;
            },
          },
          { id: 'done', header: 'Done', question: 'Confirm', type: 'text' },
        ],
        onSubmit: vi.fn(),
      });

      const { result } = renderFormState(form);

      // Set valid value first so goToNext has fresh answers
      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'valid-name');
      });

      act(() => {
        const [, actions] = result.current;
        actions.goToNext();
      });

      const [state] = result.current;
      expect(state.currentIndex).toBe(1);
      expect(state.currentStep?.id).toBe('done');
      expect(state.validationError).toBeNull();
    });

    it('clears validation error when answer changes', () => {
      const form = defineActionForm({
        id: 'validated-form',
        title: 'Validated',
        steps: [
          {
            id: 'name',
            header: 'Name',
            question: 'Enter name',
            type: 'text',
            required: true,
            validate: (value: string) => {
              if (!value.trim()) return 'Required';
              return null;
            },
          },
          { id: 'done', header: 'Done', question: 'Confirm', type: 'text' },
        ],
        onSubmit: vi.fn(),
      });

      const { result } = renderFormState(form);

      // Trigger validation error
      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', '');
        actions.goToNext();
      });

      expect(result.current[0].validationError).toBe('Required');

      // Change the answer — error should clear
      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'fixed');
      });

      expect(result.current[0].validationError).toBeNull();
    });

    it('does not block steps without validate', () => {
      const form = createBasicForm(); // 'name' step has no validate
      const { result } = renderFormState(form);

      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'anything');
        actions.goToNext();
      });

      expect(result.current[0].currentIndex).toBe(1);
      expect(result.current[0].validationError).toBeNull();
    });

    it('supports async validation (blocks until resolved)', async () => {
      let resolveValidation: (error: string | null) => void;
      const form = defineActionForm({
        id: 'async-validated-form',
        title: 'Async Validated',
        steps: [
          {
            id: 'directory',
            header: 'Directory',
            question: 'Pick directory',
            type: 'text',
            required: true,
            validate: (_value: string, _answers: Record<string, string>) => {
              return new Promise<string | null>((resolve) => {
                resolveValidation = resolve;
              });
            },
          },
          { id: 'done', header: 'Done', question: 'Confirm', type: 'text' },
        ],
        onSubmit: vi.fn(),
      });

      const { result } = renderFormState(form);

      // Set value and try to advance — should start validating
      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('directory', '/some/path');
        actions.goToNext();
      });

      // Should be validating, not advanced
      expect(result.current[0].isValidating).toBe(true);
      expect(result.current[0].currentIndex).toBe(0);

      // Resolve validation with an error
      await act(async () => {
        resolveValidation!('Directory already exists');
      });

      expect(result.current[0].isValidating).toBe(false);
      expect(result.current[0].validationError).toBe('Directory already exists');
      expect(result.current[0].currentIndex).toBe(0);
    });

    it('advances after async validation resolves with null (no error)', async () => {
      const form = defineActionForm({
        id: 'async-pass-form',
        title: 'Async Pass',
        steps: [
          {
            id: 'directory',
            header: 'Directory',
            question: 'Pick directory',
            type: 'text',
            required: true,
            validate: () => Promise.resolve(null),
          },
          { id: 'done', header: 'Done', question: 'Confirm', type: 'text' },
        ],
        onSubmit: vi.fn(),
      });

      const { result } = renderFormState(form);

      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('directory', '/some/path');
      });

      await act(async () => {
        const [, actions] = result.current;
        actions.goToNext();
      });

      expect(result.current[0].currentIndex).toBe(1);
      expect(result.current[0].validationError).toBeNull();
    });
  });

  describe('async submission', () => {
    it('shows submissionError when onSubmit returns { error }', async () => {
      const onSubmit = vi.fn().mockResolvedValue({ error: 'Directory already exists' });
      const form = createBasicForm();
      const { result } = renderFormState(form, onSubmit);

      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'test');
      });

      await act(async () => {
        const [, actions] = result.current;
        actions.submit();
      });

      expect(result.current[0].submissionError).toBe('Directory already exists');
      expect(result.current[0].isSubmitting).toBe(false);
    });

    it('allows resubmission after a failed async submit', async () => {
      let submitCount = 0;
      const onSubmit = vi.fn().mockImplementation(() => {
        submitCount++;
        if (submitCount === 1) return Promise.resolve({ error: 'First attempt failed' });
        return Promise.resolve();
      });
      const form = createBasicForm();
      const { result } = renderFormState(form, onSubmit);

      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'test');
      });

      // First submit — fails
      await act(async () => {
        const [, actions] = result.current;
        actions.submit();
      });

      expect(result.current[0].submissionError).toBe('First attempt failed');

      // Second submit — should work (submittedRef was reset)
      await act(async () => {
        const [, actions] = result.current;
        actions.submit();
      });

      expect(onSubmit).toHaveBeenCalledTimes(2);
      expect(result.current[0].submissionError).toBeNull();
    });
  });

  describe('submission', () => {
    it('calls onSubmit with collected answers', () => {
      const onSubmit = vi.fn();
      const form = createBasicForm();
      const { result } = renderFormState(form, onSubmit);

      // Set answers first — submit closure captures answers on next render
      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'test-name');
        actions.setAnswer('color', 'blue');
      });

      // Now submit — the callback has fresh answers
      act(() => {
        const [, actions] = result.current;
        actions.submit();
      });

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'test-name',
        color: 'blue',
      });
    });

    it('guards against double submission', () => {
      const onSubmit = vi.fn();
      const form = createBasicForm();
      const { result } = renderFormState(form, onSubmit);

      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'test');
        actions.submit();
        actions.submit(); // second call should be ignored
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('progress tracking', () => {
    it('calculates progress correctly', () => {
      const form = createBasicForm();
      const { result } = renderFormState(form);

      // Step 1 of 2 = 50%
      expect(result.current[0].progress).toBe(50);

      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'x');
        actions.goToNext();
      });

      // Step 2 of 2 = 100%
      expect(result.current[0].progress).toBe(100);
    });

    it('tracks hasCurrentAnswer', () => {
      const form = createBasicForm();
      const { result } = renderFormState(form);

      expect(result.current[0].hasCurrentAnswer).toBe(false);

      act(() => {
        const [, actions] = result.current;
        actions.setAnswer('name', 'test');
      });

      expect(result.current[0].hasCurrentAnswer).toBe(true);
    });
  });
});
