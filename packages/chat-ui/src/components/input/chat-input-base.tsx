/**
 * ChatInputBase — Foundation ContentEditable input component
 *
 * @ai-context
 * - Base layer that ChatInputUnified builds upon
 * - ContentEditable div with dynamic min/max height expansion
 * - Exposes focus/clear/setValue/getValue/insertText via forwardRef handle
 * - Optional character counter, submit button, and loading spinner
 * - Keyboard: Enter to submit, cursor position tracking for autocomplete
 * - data-slot="chat-input-base"
 *
 * @example
 * <ChatInputBase config={{ placeholder: 'Type...' }} onSubmit={handleSubmit} />
 */

import React, { memo, useCallback, forwardRef, useImperativeHandle } from 'react';

import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@tryvienna/ui';
import { useContentEditable } from '../../hooks/use-content-editable';
import { useCursorPosition } from '../../hooks/use-cursor-position';
import type { InputValue, InputConfig } from '../../types/input';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ChatInputBaseProps {
  /** Configuration */
  config?: InputConfig;
  /** Callback when value changes */
  onChange?: (value: InputValue) => void;
  /** Callback when user submits (Enter without Shift) */
  onSubmit?: (value: InputValue) => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether input is in submitting state */
  isSubmitting?: boolean;
  /** Additional className */
  className?: string;
  /** Additional style */
  style?: React.CSSProperties;
  /** Show submit button */
  showSubmitButton?: boolean;
  /** Submit button label */
  submitButtonLabel?: string;
}

// ---------------------------------------------------------------------------
// Handle API (for programmatic control)
// ---------------------------------------------------------------------------

export interface ChatInputBaseHandle {
  /** Focus the input */
  focus: () => void;
  /** Clear the input */
  clear: () => void;
  /** Set value programmatically */
  setValue: (value: string | InputValue) => void;
  /** Get current value */
  getValue: () => InputValue;
  /** Insert text at cursor */
  insertText: (text: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChatInputBase = memo(
  forwardRef<ChatInputBaseHandle, ChatInputBaseProps>(function ChatInputBase(
    {
      config = {},
      onChange,
      onSubmit,
      disabled = false,
      isSubmitting = false,
      className,
      style,
      showSubmitButton = true,
      submitButtonLabel = 'Send',
    },
    forwardedRef
  ) {
    const {
      minHeight = 60,
      maxHeight = 200,
      showCharacterCount = false,
      maxLength,
      placeholder = 'Type a message...',
      autoFocus = false,
    } = config;

    const isDisabled = disabled || isSubmitting;

    // ContentEditable hook
    const {
      ref: contentEditableRef,
      value,
      isEmpty,
      characterCount,
      clear,
      setValue,
      focus,
      insertText,
      handleInput,
      handleKeyDown,
      handlePaste,
    } = useContentEditable({
      onChange,
      onSubmit,
      disabled: isDisabled,
      autoFocus,
    });

    // Cursor position tracking (for future autocomplete use)
    useCursorPosition({
      elementRef: contentEditableRef,
      enabled: true,
    });

    // Expose handle API
    useImperativeHandle(
      forwardedRef,
      () => ({
        focus,
        clear,
        setValue,
        getValue: () => value,
        insertText,
      }),
      [focus, clear, setValue, value, insertText]
    );

    // Handle submit button click
    const handleSubmitClick = useCallback(() => {
      if (isDisabled || isEmpty) return;
      onSubmit?.(value);
      clear();
    }, [isDisabled, isEmpty, onSubmit, value, clear]);

    // Check max length
    const isOverMaxLength = maxLength !== undefined && characterCount > maxLength;
    const canSubmit = !isDisabled && !isEmpty && !isOverMaxLength;

    return (
      <div
        className={cn('flex flex-col gap-1', className)}
        style={style}
        data-slot="chat-input-base"
        data-disabled={isDisabled}
        data-submitting={isSubmitting}
      >
        {/* Main Container (border, background, padding) */}
        <div
          className={cn(
            'flex items-end gap-2 p-3',
            'bg-surface-page border border-border-default rounded-xl',
            'transition-colors focus-within:border-ai'
          )}
        >
          {/* Input Area */}
          <div className="flex-1 relative overflow-hidden">
            {/* ContentEditable */}
            <div
              ref={contentEditableRef}
              contentEditable={!isDisabled}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className={cn(
                'w-full py-1 text-sm leading-relaxed font-inherit',
                'overflow-y-auto outline-none bg-transparent text-foreground',
                'whitespace-pre-wrap break-words',
                isEmpty &&
                  'before:content-[attr(data-placeholder)] before:text-muted-foreground before:pointer-events-none before:absolute',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{
                minHeight: `${minHeight - 24}px`,
                maxHeight: `${maxHeight - 24}px`,
              }}
              data-placeholder={isEmpty ? placeholder : undefined}
              role="textbox"
              aria-label="Message input"
              aria-multiline="true"
              aria-disabled={isDisabled}
            />
          </div>

          {/* Submit Button (inside container, on right) */}
          {showSubmitButton && (
            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={!canSubmit}
              className={cn(
                'shrink-0 flex items-center justify-center w-8 h-8 p-0',
                'bg-surface-hover text-foreground-secondary border-none rounded-lg cursor-pointer',
                'transition-[background-color,opacity] duration-150',
                'hover:enabled:bg-surface-active',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label={submitButtonLabel}
              title={submitButtonLabel}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-label="Submitting..." />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Character Counter (below input) */}
        {showCharacterCount && (
          <div
            className={cn('ml-3 text-xs text-muted-foreground', isOverMaxLength && 'text-error')}
          >
            {characterCount}
            {maxLength !== undefined && ` / ${maxLength}`}
          </div>
        )}
      </div>
    );
  })
);
