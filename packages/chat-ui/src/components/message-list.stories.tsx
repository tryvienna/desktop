// MessageList Stories — Message rendering, FreshCanvas spacer, auto-scroll
//
// MessageList manages:
// - Dynamic spacer (FreshCanvas: keeps new user message at top)
// - ResizeObserver-based auto-scroll during streaming
// - Wheel event detection to disable auto-scroll
// - ProcessingIndicator while waiting for assistant response

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useState, useCallback } from 'react';
import { MessageList } from './message-list';
import type { Message, MessageGroup } from '../types/messages';
import { ToolOutput } from './tools/tool-output';

// ─── Test data ──────────────────────────────────────────────────────────────

const now = Date.now();

function makeUserMessage(id: string, text: string, ts = now): Message {
  return {
    id,
    role: 'user',
    content: [{ type: 'text', text }],
    timestamp: ts,
    status: 'complete',
    isStreaming: false,
    isThinking: false,
    toolUses: [],
  };
}

function makeAssistantMessage(id: string, text: string, opts: Partial<Message> = {}): Message {
  return {
    id,
    role: 'assistant',
    content: [{ type: 'text', text }],
    timestamp: now,
    status: 'complete',
    isStreaming: false,
    isThinking: false,
    toolUses: [],
    isFromHistory: true,
    ...opts,
  };
}

function makeGroups(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let current: MessageGroup | null = null;
  for (const msg of messages) {
    if (!current || current.role !== msg.role) {
      current = {
        id: `group-${msg.id}`,
        role: msg.role,
        messageIds: [msg.id],
        timestamp: msg.timestamp,
      };
      groups.push(current);
    } else {
      current.messageIds.push(msg.id);
    }
  }
  return groups;
}

function simpleToolRenderer(toolUse: {
  id: string;
  name: string;
  status: string;
  input: Record<string, unknown>;
  result?: { output?: string };
}) {
  return (
    <ToolOutput
      id={toolUse.id}
      toolName={toolUse.name}
      description={String(toolUse.input.file_path ?? toolUse.name)}
      status={toolUse.status as 'pending' | 'running' | 'complete' | 'error'}
    >
      {toolUse.result?.output && (
        <pre className="p-3 text-xs text-foreground-secondary">{toolUse.result.output}</pre>
      )}
    </ToolOutput>
  );
}

// ─── Fixtures ──────────────────────────────────────────────────────────────

const singleTurnMessages = [
  makeUserMessage('u1', 'How do I set up TypeScript with Node.js?'),
  makeAssistantMessage(
    'a1',
    "Here's how to set up TypeScript with Node.js:\n\n1. Initialize a new project: `npm init -y`\n2. Install TypeScript: `npm install -D typescript @types/node`\n3. Create tsconfig.json: `npx tsc --init`\n4. Set up your entry point in `src/index.ts`"
  ),
];

const multiTurnMessages = [
  makeUserMessage('u1', 'What is event sourcing?'),
  makeAssistantMessage(
    'a1',
    'Event sourcing is an architectural pattern where state changes are stored as a sequence of events. Instead of storing just the current state, you store every event that led to the current state. This gives you a complete audit trail and the ability to rebuild state at any point in time.'
  ),
  makeUserMessage('u2', 'Can you give me a code example?'),
  makeAssistantMessage(
    'a2',
    'Here\'s a simple event sourcing example:\n\n```typescript\ntype Event = \n  | { type: "item_added"; item: string }\n  | { type: "item_removed"; item: string };\n\nfunction reduce(state: string[], event: Event): string[] {\n  switch (event.type) {\n    case "item_added": return [...state, event.item];\n    case "item_removed": return state.filter(i => i !== event.item);\n  }\n}\n\nconst events: Event[] = [\n  { type: "item_added", item: "apple" },\n  { type: "item_added", item: "banana" },\n  { type: "item_removed", item: "apple" },\n];\n\nconst state = events.reduce(reduce, []);\n// state = ["banana"]\n```'
  ),
];

const longConversation = [
  makeUserMessage('u1', 'Help me set up a React project'),
  makeAssistantMessage(
    'a1',
    "I'll help you set up a React project. Let me start by looking at your current setup."
  ),
  makeUserMessage('u2', 'I want to use Vite as the bundler'),
  makeAssistantMessage(
    'a2',
    "Great choice! Vite is fast and has excellent React support. Here's what we need to do:\n\n1. Create the project with `npm create vite@latest`\n2. Choose the React + TypeScript template\n3. Install dependencies with `npm install`\n4. Configure ESLint and Prettier"
  ),
  makeUserMessage('u3', 'Also add Tailwind CSS'),
  makeAssistantMessage(
    'a3',
    "Sure, let me add Tailwind CSS to the project. We'll need:\n- `tailwindcss` package\n- `@tailwindcss/vite` plugin\n- A `tailwind.config.ts` file\n- Import in the main CSS file"
  ),
  makeUserMessage('u4', 'What about testing?'),
  makeAssistantMessage(
    'a4',
    'For testing with Vite + React, I recommend Vitest:\n\n```bash\nnpm install -D vitest @testing-library/react @testing-library/jest-dom jsdom\n```\n\nThen configure in `vite.config.ts`:\n```typescript\nexport default defineConfig({\n  test: {\n    environment: "jsdom",\n    globals: true,\n  },\n});\n```'
  ),
];

// ─── Meta ──────────────────────────────────────────────────────────────────

const meta: Meta<typeof MessageList> = {
  title: 'Chat/message-list',
  component: MessageList,
  tags: ['autodocs'],
  args: {
    onApprove: fn(),
    onDeny: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-[500px] w-[800px] overflow-hidden border border-border-default rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageList>;

// ─── Stories ───────────────────────────────────────────────────────────────

/** Empty chat — just the spacer fills the viewport */
export const Empty: Story = {
  args: {
    messages: [],
    messageGroups: [],
    isStreaming: false,
  },
};

/** Single turn conversation */
export const SingleTurn: Story = {
  args: {
    messages: singleTurnMessages,
    messageGroups: makeGroups(singleTurnMessages),
    isStreaming: false,
  },
};

/** Multi-turn conversation */
export const MultiTurn: Story = {
  args: {
    messages: multiTurnMessages,
    messageGroups: makeGroups(multiTurnMessages),
    isStreaming: false,
  },
};

/** Long conversation with scrolling */
export const LongConversation: Story = {
  args: {
    messages: longConversation,
    messageGroups: makeGroups(longConversation),
    isStreaming: false,
  },
};

/** Preparing response — shows typing indicator */
export const PreparingResponse: Story = {
  args: {
    messages: [makeUserMessage('u1', 'Explain how WebSockets work')],
    messageGroups: makeGroups([makeUserMessage('u1', 'Explain how WebSockets work')]),
    isStreaming: false,
    isPreparingResponse: true,
  },
};

/** Streaming response (assistant is currently responding) */
export const StreamingResponse: Story = {
  args: {
    messages: [
      makeUserMessage('u1', 'Tell me about Rust'),
      makeAssistantMessage(
        'a1',
        'Rust is a systems programming language that emphasizes safety, concurrency, and performance. It achieves memory safety without garbage collection through its ownership system',
        {
          status: 'streaming',
          isStreaming: true,
          isFromHistory: false,
        }
      ),
    ],
    messageGroups: makeGroups([
      makeUserMessage('u1', 'Tell me about Rust'),
      makeAssistantMessage('a1', 'Rust is a systems programming language...'),
    ]),
    isStreaming: true,
  },
};

/** With tool execution */
export const WithTools: Story = {
  args: {
    messages: [
      makeUserMessage('u1', 'Read the package.json file'),
      {
        ...makeAssistantMessage('a1', 'Let me read that file for you.'),
        content: [
          { type: 'text' as const, text: 'Let me read that file for you.' },
          { type: 'tool_use' as const, toolUseId: 'tool-1' },
          {
            type: 'text' as const,
            text: '\n\nHere\'s the package.json content. The project is named "@vienna/chat-ui" at version 0.0.1.',
          },
        ],
        toolUses: [
          {
            id: 'tool-1',
            name: 'Read',
            input: { file_path: 'package.json' },
            status: 'complete' as const,
            result: { success: true, output: '{ "name": "@vienna/chat-ui", "version": "0.0.1" }' },
          },
        ],
      },
    ],
    messageGroups: makeGroups([
      makeUserMessage('u1', 'Read the package.json file'),
      makeAssistantMessage('a1', ''),
    ]),
    isStreaming: false,
    toolRenderer: simpleToolRenderer,
  },
};

/**
 * FreshCanvas simulation — Interactive demo.
 * Click "Add user message" to see the spacer push the new turn to the top.
 * Click "Add response" to see the spacer shrink as the assistant responds.
 */
export const FreshCanvasDemo: Story = {
  render: function FreshCanvasRender() {
    const [messages, setMessages] = useState<Message[]>([
      makeUserMessage('u1', 'Hello!'),
      makeAssistantMessage('a1', 'Hi! How can I help you today?'),
    ]);
    const [isPreparing, setIsPreparing] = useState(false);

    const addUserMessage = useCallback(() => {
      const id = `u${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        makeUserMessage(
          id,
          `Follow-up question #${prev.filter((m) => m.role === 'user').length + 1}`
        ),
      ]);
      setIsPreparing(true);
    }, []);

    const addResponse = useCallback(() => {
      const id = `a${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        makeAssistantMessage(
          id,
          'Here is the response to your question. The FreshCanvas spacer should have shrunk as this content appeared, keeping the conversation flow natural.'
        ),
      ]);
      setIsPreparing(false);
    }, []);

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            messageGroups={makeGroups(messages)}
            isStreaming={false}
            isPreparingResponse={isPreparing}
          />
        </div>
        <div className="flex gap-2 p-2 border-t border-border-default">
          <button
            onClick={addUserMessage}
            className="px-3 py-1 text-xs text-white rounded-md border-none cursor-pointer bg-button-ai"
          >
            Add user message
          </button>
          <button
            onClick={addResponse}
            disabled={!isPreparing}
            className={`px-3 py-1 text-xs rounded-md border border-border-default ${
              isPreparing
                ? 'bg-surface-hover text-foreground cursor-pointer'
                : 'bg-surface-sunken text-muted-foreground cursor-not-allowed'
            }`}
          >
            Add response
          </button>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: `Interactive FreshCanvas demonstration. When a user message is added,
        the spacer pushes it to the top of the viewport. The typing indicator
        appears below. When the response arrives, the spacer shrinks as content fills.`,
      },
    },
  },
};
