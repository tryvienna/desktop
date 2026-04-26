/**
 * ActionFormBar Keyboard Navigation Tests
 *
 * Tests the keyboard interaction behavior of ActionFormBar, focusing on:
 * - Arrow key navigation through options
 * - Space bar toggling in multi-select
 * - Filtered option navigation when a create-input filter is active
 * - Enter key selection
 * - Number key shortcuts
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act, screen, fireEvent, waitFor } from '@testing-library/react';
import { defineActionForm } from '../action-form/define-action-form';
import type { ActionFormDefinition, ActionFormOption } from '../action-form/define-action-form';
import { ActionFormBar } from '../action-form/action-form-bar';

// ─── Setup ──────────────────────────────────────────────────────────────────

// jsdom doesn't implement scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function pressKey(key: string) {
  fireEvent.keyDown(document.body, { key });
}

function pressKeyUp(key: string) {
  fireEvent.keyUp(document.body, { key });
}

/** Get all visible option buttons (excluding Create, customize, etc.) */
function getOptionButtons(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="action-form-bar"] button'),
  ).filter((btn) => {
    const text = btn.textContent ?? '';
    // Exclude "Create ..." buttons, customize/settings, Review/Continue pills
    if (text.includes('Create')) return false;
    if (text.includes('Customize')) return false;
    if (text === 'Review' || text === 'Continue') return false;
    // Option buttons have rounded-lg + px-3
    return btn.className.includes('rounded-lg') && btn.className.includes('px-3');
  });
}

/** Check if a button has the focused (hover) style */
function isFocusedOption(btn: Element) {
  return btn.className.includes('bg-surface-hover');
}

/** Check if a button has the selected style */
function isSelectedOption(btn: Element) {
  return btn.className.includes('bg-surface-ai');
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

const LABEL_OPTIONS: ActionFormOption[] = [
  { value: 'bug', label: 'Bug', color: '#EF4444' },
  { value: 'feature', label: 'Feature', color: '#3B82F6' },
  { value: 'docs', label: 'Documentation', color: '#10B981' },
  { value: 'perf', label: 'Performance', color: '#F59E0B' },
  { value: 'test', label: 'Testing', color: '#8B5CF6' },
];

function createMultiSelectForm(overrides?: {
  onCreateOption?: (text: string) => Promise<ActionFormOption>;
}): ActionFormDefinition {
  return defineActionForm({
    id: 'multi-select-form',
    title: 'Test Multi-Select',
    steps: [
      {
        id: 'labels',
        header: 'Labels',
        question: 'Pick labels',
        type: 'multi-select' as const,
        options: LABEL_OPTIONS,
        placeholder: 'Search or create...',
        onCreateOption: overrides?.onCreateOption,
      },
    ],
    onSubmit: vi.fn(),
  });
}

function createSelectForm(): ActionFormDefinition {
  return defineActionForm({
    id: 'select-form',
    title: 'Test Select',
    steps: [
      {
        id: 'color',
        header: 'Color',
        question: 'Pick a color',
        type: 'select' as const,
        options: [
          { value: 'red', label: 'Red' },
          { value: 'green', label: 'Green' },
          { value: 'blue', label: 'Blue' },
        ],
      },
    ],
    onSubmit: vi.fn(),
  });
}

function renderForm(
  definition: ActionFormDefinition,
  overrides?: { onSubmit?: (answers: Record<string, string>) => void },
) {
  const onSubmit = overrides?.onSubmit ?? vi.fn();
  const onDismiss = vi.fn();
  const result = render(
    <ActionFormBar
      definition={definition}
      onSubmit={onSubmit}
      onDismiss={onDismiss}
    />,
  );
  return { ...result, onSubmit, onDismiss };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ActionFormBar keyboard navigation', () => {
  describe('single-select: arrow keys', () => {
    it('ArrowDown moves focus through options', () => {
      renderForm(createSelectForm());

      // No focus initially
      const buttons = getOptionButtons();
      expect(buttons.length).toBe(3);
      expect(buttons.some(isFocusedOption)).toBe(false);

      // First ArrowDown → first option focused
      act(() => pressKey('ArrowDown'));
      expect(isFocusedOption(getOptionButtons()[0])).toBe(true);

      // Second ArrowDown → second option focused
      act(() => pressKey('ArrowDown'));
      expect(isFocusedOption(getOptionButtons()[1])).toBe(true);
      expect(isFocusedOption(getOptionButtons()[0])).toBe(false);
    });

    it('ArrowDown wraps around from last to first', () => {
      renderForm(createSelectForm());

      // Go past last (3 options: indexes 0, 1, 2)
      act(() => pressKey('ArrowDown')); // → 0
      act(() => pressKey('ArrowDown')); // → 1
      act(() => pressKey('ArrowDown')); // → 2
      act(() => pressKey('ArrowDown')); // → wrap to 0

      expect(isFocusedOption(getOptionButtons()[0])).toBe(true);
    });

    it('ArrowUp wraps around from first to last', () => {
      renderForm(createSelectForm());

      act(() => pressKey('ArrowUp')); // from -1 → last (2)

      expect(isFocusedOption(getOptionButtons()[2])).toBe(true);
    });
  });

  describe('arrow keys start from pre-selected option', () => {
    it('ArrowDown from no focus starts after the selected option', () => {
      renderForm(createMultiSelectForm());

      // Select the second option (Feature) via number key
      act(() => pressKey('2'));
      expect(isSelectedOption(getOptionButtons()[1])).toBe(true);

      // Reset focus (simulating re-entering the step or initial state)
      // ArrowDown should go to option after "Feature" (index 2), not index 0
      act(() => pressKey('ArrowDown'));
      expect(isFocusedOption(getOptionButtons()[2])).toBe(true);
    });

    it('ArrowUp from no focus starts before the selected option', () => {
      renderForm(createMultiSelectForm());

      // Select the third option (Documentation) via number key
      act(() => pressKey('3'));
      expect(isSelectedOption(getOptionButtons()[2])).toBe(true);

      // ArrowUp should go to option before "Documentation" (index 1), not last
      act(() => pressKey('ArrowUp'));
      expect(isFocusedOption(getOptionButtons()[1])).toBe(true);
    });

    it('ArrowDown wraps when selected option is last', () => {
      renderForm(createMultiSelectForm());

      // Select the last option (Testing, index 4)
      act(() => pressKey('5'));
      expect(isSelectedOption(getOptionButtons()[4])).toBe(true);

      // ArrowDown should wrap to first (index 0)
      act(() => pressKey('ArrowDown'));
      expect(isFocusedOption(getOptionButtons()[0])).toBe(true);
    });

    it('ArrowUp wraps when selected option is first', () => {
      renderForm(createMultiSelectForm());

      // Select the first option (Bug, index 0)
      act(() => pressKey('1'));
      expect(isSelectedOption(getOptionButtons()[0])).toBe(true);

      // ArrowUp should wrap to last (index 4)
      act(() => pressKey('ArrowUp'));
      expect(isFocusedOption(getOptionButtons()[4])).toBe(true);
    });
  });

  describe('multi-select: arrow keys + space', () => {
    it('Space bar toggles the focused option', () => {
      renderForm(createMultiSelectForm());

      // Focus the first option
      act(() => pressKey('ArrowDown'));

      // Space should toggle it on
      act(() => pressKey(' '));
      expect(isSelectedOption(getOptionButtons()[0])).toBe(true);

      // Space again should deselect
      act(() => pressKey(' '));
      expect(isSelectedOption(getOptionButtons()[0])).toBe(false);
    });

    it('Space bar does nothing when nothing is focused', () => {
      renderForm(createMultiSelectForm());

      // No focus, space should not select anything
      act(() => pressKey(' '));
      expect(getOptionButtons().some(isSelectedOption)).toBe(false);
    });

    it('Enter advances to next step in multi-select (Space toggles, Enter continues)', () => {
      const form = defineActionForm({
        id: 'ms-advance-form',
        title: 'Test',
        steps: [
          {
            id: 'labels',
            header: 'Labels',
            question: 'Pick labels',
            type: 'multi-select' as const,
            options: LABEL_OPTIONS,
          },
          {
            id: 'name',
            header: 'Name',
            question: 'Enter name',
            type: 'text' as const,
          },
        ],
        onSubmit: vi.fn(),
      });
      renderForm(form);

      // Select an option with Space
      act(() => pressKey('ArrowDown'));
      act(() => pressKey(' '));
      expect(isSelectedOption(getOptionButtons()[0])).toBe(true);

      // Enter should advance to next step, not toggle
      act(() => pressKey('Enter'));
      act(() => pressKeyUp('Enter'));

      // Should now be on the "Name" step
      expect(screen.getByText('Enter name')).toBeTruthy();
    });

    it('can select multiple options with arrow + space', () => {
      renderForm(createMultiSelectForm());

      // Select first
      act(() => pressKey('ArrowDown')); // → 0
      act(() => pressKey(' '));

      // Select third
      act(() => pressKey('ArrowDown')); // → 1
      act(() => pressKey('ArrowDown')); // → 2
      act(() => pressKey(' '));

      const buttons = getOptionButtons();
      expect(isSelectedOption(buttons[0])).toBe(true);
      expect(isSelectedOption(buttons[1])).toBe(false);
      expect(isSelectedOption(buttons[2])).toBe(true);
    });
  });

  describe('multi-select with filter: arrow keys navigate filtered options', () => {
    it('filter narrows visible options, arrow keys only cycle through visible ones', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      // Type "e" into the filter input — matches Bug, Feature, Performance, Testing
      // (all contain "e")... actually let's use a more specific filter
      const input = screen.getByPlaceholderText('Search or create...');
      act(() => {
        fireEvent.change(input, { target: { value: 'doc' } });
      });

      // Should show only "Documentation"
      const buttons = getOptionButtons();
      expect(buttons.length).toBe(1);
      expect(buttons[0].textContent).toContain('Documentation');

      // ArrowDown → focus the only visible option
      act(() => pressKey('ArrowDown'));
      expect(isFocusedOption(getOptionButtons()[0])).toBe(true);

      // One more ArrowDown wraps back to the same option (only 1 visible)
      act(() => pressKey('ArrowDown'));
      expect(isFocusedOption(getOptionButtons()[0])).toBe(true);
    });

    it('Space selects the correct filtered option', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      const input = screen.getByPlaceholderText('Search or create...');
      act(() => {
        fireEvent.change(input, { target: { value: 'bug' } });
      });

      expect(getOptionButtons().length).toBe(1);
      expect(getOptionButtons()[0].textContent).toContain('Bug');

      // ArrowDown to focus, Space to select
      act(() => pressKey('ArrowDown'));
      act(() => pressKey(' '));

      expect(isSelectedOption(getOptionButtons()[0])).toBe(true);
    });

    it('clearing filter shows all options with selections preserved', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      const input = screen.getByPlaceholderText('Search or create...');

      // Filter to "bug" and select it
      act(() => {
        fireEvent.change(input, { target: { value: 'bug' } });
      });
      expect(getOptionButtons().length).toBe(1);

      act(() => pressKey('ArrowDown'));
      act(() => pressKey(' '));
      expect(isSelectedOption(getOptionButtons()[0])).toBe(true);

      // Clear filter — all 5 options should appear, "Bug" still selected
      act(() => {
        fireEvent.change(input, { target: { value: '' } });
      });

      const buttons = getOptionButtons();
      expect(buttons.length).toBe(5);
      // Bug is the first option and should still be selected
      expect(isSelectedOption(buttons[0])).toBe(true);
      // Others not selected
      expect(isSelectedOption(buttons[1])).toBe(false);
    });

    it('filter resets focused index — first ArrowDown focuses first filtered option', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      const input = screen.getByPlaceholderText('Search or create...');

      // Focus option 3 in the full list
      act(() => pressKey('ArrowDown')); // 0
      act(() => pressKey('ArrowDown')); // 1
      act(() => pressKey('ArrowDown')); // 2

      // Type filter — resets focus index
      act(() => {
        fireEvent.change(input, { target: { value: 'doc' } });
      });

      const buttons = getOptionButtons();
      expect(buttons.length).toBe(1);
      expect(buttons[0].textContent).toContain('Documentation');

      // No focus after filter change
      expect(buttons.some(isFocusedOption)).toBe(false);

      // First ArrowDown → focuses the first (only) filtered option
      act(() => pressKey('ArrowDown'));
      expect(isFocusedOption(getOptionButtons()[0])).toBe(true);
    });

    it('narrowing filter from 3 visible to 1 visible, ArrowDown lands on the one option immediately', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      const input = screen.getByPlaceholderText('Search or create...');

      // Filter to "e" — matches Bug, Feature, Performance, Testing (4 of 5 contain "e")
      act(() => {
        fireEvent.change(input, { target: { value: 'e' } });
      });
      const broad = getOptionButtons();
      expect(broad.length).toBeGreaterThan(1);

      // Now narrow further to "perf"
      act(() => {
        fireEvent.change(input, { target: { value: 'perf' } });
      });
      expect(getOptionButtons().length).toBe(1);
      expect(getOptionButtons()[0].textContent).toContain('Performance');

      // One ArrowDown → immediately focuses the single option
      act(() => pressKey('ArrowDown'));
      expect(isFocusedOption(getOptionButtons()[0])).toBe(true);
    });
  });

  describe('number key shortcuts', () => {
    it('number keys toggle the corresponding option in multi-select', () => {
      renderForm(createMultiSelectForm());

      // Press "2" to toggle second option (Feature)
      act(() => pressKey('2'));
      expect(isSelectedOption(getOptionButtons()[1])).toBe(true);
    });

    it('number keys work on filtered options (1 selects first visible, not first overall)', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      const input = screen.getByPlaceholderText('Search or create...');
      // Filter to show only "Performance"
      act(() => {
        fireEvent.change(input, { target: { value: 'perf' } });
      });
      expect(getOptionButtons().length).toBe(1);

      // Press "1" — should select the first FILTERED option (Performance), not Bug
      // Note: number keys fire from body, not from the input (input has stopPropagation)
      // so we need to blur the input first
      act(() => {
        (input as HTMLInputElement).blur();
      });
      act(() => pressKey('1'));

      const buttons = getOptionButtons();
      expect(isSelectedOption(buttons[0])).toBe(true);
      expect(buttons[0].textContent).toContain('Performance');
    });
  });

  describe('create option flow', () => {
    it('shows Create button when typed text has no exact match', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      const input = screen.getByPlaceholderText('Search or create...');
      act(() => {
        fireEvent.change(input, { target: { value: 'newlabel' } });
      });

      expect(screen.getByText(/Create.*newlabel/)).toBeTruthy();
    });

    it('does not show Create button when text matches an existing option (case-insensitive)', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      const input = screen.getByPlaceholderText('Search or create...');
      act(() => {
        fireEvent.change(input, { target: { value: 'bug' } });
      });

      expect(screen.queryByText(/Create/)).toBeNull();
    });

    it('Enter in create input calls onCreateOption when no exact match', async () => {
      const onCreateOption = vi.fn().mockResolvedValue({
        value: 'new-id',
        label: 'NewLabel',
        color: '#000',
      });
      renderForm(createMultiSelectForm({ onCreateOption }));

      const input = screen.getByPlaceholderText('Search or create...');
      act(() => {
        fireEvent.change(input, { target: { value: 'NewLabel' } });
      });

      // "NewLabel" doesn't match Bug/Feature/etc. → Create button should appear
      expect(screen.getByText(/Create.*NewLabel/)).toBeTruthy();

      // Press Enter in the input
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(onCreateOption).toHaveBeenCalledWith('NewLabel');
    });

    it('Enter in create input selects existing option when exact match', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      const input = screen.getByPlaceholderText('Search or create...');
      act(() => {
        // Exact match for "Bug" (case-insensitive)
        fireEvent.change(input, { target: { value: 'Bug' } });
      });

      expect(getOptionButtons().length).toBe(1);

      // Enter should select "Bug", not create
      act(() => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(isSelectedOption(getOptionButtons()[0])).toBe(true);
    });
  });

  describe('focus management', () => {
    it('create input is NOT auto-focused — arrow keys work immediately', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      const input = screen.getByPlaceholderText('Search or create...');
      // Input should not be the active element
      expect(document.activeElement).not.toBe(input);

      // ArrowDown should immediately focus the first option
      act(() => pressKey('ArrowDown'));
      expect(isFocusedOption(getOptionButtons()[0])).toBe(true);

      // Space should toggle (not type a space into the input)
      act(() => pressKey(' '));
      expect(isSelectedOption(getOptionButtons()[0])).toBe(true);
    });

    it('ArrowDown blurs the input so Space works on the focused option', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      const input = screen.getByPlaceholderText('Search or create...');
      // Manually focus the input (simulating a click)
      act(() => { (input as HTMLInputElement).focus(); });
      expect(document.activeElement).toBe(input);

      // ArrowDown should blur the input and focus an option
      act(() => {
        fireEvent.keyDown(input, { key: 'ArrowDown' });
      });
      // Input should no longer be focused
      expect(document.activeElement).not.toBe(input);
    });

    it('typing a letter while options are focused redirects to the input', () => {
      renderForm(createMultiSelectForm({ onCreateOption: vi.fn() }));

      // Focus an option first
      act(() => pressKey('ArrowDown'));
      expect(isFocusedOption(getOptionButtons()[0])).toBe(true);

      const input = screen.getByPlaceholderText('Search or create...');
      expect(document.activeElement).not.toBe(input);

      // Press a letter key — should focus the input
      act(() => pressKey('b'));
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Escape dismisses', () => {
    it('Escape calls onDismiss', () => {
      const { onDismiss } = renderForm(createMultiSelectForm());
      act(() => pressKey('Escape'));
      expect(onDismiss).toHaveBeenCalled();
    });
  });
});
