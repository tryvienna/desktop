// TypewriterText Stories — Streaming text animation
//
// Word-by-word reveal at the leaf of: Chat -> MessageList -> ChatMessage -> TypewriterText.
// Activates only for assistant messages during live streaming (not history replay).
// Uses requestAnimationFrame with variable timing (300ms sentence pause, 120ms clause, 20ms code).
// Tokenization in useMemo, animation state in refs, only visibleCount triggers re-renders.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TypewriterText } from './typewriter-text';

const meta: Meta<typeof TypewriterText> = {
  title: 'Streaming/typewriter-text',
  component: TypewriterText,
  tags: ['autodocs'],
  args: {
    onContentGrow: fn(),
    onAnimationComplete: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[700px] min-h-[100px] whitespace-pre-wrap text-foreground">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TypewriterText>;

/** Short response — animates through quickly */
export const ShortText: Story = {
  args: {
    text: "I'll help you with that. Let me check the code.",
    isStreaming: false,
  },
};

/** Long response with paragraphs — shows paragraph pauses */
export const LongWithParagraphs: Story = {
  args: {
    text: `Here's my analysis of the code structure.

The main module exports three functions: createStore, connectEventSource, and registerDefaultRenderers. Each serves a distinct purpose in the architecture.

The createStore function initializes a Zustand vanilla store with the chat state shape. It uses the vanilla API (not React-specific) so it can be used in tests without a React environment.

The connectEventSource function bridges IPC events to the store. It handles event coalescing for text_deltas to reduce re-renders during streaming.`,
    isStreaming: false,
  },
  parameters: {
    docs: {
      description: {
        story: `Note the pauses at sentence endings (periods) and paragraph
        breaks (double newlines). This creates a natural reading rhythm.`,
      },
    },
  },
};

/** Code block — uses flat timing (no variable delays) */
export const CodeBlock: Story = {
  args: {
    text: `Here's the implementation:

\`\`\`typescript
export function createChatStore() {
  return createStore<ChatStore>((set, get) => ({
    messages: new Map(),
    messageOrder: [],
    processEvent: (event) => {
      set((state) => applyEvent(state, event));
    },
  }));
}
\`\`\`

This creates a new store instance each time it's called.`,
    isStreaming: false,
  },
  parameters: {
    docs: {
      description: {
        story: `Code blocks (between \\\`\\\`\\\`) use flat 20ms timing
        per token instead of variable delays. This makes code appear
        faster, matching the expectation that code is "typed" not "spoken".`,
      },
    },
  },
};

/** Actively streaming — cursor shown, text still arriving */
export const ActivelyStreaming: Story = {
  args: {
    text: "I'm looking at the implementation now. The function takes a",
    isStreaming: true,
  },
  parameters: {
    docs: {
      description: {
        story: `When isStreaming=true and all visible tokens have been
        shown, a blinking cursor appears to indicate more text is coming.
        The animation loop stays active, waiting for new tokens.`,
      },
    },
  },
};

/** Disabled animation — shows all text immediately (used for history) */
export const Disabled: Story = {
  args: {
    text: 'This text appears immediately with no animation. Used for history replay messages where the user has already seen the content.',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: `When disabled=true or prefers-reduced-motion is enabled,
        all text appears immediately. This is used for:
        - History replay (isFromHistory=true messages)
        - Accessibility (reduced motion preference)
        - Fast-forward mode (user pressed skip)`,
      },
    },
  },
};

/** Faster speed multiplier */
export const FastSpeed: Story = {
  args: {
    text: 'This text animates at 2x speed. Useful when the user wants faster output.',
    isStreaming: false,
    speedMultiplier: 2,
  },
};
