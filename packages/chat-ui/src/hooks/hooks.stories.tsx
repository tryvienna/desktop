/**
 * Hook Storybooks
 *
 * Comprehensive interactive documentation for all chat-ui hooks.
 * Each story demonstrates hook behavior with visual state indicators.
 * Designed to be readable by both humans and AI systems.
 *
 * @module chat-ui/hooks/hooks.stories
 */

import React, { useState, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/test';

// Hooks
import { useReducedMotion } from './use-reduced-motion';
import { useRotatingPlaceholder } from './use-rotating-placeholder';
import { useMessageHistory } from './use-message-history';
import { useDraftPersistence } from './use-draft-persistence';
import { useAttachments } from './use-attachments';
import { useContentEditable } from './use-content-editable';
import { useCursorPosition } from './use-cursor-position';
import { useMentionAutocomplete } from './use-mention-autocomplete';
import { useCommandTrigger } from './use-command-trigger';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Styles
// ─────────────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  padding: 24,
  maxWidth: 600,
  color: '#e5e7eb',
};

const cardStyle: React.CSSProperties = {
  background: '#1f2937',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  border: '1px solid #374151',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#9ca3af',
  marginBottom: 4,
};

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  fontFamily: 'monospace',
  color: '#f9fafb',
};

const badgeStyle = (active: boolean): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 600,
  background: active ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
  color: active ? '#10b981' : '#6b7280',
  marginLeft: 8,
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 6,
  color: '#f9fafb',
  fontSize: 14,
  outline: 'none',
};

const buttonStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};

const contentEditableStyle: React.CSSProperties = {
  minHeight: 60,
  padding: '8px 12px',
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 6,
  color: '#f9fafb',
  fontSize: 14,
  outline: 'none',
  whiteSpace: 'pre-wrap' as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'Hooks',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# Chat UI Hooks

Comprehensive hook library for building rich chat interfaces.

## Categories

- **Accessibility**: \`useReducedMotion\` — respects user's motion preferences
- **Input Management**: \`useContentEditable\`, \`useCursorPosition\`, \`useMentionAutocomplete\`, \`useCommandTrigger\`, \`useAttachments\`
- **History & Persistence**: \`useMessageHistory\`, \`useDraftPersistence\`
- **UX**: \`useRotatingPlaceholder\`
- **Approval State**: \`useAllPendingApprovals\`, \`usePendingToolApprovals\`, \`usePendingQuestion\` (require ChatProvider)

## Usage Pattern

All hooks follow the options-object pattern:
\`\`\`tsx
const { value, isEmpty } = useContentEditable({
  onChange: (v) => console.log(v),
  onSubmit: (v) => sendMessage(v),
  autoFocus: true,
});
\`\`\`
        `,
      },
    },
  },
};

export default meta;

// ─────────────────────────────────────────────────────────────────────────────
// useReducedMotion
// ─────────────────────────────────────────────────────────────────────────────

function ReducedMotionDemo() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div style={containerStyle}>
      <h3 style={{ margin: '0 0 16px' }}>useReducedMotion</h3>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
        Detects the user's <code>prefers-reduced-motion</code> system preference. Returns{' '}
        <code>true</code> when the user prefers reduced motion. Toggle in your OS accessibility
        settings to see it change.
      </p>
      <div style={cardStyle}>
        <div style={labelStyle}>prefers-reduced-motion</div>
        <div style={valueStyle}>
          {String(prefersReducedMotion)}
          <span style={badgeStyle(!prefersReducedMotion)}>
            {prefersReducedMotion ? 'Reduced' : 'Full Motion'}
          </span>
        </div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Conditional animation example</div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: '#3b82f6',
            animation: prefersReducedMotion ? 'none' : 'pulse 2s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}

export const ReducedMotion: StoryObj = {
  render: () => <ReducedMotionDemo />,
  parameters: {
    docs: {
      description: {
        story: `
**useReducedMotion()** → \`boolean\`

Returns \`true\` if the user's system preferences indicate reduced motion.
Use this to conditionally disable animations and transitions.

\`\`\`tsx
const prefersReducedMotion = useReducedMotion();
const spring = prefersReducedMotion ? { duration: 0 } : SPRINGS.SNAPPY;
\`\`\`
        `,
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// useRotatingPlaceholder
// ─────────────────────────────────────────────────────────────────────────────

function RotatingPlaceholderDemo() {
  const [hasMessages, setHasMessages] = useState(false);
  const { placeholder, isTransitioning } = useRotatingPlaceholder({
    hasMessages,
    interval: 3000,
    fadeDuration: 200,
    hints: [
      'Type @ to mention entities',
      'Type / for commands',
      'Attach files with + button',
      'Ask me anything about your code',
    ],
  });

  return (
    <div style={containerStyle}>
      <h3 style={{ margin: '0 0 16px' }}>useRotatingPlaceholder</h3>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
        Cycles through educational hint texts with smooth fade transitions. The base placeholder
        changes based on whether messages exist.
      </p>
      <div style={cardStyle}>
        <div style={labelStyle}>Current Placeholder</div>
        <div
          style={{
            ...valueStyle,
            opacity: isTransitioning ? 0.3 : 1,
            transition: 'opacity 200ms ease',
          }}
        >
          "{placeholder}"
        </div>
        <div style={{ ...labelStyle, marginTop: 12 }}>
          isTransitioning: {String(isTransitioning)}
        </div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Simulated Input</div>
        <input style={{ ...inputStyle, color: '#6b7280' }} placeholder={placeholder} readOnly />
      </div>
      <div style={{ marginTop: 12 }}>
        <button style={buttonStyle} onClick={() => setHasMessages((v) => !v)}>
          Toggle hasMessages ({String(hasMessages)})
        </button>
      </div>
    </div>
  );
}

export const RotatingPlaceholder: StoryObj = {
  render: () => <RotatingPlaceholderDemo />,
  parameters: {
    docs: {
      description: {
        story: `
**useRotatingPlaceholder(options)** → \`{ placeholder, isTransitioning }\`

Cycles through hint texts on an interval with fade transitions.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`hints\` | \`string[]\` | Default hints | Texts to cycle through |
| \`basePlaceholder\` | \`string \\| ((hasMessages) => string)\` | Auto | Base text shown between hints |
| \`interval\` | \`number\` | 5000 | Cycle interval in ms |
| \`fadeDuration\` | \`number\` | 200 | Fade transition duration in ms |
| \`hasMessages\` | \`boolean\` | false | Changes base placeholder text |
| \`enabled\` | \`boolean\` | true | Enable/disable rotation |
        `,
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// useMessageHistory
// ─────────────────────────────────────────────────────────────────────────────

function MessageHistoryDemo() {
  const [inputValue, setInputValue] = useState('');
  const {
    addToHistory,
    navigatePrevious,
    navigateNext,
    clearHistory,
    isAtStart,
    isAtEnd,
    historySize,
  } = useMessageHistory({
    onRestore: (message) => setInputValue(message),
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigatePrevious();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateNext();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addToHistory(inputValue);
        setInputValue('');
      }
    }
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ margin: '0 0 16px' }}>useMessageHistory</h3>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
        Shell-style message history. Type messages and press Enter to add them. Use Arrow Up/Down to
        navigate history.
      </p>
      <div style={cardStyle}>
        <div style={labelStyle}>Input (Enter to send, Up/Down to navigate)</div>
        <input
          style={inputStyle}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message and press Enter..."
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <div style={labelStyle}>History Size</div>
          <div style={valueStyle}>{historySize}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>At Start</div>
          <div style={valueStyle}>{String(isAtStart)}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>At End</div>
          <div style={valueStyle}>{String(isAtEnd)}</div>
        </div>
      </div>
      <button style={{ ...buttonStyle, background: '#ef4444' }} onClick={clearHistory}>
        Clear History
      </button>
    </div>
  );
}

export const MessageHistory: StoryObj = {
  render: () => <MessageHistoryDemo />,
  parameters: {
    docs: {
      description: {
        story: `
**useMessageHistory(options)** → \`{ addToHistory, navigatePrevious, navigateNext, ... }\`

Manages sent message history with arrow key navigation (like shell history).
Prevents duplicate consecutive entries and supports configurable max size.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`maxHistorySize\` | \`number\` | 50 | Maximum stored messages |
| \`onRestore\` | \`(message: string) => void\` | — | Called when navigating history |
        `,
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// useDraftPersistence
// ─────────────────────────────────────────────────────────────────────────────

function DraftPersistenceDemo() {
  const [inputValue, setInputValue] = useState('');
  const { clearDraft, hasDraft } = useDraftPersistence({
    draftKey: 'storybook-draft-demo',
    value: inputValue,
    onRestore: (draft) => setInputValue(draft),
    debounceMs: 300,
  });

  return (
    <div style={containerStyle}>
      <h3 style={{ margin: '0 0 16px' }}>useDraftPersistence</h3>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
        Auto-saves draft to localStorage. Type something, reload the page, and the draft will be
        restored. Uses debounced saving to avoid excessive writes.
      </p>
      <div style={cardStyle}>
        <div style={labelStyle}>Input (auto-saved after 300ms)</div>
        <input
          style={inputStyle}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type something — it persists across reloads..."
        />
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Has Draft</div>
        <div style={valueStyle}>{String(hasDraft())}</div>
      </div>
      <button
        style={{ ...buttonStyle, background: '#ef4444' }}
        onClick={() => {
          clearDraft();
          setInputValue('');
        }}
      >
        Clear Draft
      </button>
    </div>
  );
}

export const DraftPersistence: StoryObj = {
  render: () => <DraftPersistenceDemo />,
  parameters: {
    docs: {
      description: {
        story: `
**useDraftPersistence(options)** → \`{ clearDraft, saveDraft, hasDraft }\`

Auto-saves draft input to localStorage and restores on mount.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`draftKey\` | \`string\` | — | **Required.** localStorage key |
| \`value\` | \`string\` | — | **Required.** Current input value |
| \`onRestore\` | \`(draft: string) => void\` | — | Called on mount with saved draft |
| \`debounceMs\` | \`number\` | 500 | Save debounce interval |
| \`enabled\` | \`boolean\` | true | Enable/disable persistence |
        `,
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// useAttachments
// ─────────────────────────────────────────────────────────────────────────────

function AttachmentsDemo() {
  const { attachments, addFiles, removeAttachment, clearAttachments, isAtMaxLimit, error } =
    useAttachments({
      maxAttachments: 5,
      maxFileSize: 5 * 1024 * 1024,
    });

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={containerStyle}>
      <h3 style={{ margin: '0 0 16px' }}>useAttachments</h3>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
        File attachment management with validation, preview generation, and size/type constraints.
      </p>
      <div style={cardStyle}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
          }}
        />
        <button
          style={{
            ...buttonStyle,
            opacity: isAtMaxLimit ? 0.5 : 1,
          }}
          onClick={() => fileInputRef.current?.click()}
          disabled={isAtMaxLimit}
        >
          Add Files ({attachments.length}/5)
        </button>
        {attachments.length > 0 && (
          <button
            style={{ ...buttonStyle, background: '#ef4444', marginLeft: 8 }}
            onClick={clearAttachments}
          >
            Clear All
          </button>
        )}
      </div>
      {error && (
        <div style={{ ...cardStyle, borderColor: '#ef4444' }}>
          <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
        </div>
      )}
      {attachments.map((att) => (
        <div key={att.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
          {att.previewUrl && (
            <img
              src={att.previewUrl}
              alt={att.name}
              style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
            />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#f9fafb' }}>{att.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>
              {(att.size / 1024).toFixed(1)} KB · {att.mimeType}
            </div>
          </div>
          <button
            style={{ ...buttonStyle, background: '#374151', padding: '4px 10px' }}
            onClick={() => removeAttachment(att.id)}
          >
            ×
          </button>
        </div>
      ))}
      <div style={cardStyle}>
        <div style={labelStyle}>State</div>
        <div style={valueStyle}>
          isAtMaxLimit: {String(isAtMaxLimit)} · count: {attachments.length}
        </div>
      </div>
    </div>
  );
}

export const Attachments: StoryObj = {
  render: () => <AttachmentsDemo />,
  parameters: {
    docs: {
      description: {
        story: `
**useAttachments(options)** → \`{ attachments, addFile, addFiles, removeAttachment, clearAttachments, isAtMaxLimit, error }\`

Manages file attachments with validation and image previews.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`maxAttachments\` | \`number\` | 10 | Maximum number of files |
| \`maxFileSize\` | \`number\` | 10MB | Max file size in bytes |
| \`allowedMimeTypes\` | \`string[]\` | — | Allowed MIME type patterns |
| \`onChange\` | \`(attachments) => void\` | — | Called when attachments change |
        `,
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// useContentEditable
// ─────────────────────────────────────────────────────────────────────────────

function ContentEditableDemo() {
  const { ref, value, isEmpty, characterCount, clear, handleInput, handleKeyDown, handlePaste } =
    useContentEditable({
      onSubmit: (v) => {
        action('Submitted')(v.plainText);
        clear();
      },
      autoFocus: true,
    });

  return (
    <div style={containerStyle}>
      <h3 style={{ margin: '0 0 16px' }}>useContentEditable</h3>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
        Full ContentEditable management with entity chips, paste blob support, and rich text
        editing. Enter to submit, Shift+Enter for newline. Paste large text (500+ chars) to see the
        paste chip collapse.
      </p>
      <div style={cardStyle}>
        <div style={labelStyle}>ContentEditable Input</div>
        <div
          ref={ref}
          contentEditable
          style={contentEditableStyle}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-placeholder="Type here..."
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <div style={labelStyle}>isEmpty</div>
          <div style={valueStyle}>{String(isEmpty)}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Characters</div>
          <div style={valueStyle}>{characterCount}</div>
        </div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Plain Text (with markup)</div>
        <pre style={{ ...valueStyle, whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
          {value.plainText || '(empty)'}
        </pre>
      </div>
      <button style={buttonStyle} onClick={clear}>
        Clear
      </button>
    </div>
  );
}

export const ContentEditable: StoryObj = {
  render: () => <ContentEditableDemo />,
  parameters: {
    docs: {
      description: {
        story: `
**useContentEditable(options)** → \`{ ref, value, isEmpty, characterCount, clear, setValue, focus, ... }\`

Full ContentEditable hook with support for:
- Entity chips (via \`insertEntity\` from useMentionAutocomplete)
- Paste blob chips (large pastes collapsed into teal chips)
- Programmatic value setting (with paste chip restoration)
- Enter/Escape keyboard handling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`onChange\` | \`(value: InputValue) => void\` | — | Called on content change |
| \`onSubmit\` | \`(value: InputValue) => void\` | — | Called on Enter (without Shift) |
| \`onEscape\` | \`() => void\` | — | Called on Escape |
| \`disabled\` | \`boolean\` | false | Disable input |
| \`autoFocus\` | \`boolean\` | false | Focus on mount |
| \`onFilePaste\` | \`(files: File[]) => void\` | — | Called when files are pasted |
| \`onPasteChipClick\` | \`(pasteId: string) => void\` | — | Called when paste chip is clicked |
        `,
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// useMentionAutocomplete + useCursorPosition
// ─────────────────────────────────────────────────────────────────────────────

function MentionAutocompleteDemo() {
  const editableRef = useRef<HTMLDivElement>(null);

  const { position } = useCursorPosition({ elementRef: editableRef });

  const { trigger, isActive, insertEntity, cancel } = useMentionAutocomplete({
    elementRef: editableRef,
    onEntityClick: action('Entity clicked'),
  });

  const mockEntities = [
    { id: 'ws-1', type: 'workstream', label: 'Chat UI Rebuild' },
    { id: 'pr-42', type: 'github_pr', label: 'Fix auth flow' },
    { id: 'issue-7', type: 'linear', label: 'Performance regression' },
    { id: 'ch-dev', type: 'slack', label: '#development' },
  ];

  const filteredEntities = trigger
    ? mockEntities.filter((e) => e.label.toLowerCase().includes(trigger.query.toLowerCase()))
    : [];

  return (
    <div style={containerStyle}>
      <h3 style={{ margin: '0 0 16px' }}>useMentionAutocomplete + useCursorPosition</h3>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
        Type <code>@</code> to trigger entity mention autocomplete. Select an entity to insert a
        colored chip.
      </p>
      <div style={cardStyle}>
        <div style={labelStyle}>ContentEditable (type @ to trigger)</div>
        <div ref={editableRef} contentEditable style={contentEditableStyle} />
      </div>
      {isActive && filteredEntities.length > 0 && (
        <div
          style={{
            ...cardStyle,
            background: '#111827',
            border: '1px solid #4b5563',
          }}
        >
          <div style={{ ...labelStyle, marginBottom: 8 }}>Autocomplete: "{trigger?.query}"</div>
          {filteredEntities.map((entity) => (
            <div
              key={entity.id}
              onClick={() => insertEntity(entity)}
              style={{
                padding: '6px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 12 }}>
                {entity.type === 'workstream'
                  ? '\u{1F4CA}'
                  : entity.type === 'github_pr'
                    ? '\u{1F419}'
                    : entity.type === 'linear'
                      ? '\u{1F4CB}'
                      : '\u{1F4AC}'}
              </span>
              <span>{entity.label}</span>
              <span style={{ color: '#6b7280', fontSize: 11 }}>{entity.type}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Trigger Active</div>
          <div style={valueStyle}>
            {String(isActive)}
            {isActive && <span style={badgeStyle(true)}>@{trigger?.query}</span>}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Cursor Position</div>
          <div style={valueStyle}>{position ? `offset: ${position.offset}` : 'null'}</div>
        </div>
      </div>
      {isActive && (
        <button style={{ ...buttonStyle, background: '#ef4444' }} onClick={cancel}>
          Cancel
        </button>
      )}
    </div>
  );
}

export const MentionAutocomplete: StoryObj = {
  render: () => <MentionAutocompleteDemo />,
  parameters: {
    docs: {
      description: {
        story: `
**useMentionAutocomplete(options)** → \`{ trigger, isActive, insertEntity, cancel }\`

Detects \`@\` mentions in ContentEditable and enables entity chip insertion.
Combine with **useCursorPosition** for popover positioning.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`elementRef\` | \`RefObject<HTMLDivElement>\` | — | **Required.** ContentEditable ref |
| \`triggerChar\` | \`string\` | '@' | Character that triggers autocomplete |
| \`onTrigger\` | \`(trigger) => void\` | — | Called when trigger state changes |
| \`enabled\` | \`boolean\` | true | Enable/disable detection |
| \`onEntityClick\` | \`(uri, type, id) => void\` | — | Called when an inserted chip is clicked |
        `,
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// useCommandTrigger
// ─────────────────────────────────────────────────────────────────────────────

function CommandTriggerDemo() {
  const editableRef = useRef<HTMLDivElement>(null);

  const {
    trigger,
    isActive,
    executeCommand,
    cancel: _cancel,
  } = useCommandTrigger({
    elementRef: editableRef,
  });

  const mockCommands = [
    { name: 'commit', description: 'Create a git commit' },
    { name: 'review-pr', description: 'Review a pull request' },
    { name: 'help', description: 'Show available commands' },
    { name: 'clear', description: 'Clear conversation' },
  ];

  const filteredCommands = trigger
    ? mockCommands.filter((c) => c.name.toLowerCase().includes(trigger.query.toLowerCase()))
    : [];

  return (
    <div style={containerStyle}>
      <h3 style={{ margin: '0 0 16px' }}>useCommandTrigger</h3>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
        Type <code>/</code> at the start of input to trigger command autocomplete. Select a command
        to replace the trigger text.
      </p>
      <div style={cardStyle}>
        <div style={labelStyle}>ContentEditable (type / to trigger)</div>
        <div ref={editableRef} contentEditable style={contentEditableStyle} />
      </div>
      {isActive && filteredCommands.length > 0 && (
        <div
          style={{
            ...cardStyle,
            background: '#111827',
            border: '1px solid #4b5563',
          }}
        >
          <div style={{ ...labelStyle, marginBottom: 8 }}>Commands: "{trigger?.query}"</div>
          {filteredCommands.map((cmd) => (
            <div
              key={cmd.name}
              onClick={() => executeCommand(`/${cmd.name} `)}
              style={{
                padding: '6px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: '#3b82f6' }}>/{cmd.name}</span>
              <span style={{ color: '#6b7280', marginLeft: 8, fontSize: 11 }}>
                {cmd.description}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={cardStyle}>
        <div style={labelStyle}>Trigger Active</div>
        <div style={valueStyle}>
          {String(isActive)}
          {isActive && <span style={badgeStyle(true)}>/{trigger?.query}</span>}
        </div>
      </div>
    </div>
  );
}

export const CommandTrigger: StoryObj = {
  render: () => <CommandTriggerDemo />,
  parameters: {
    docs: {
      description: {
        story: `
**useCommandTrigger(options)** → \`{ trigger, isActive, executeCommand, cancel }\`

Detects \`/\` slash commands. Similar to mention autocomplete but triggers only
at line start or after whitespace, and query cannot contain spaces.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`elementRef\` | \`RefObject<HTMLDivElement>\` | — | **Required.** ContentEditable ref |
| \`triggerChar\` | \`string\` | '/' | Trigger character |
| \`onTrigger\` | \`(trigger) => void\` | — | Called on trigger state change |
| \`enabled\` | \`boolean\` | true | Enable/disable |
        `,
      },
    },
  },
};
