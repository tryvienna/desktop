// Message Stories — Individual chat message rendering
//
// Roles: user (right-aligned blue), assistant (left-aligned full-width), system (centered muted).
// Content blocks: text, thinking (collapsible), tool_use (delegates to registry), system_event.
// Data flow: Store -> MessageList -> ChatMessage -> [role renderer] -> [content block renderer].
// The toolRenderer prop maps ToolUse -> ReactNode, decoupling from specific tool components.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ChatMessage } from './message';
import { ToolOutput } from './tools/tool-output';

const meta: Meta<typeof ChatMessage> = {
  title: 'Chat/message',
  component: ChatMessage,
  tags: ['autodocs'],
  args: {
    onApprove: fn(),
    onDeny: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl mx-auto p-4 text-foreground">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatMessage>;

// ─── Helper: Simple tool renderer for stories ────────────────────────────

function storyToolRenderer(toolUse: {
  id: string;
  name: string;
  status: string;
  result?: { output?: string; error?: string };
}) {
  return (
    <ToolOutput
      id={toolUse.id}
      toolName={toolUse.name}
      description={toolUse.name}
      status={toolUse.status as 'pending' | 'running' | 'complete' | 'error' | 'pending_permission'}
      error={toolUse.result?.error}
    >
      {toolUse.result?.output && (
        <pre className="p-3 text-xs text-foreground-secondary">{toolUse.result.output}</pre>
      )}
    </ToolOutput>
  );
}

// ─── User Messages ────────────────────────────────────────────────────────

/** User message — right-aligned blue bubble */
export const UserMessage: Story = {
  args: {
    message: {
      id: 'msg-user-1',
      role: 'user',
      content: [{ type: 'text', text: 'Can you help me refactor the authentication module?' }],
      timestamp: Date.now(),
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [],
    },
  },
};

/** Long user message with code */
export const UserMessageWithCode: Story = {
  args: {
    message: {
      id: 'msg-user-2',
      role: 'user',
      content: [
        {
          type: 'text',
          text: "I'm seeing this error when I run the tests:\n\n```\nTypeError: Cannot read property 'id' of undefined\n  at processEvent (store.ts:145)\n  at Object.<anonymous> (store.test.ts:23)\n```\n\nCan you help debug this?",
        },
      ],
      timestamp: Date.now(),
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [],
    },
  },
};

/** User message with an image attachment — shows preview card + L-shaped connector */
export const UserMessageWithImageAttachment: Story = {
  args: {
    message: {
      id: 'msg-user-img-1',
      role: 'user',
      content: [
        {
          type: 'image_attachment',
          name: 'screenshot.png',
          mimeType: 'image/png',
          size: 245_760,
          previewUrl:
            'data:image/svg+xml;base64,' +
            btoa(
              '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e2e8f0"/><text x="200" y="150" text-anchor="middle" fill="#64748b" font-family="system-ui" font-size="16">Screenshot Preview</text></svg>',
            ),
        },
        { type: 'text', text: 'Here is the bug I was talking about — see the error in the top right corner.' },
      ],
      timestamp: 1709827200000,
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [],
    },
  },
};

/** Image attachment with no accompanying text */
export const UserMessageImageOnly: Story = {
  args: {
    message: {
      id: 'msg-user-img-2',
      role: 'user',
      content: [
        {
          type: 'image_attachment',
          name: 'design-mockup.jpg',
          mimeType: 'image/jpeg',
          size: 1_048_576,
          previewUrl:
            'data:image/svg+xml;base64,' +
            btoa(
              '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#dbeafe"/><text x="300" y="200" text-anchor="middle" fill="#3b82f6" font-family="system-ui" font-size="18">Design Mockup</text></svg>',
            ),
        },
      ],
      timestamp: 1709827200000,
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [],
    },
  },
};

/** Multiple image attachments on one message */
export const UserMessageMultipleImages: Story = {
  args: {
    message: {
      id: 'msg-user-img-3',
      role: 'user',
      content: [
        {
          type: 'image_attachment',
          name: 'before.png',
          mimeType: 'image/png',
          size: 102_400,
          previewUrl:
            'data:image/svg+xml;base64,' +
            btoa(
              '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#fecaca"/><text x="150" y="100" text-anchor="middle" fill="#dc2626" font-family="system-ui" font-size="16">Before</text></svg>',
            ),
        },
        {
          type: 'image_attachment',
          name: 'after.png',
          mimeType: 'image/png',
          size: 98_304,
          previewUrl:
            'data:image/svg+xml;base64,' +
            btoa(
              '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#bbf7d0"/><text x="150" y="100" text-anchor="middle" fill="#16a34a" font-family="system-ui" font-size="16">After</text></svg>',
            ),
        },
        { type: 'text', text: 'Before and after the CSS fix. Looks much better now!' },
      ],
      timestamp: 1709827200000,
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [],
    },
  },
};

// ─── Assistant Messages ───────────────────────────────────────────────────

/** Simple text response */
export const AssistantTextOnly: Story = {
  args: {
    message: {
      id: 'msg-asst-1',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: "I'll help you refactor the authentication module. Let me first look at the current implementation to understand the structure.",
        },
      ],
      timestamp: Date.now(),
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [],
      isFromHistory: true,
    },
  },
};

/**
 * Assistant message with thinking block.
 * Thinking is shown in a collapsible <details> element.
 */
export const AssistantWithThinking: Story = {
  args: {
    message: {
      id: 'msg-asst-2',
      role: 'assistant',
      content: [
        {
          type: 'thinking',
          text: 'The user wants to refactor the auth module. I should first read the existing code to understand the structure. Key files would be auth.ts, middleware.ts, and the session store.',
        },
        {
          type: 'text',
          text: 'Let me start by reading the current authentication implementation.',
        },
      ],
      timestamp: Date.now(),
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [],
      isFromHistory: true,
    },
  },
  parameters: {
    docs: {
      description: {
        story: `Thinking blocks appear when the AI model uses extended thinking.
        They're rendered inside a collapsible \`<details>\` element so
        users can optionally inspect the model's reasoning process.`,
      },
    },
  },
};

/**
 * Assistant message with tool use blocks.
 * Shows the interleaved text + tool execution pattern.
 */
export const AssistantWithTools: Story = {
  args: {
    message: {
      id: 'msg-asst-3',
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me read the authentication module.' },
        { type: 'tool_use', toolUseId: 'tool-read-1' },
        {
          type: 'text',
          text: 'I can see the issue. The session validation is missing null checks. Let me fix that.',
        },
        { type: 'tool_use', toolUseId: 'tool-edit-1' },
      ],
      timestamp: Date.now(),
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [
        {
          id: 'tool-read-1',
          name: 'Read',
          input: { file_path: '/src/auth/session.ts' },
          status: 'complete',
          result: {
            success: true,
            output: 'export function validateSession(token: string) { ... }',
          },
        },
        {
          id: 'tool-edit-1',
          name: 'Edit',
          input: { file_path: '/src/auth/session.ts' },
          status: 'complete',
          result: { success: true },
        },
      ],
      isFromHistory: true,
    },
    toolRenderer: storyToolRenderer,
  },
  parameters: {
    docs: {
      description: {
        story: `This shows the most common pattern: text and tool_use blocks
        interleaved. Each tool_use block references a ToolUse by its toolUseId.
        The toolRenderer prop maps ToolUse objects to their rendered components.`,
      },
    },
  },
};

/**
 * Currently streaming assistant message.
 * Shows TypewriterText animation (if not from history).
 */
export const AssistantStreaming: Story = {
  args: {
    message: {
      id: 'msg-asst-4',
      role: 'assistant',
      content: [
        { type: 'text', text: "I'm analyzing the code structure to find the best approach for" },
      ],
      timestamp: Date.now(),
      status: 'streaming',
      isStreaming: true,
      isThinking: false,
      toolUses: [],
    },
  },
  parameters: {
    docs: {
      description: {
        story: `During streaming, isStreaming=true triggers TypewriterText
        animation. The text grows as text_delta events arrive from the
        provider. The animation catches up to the current text position.`,
      },
    },
  },
};

/** Thinking indicator (no content yet) */
export const AssistantThinking: Story = {
  args: {
    message: {
      id: 'msg-asst-5',
      role: 'assistant',
      content: [],
      timestamp: Date.now(),
      status: 'streaming',
      isStreaming: true,
      isThinking: true,
      toolUses: [],
    },
  },
};

// ─── System Messages ──────────────────────────────────────────────────────

/** Model change event */
export const SystemModelChange: Story = {
  args: {
    message: {
      id: 'msg-sys-1',
      role: 'system',
      content: [
        {
          type: 'system_event',
          eventType: 'model_change',
          data: {
            type: 'model_change',
            fromModel: 'claude-sonnet-4-6',
            toModel: 'claude-opus-4-6',
          },
        },
      ],
      timestamp: Date.now(),
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [],
    },
  },
  parameters: {
    docs: {
      description: {
        story: `System messages are app-injected events that flow through
        the same pipeline as provider events. They create system role messages
        with system_event content blocks. The event type determines the widget.`,
      },
    },
  },
};

/** Interrupted event */
export const SystemInterrupted: Story = {
  args: {
    message: {
      id: 'msg-sys-2',
      role: 'system',
      content: [
        {
          type: 'system_event',
          eventType: 'interrupted',
          data: { type: 'interrupted', timestamp: Date.now() },
        },
      ],
      timestamp: Date.now(),
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [],
    },
  },
};

/** Entity link event */
export const SystemEntityLink: Story = {
  args: {
    message: {
      id: 'msg-sys-3',
      role: 'system',
      content: [
        {
          type: 'system_event',
          eventType: 'entity_link',
          data: {
            type: 'entity_link',
            action: 'linked',
            entityUri: '@vienna//github_pr/owner/repo/42',
            entityType: 'github_pr',
            entityTitle: 'PR #42: Fix auth bug',
          },
        },
      ],
      timestamp: Date.now(),
      status: 'complete',
      isStreaming: false,
      isThinking: false,
      toolUses: [],
    },
  },
};
