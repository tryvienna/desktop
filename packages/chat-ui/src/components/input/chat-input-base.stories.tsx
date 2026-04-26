// ChatInputBase Stories
//
// Foundation ContentEditable input component providing:
// - Dynamic height expansion (min/max configurable via config)
// - Plain text extraction as InputValue { plainText, entities, attachments }
// - Focus management API via ref handle
// - Keyboard shortcuts (Enter to submit, Shift+Enter for newline)
// - Optional character counter
// - Loading / disabled states
// - Configurable submit button
//
// Props:
//   config?: InputConfig          — { minHeight, maxHeight, showCharacterCount, maxLength, placeholder, autoFocus }
//   onChange?(value: InputValue)   — fires on every input change
//   onSubmit?(value: InputValue)   — fires on Enter (without Shift)
//   disabled?: boolean             — disables the input
//   isSubmitting?: boolean         — shows spinner in submit button
//   className?: string             — additional CSS class
//   style?: CSSProperties          — inline styles
//   showSubmitButton?: boolean     — render the send button (default: true)
//   submitButtonLabel?: string     — aria-label for submit button (default: 'Send')
//
// Ref Handle API (ChatInputBaseHandle):
//   focus()                    — programmatically focus the input
//   clear()                    — clear the input content
//   setValue(value)             — set value from string or InputValue
//   getValue(): InputValue     — read current value
//   insertText(text)           — insert text at cursor position

import React, { useRef, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ChatInputBase } from './chat-input-base';
import type { ChatInputBaseHandle } from './chat-input-base';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof ChatInputBase> = {
  title: 'Input/chat-input-base',
  component: ChatInputBase,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-6 bg-surface-sunken">
        <Story />
      </div>
    ),
  ],
  args: {
    onChange: fn(),
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ChatInputBase>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Empty input ready to type.
 *
 * Default configuration with all defaults:
 * - minHeight: 60, maxHeight: 200
 * - placeholder: "Type a message..."
 * - Submit button visible
 * - Character count hidden
 */
export const Default: Story = {
  args: {},
};

/**
 * Custom placeholder text.
 *
 * The placeholder is displayed as a CSS pseudo-element (::before)
 * when the input is empty. It disappears as soon as any text is entered.
 * Configured via config.placeholder.
 */
export const WithPlaceholder: Story = {
  args: {
    config: {
      placeholder: 'Ask anything about your codebase...',
    },
  },
};

/**
 * Disabled state.
 *
 * When disabled=true, the contentEditable is set to false,
 * the input gets reduced opacity and a not-allowed cursor,
 * and the submit button is disabled. All keyboard shortcuts
 * are suppressed.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    config: {
      placeholder: 'Input is disabled',
    },
  },
};

/**
 * Submitting state.
 *
 * When isSubmitting=true, the input is effectively disabled and
 * the submit button shows a spinning Loader2 icon instead of the
 * ArrowUp icon. This prevents duplicate submissions.
 *
 * data-submitting="true" is set on the container for external styling.
 */
export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};

/**
 * Character count and max length.
 *
 * When config.showCharacterCount is true, a counter appears below
 * the input showing "N / maxLength". When the count exceeds maxLength,
 * the counter turns red (text-error) and the submit button is disabled.
 *
 * Type to see the counter update in real time.
 */
export const WithCharacterCount: Story = {
  args: {
    config: {
      showCharacterCount: true,
      maxLength: 280,
      placeholder: 'Keep it under 280 characters...',
    },
  },
  parameters: {
    docs: {
      description: {
        story: `Character count is displayed below the input in a muted font.
        When maxLength is exceeded, the count turns red and submission is blocked.
        The count tracks the plain text length (no HTML).`,
      },
    },
  },
};

/**
 * Minimal configuration — no submit button.
 *
 * When showSubmitButton is false, the send button is hidden entirely.
 * Users must press Enter to submit. Useful when embedding the input
 * inside a larger form or when submit is handled externally.
 */
export const MinimalConfig: Story = {
  args: {
    showSubmitButton: false,
    config: {
      placeholder: 'Press Enter to submit...',
      minHeight: 44,
      maxHeight: 120,
    },
  },
};

/**
 * Controlled usage via ref handle.
 *
 * Demonstrates the imperative ChatInputBaseHandle API:
 * - focus() — programmatically focus the input
 * - clear() — clear all content
 * - setValue(value) — set text from a string or InputValue
 * - getValue() — read the current InputValue
 * - insertText(text) — insert text at cursor position
 *
 * Click the control buttons below the input to exercise the API.
 */
export const Controlled: Story = {
  render: (args) => {
    const ref = useRef<ChatInputBaseHandle>(null);

    const handleFocus = useCallback(() => {
      ref.current?.focus();
    }, []);

    const handleClear = useCallback(() => {
      ref.current?.clear();
    }, []);

    const handleSetValue = useCallback(() => {
      ref.current?.setValue('Hello, this was set programmatically!');
    }, []);

    const handleInsertText = useCallback(() => {
      ref.current?.insertText(' [inserted] ');
    }, []);

    const handleGetValue = useCallback(() => {
      const value = ref.current?.getValue();
      // eslint-disable-next-line no-alert
      alert(JSON.stringify(value, null, 2));
    }, []);

    return (
      <div className="flex flex-col gap-4">
        <ChatInputBase
          ref={ref}
          {...args}
          config={{ placeholder: 'Use the buttons below to control this input...' }}
        />
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleFocus}
            className="px-3 py-1.5 text-xs font-medium bg-surface-interactive text-foreground-secondary border border-border-muted rounded-lg hover:bg-surface-hover cursor-pointer"
          >
            focus()
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-medium bg-surface-interactive text-foreground-secondary border border-border-muted rounded-lg hover:bg-surface-hover cursor-pointer"
          >
            clear()
          </button>
          <button
            type="button"
            onClick={handleSetValue}
            className="px-3 py-1.5 text-xs font-medium bg-surface-interactive text-foreground-secondary border border-border-muted rounded-lg hover:bg-surface-hover cursor-pointer"
          >
            setValue(&quot;Hello...&quot;)
          </button>
          <button
            type="button"
            onClick={handleInsertText}
            className="px-3 py-1.5 text-xs font-medium bg-surface-interactive text-foreground-secondary border border-border-muted rounded-lg hover:bg-surface-hover cursor-pointer"
          >
            insertText(&quot;[inserted]&quot;)
          </button>
          <button
            type="button"
            onClick={handleGetValue}
            className="px-3 py-1.5 text-xs font-medium bg-surface-interactive text-foreground-secondary border border-border-muted rounded-lg hover:bg-surface-hover cursor-pointer"
          >
            getValue()
          </button>
        </div>
      </div>
    );
  },
  args: {
    onChange: fn(),
    onSubmit: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: `The ChatInputBaseHandle ref exposes an imperative API for programmatic control.
        This is useful for:
        - Auto-focusing on mount or route change
        - Clearing after submission
        - Pre-filling from templates or drafts
        - Inserting text at cursor (e.g., from a palette selection)
        - Reading the current value without onChange tracking`,
      },
    },
  },
};
