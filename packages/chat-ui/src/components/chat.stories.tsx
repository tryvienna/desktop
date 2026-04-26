// Chat Stories — Full chat interface integration
//
// Chat is the top-level component: ChatProvider -> Chat -> MessageList + ChatInput.
// Data flow: User types -> IPC -> Provider -> IPC events -> store.processEvent -> re-render.
// These stories use a standalone store (no IPC) to demonstrate the UI.
//
// IMPORTANT: All stores are created at module scope to avoid infinite re-renders.
// Creating a store inside render() causes ChatProvider's useEffect to fire on
// every render (new store ref -> new deps -> state update -> re-render -> loop).

import React, { useRef, useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Chat } from './chat';
import { ChatProvider } from '../context/chat-context';
import { createChatStore, type ChatStore } from '../store/chat-store';
import type { AgentEvent } from '@vienna/agent-core';
import { ToolOutput } from './tools/tool-output';

// ─── Story helpers ────────────────────────────────────────────────────────

function simpleToolRenderer(toolUse: {
  id: string;
  name: string;
  status: string;
  input: Record<string, unknown>;
  result?: { output?: string; error?: string };
}) {
  const desc =
    (toolUse.input.command as string) ??
    (toolUse.input.file_path as string) ??
    (toolUse.input.pattern as string) ??
    toolUse.name;
  return (
    <ToolOutput
      id={toolUse.id}
      toolName={toolUse.name}
      description={String(desc).slice(0, 60)}
      status={toolUse.status as 'pending' | 'running' | 'complete' | 'error' | 'pending_permission'}
      error={toolUse.result?.error}
    >
      {toolUse.result?.output && (
        <pre className="max-h-32 overflow-y-auto p-3 text-xs text-foreground-secondary">
          {toolUse.result.output}
        </pre>
      )}
    </ToolOutput>
  );
}

// Creates a store pre-populated with events
function createPopulatedStore(events: AgentEvent[]) {
  const store = createChatStore();
  store.getState().startReplay();
  for (const event of events) {
    store.getState().processEvent(event, true);
  }
  store.getState().endReplay();
  return store;
}

// ─── Module-scope stores (prevents infinite re-render) ───────────────────

const emptyStore = createChatStore();

const simpleConversationStore = createPopulatedStore([
  { type: 'turn_start', messageId: 'msg-1', timestamp: Date.now() - 60000 },
  {
    type: 'text_delta',
    messageId: 'msg-1',
    text: 'I can help you with that! Let me look at the code structure first.\n\nThe main entry point is `src/index.ts`, which exports the public API. The store is in `src/store/chat-store.ts`.',
  },
  {
    type: 'text_done',
    messageId: 'msg-1',
    fullText:
      'I can help you with that! Let me look at the code structure first.\n\nThe main entry point is `src/index.ts`, which exports the public API. The store is in `src/store/chat-store.ts`.',
  },
  {
    type: 'turn_end',
    messageId: 'msg-1',
    durationMs: 3200,
    usage: {
      inputTokens: 1500,
      outputTokens: 450,
      cacheReadTokens: 200,
      cacheCreationTokens: 100,
      totalCostUsd: 0.02,
    },
  },
]);

const toolExecutionStore = createPopulatedStore([
  { type: 'turn_start', messageId: 'msg-1', timestamp: Date.now() - 30000 },
  { type: 'text_delta', messageId: 'msg-1', text: 'Let me read the configuration file first.' },
  { type: 'text_done', messageId: 'msg-1', fullText: 'Let me read the configuration file first.' },
  {
    type: 'tool_start',
    messageId: 'msg-1',
    tool: { id: 'tool-1', name: 'Read', input: { file_path: '/src/config.ts' } },
  },
  { type: 'tool_running', messageId: 'msg-1', toolId: 'tool-1', approvalMethod: 'trusted_tool' },
  {
    type: 'tool_result',
    messageId: 'msg-1',
    toolId: 'tool-1',
    result: {
      success: true,
      output: 'export const config = {\n  apiUrl: "https://api.example.com",\n  timeout: 5000,\n};',
    },
  },
  {
    type: 'text_delta',
    messageId: 'msg-1',
    text: '\n\nI see the issue — the timeout is too low. Let me increase it.',
  },
  {
    type: 'text_done',
    messageId: 'msg-1',
    fullText:
      'Let me read the configuration file first.\n\nI see the issue — the timeout is too low. Let me increase it.',
  },
  {
    type: 'tool_start',
    messageId: 'msg-1',
    tool: { id: 'tool-2', name: 'Edit', input: { file_path: '/src/config.ts' } },
  },
  { type: 'tool_running', messageId: 'msg-1', toolId: 'tool-2', approvalMethod: 'session_rule' },
  { type: 'tool_result', messageId: 'msg-1', toolId: 'tool-2', result: { success: true } },
  {
    type: 'text_delta',
    messageId: 'msg-1',
    text: '\n\nDone! I increased the timeout from 5000ms to 30000ms.',
  },
  {
    type: 'text_done',
    messageId: 'msg-1',
    fullText:
      'Let me read the configuration file first.\n\nI see the issue — the timeout is too low. Let me increase it.\n\nDone! I increased the timeout from 5000ms to 30000ms.',
  },
  {
    type: 'turn_end',
    messageId: 'msg-1',
    durationMs: 5400,
    usage: {
      inputTokens: 2000,
      outputTokens: 800,
      cacheReadTokens: 500,
      cacheCreationTokens: 200,
      totalCostUsd: 0.04,
    },
  },
]);

const systemEventsStore = createPopulatedStore([
  { type: 'turn_start', messageId: 'msg-1', timestamp: Date.now() - 120000 },
  { type: 'text_delta', messageId: 'msg-1', text: 'Starting analysis with Sonnet...' },
  { type: 'text_done', messageId: 'msg-1', fullText: 'Starting analysis with Sonnet...' },
  {
    type: 'turn_end',
    messageId: 'msg-1',
    durationMs: 1000,
    usage: {
      inputTokens: 500,
      outputTokens: 50,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      totalCostUsd: 0.01,
    },
  },
  { type: 'model_change', fromModel: 'claude-sonnet-4-6', toModel: 'claude-opus-4-6' },
  { type: 'turn_start', messageId: 'msg-2', timestamp: Date.now() - 60000 },
  {
    type: 'text_delta',
    messageId: 'msg-2',
    text: 'Now using Opus for deeper analysis. Let me examine the architecture more carefully.',
  },
  {
    type: 'text_done',
    messageId: 'msg-2',
    fullText: 'Now using Opus for deeper analysis. Let me examine the architecture more carefully.',
  },
  { type: 'interrupted', timestamp: Date.now() - 30000 },
]);

const permissionStore = createPopulatedStore([
  { type: 'turn_start', messageId: 'msg-1', timestamp: Date.now() - 10000 },
  {
    type: 'text_delta',
    messageId: 'msg-1',
    text: 'I need to push the changes to the remote repository.',
  },
  {
    type: 'text_done',
    messageId: 'msg-1',
    fullText: 'I need to push the changes to the remote repository.',
  },
  {
    type: 'tool_start',
    messageId: 'msg-1',
    tool: {
      id: 'tool-1',
      name: 'Bash',
      input: { command: 'git push origin main', description: 'Push to remote' },
    },
  },
  {
    type: 'tool_permission_needed',
    messageId: 'msg-1',
    toolId: 'tool-1',
    requestId: 'req-001',
    toolName: 'Bash',
    input: { command: 'git push origin main' },
  },
]);

// ─── Meta ─────────────────────────────────────────────────────────────────

const meta: Meta<typeof Chat> = {
  title: 'Chat/chat',
  component: Chat,
  tags: ['autodocs'],
  args: {
    onSend: fn(),
    onInterrupt: fn(),
    onApprove: fn(),
    onDeny: fn(),
    toolRenderer: simpleToolRenderer,
  },
  decorators: [
    (Story) => (
      <div className="h-[600px] w-[800px] overflow-hidden rounded-lg border border-border-default">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Chat>;

// ─── Stories ──────────────────────────────────────────────────────────────

// Empty chat — initial state before any messages
export const Empty: Story = {
  render: (args) => (
    <ChatProvider store={emptyStore}>
      <Chat {...args} />
    </ChatProvider>
  ),
};

// Simple conversation — user asks, assistant responds.
// Shows the basic message flow.
export const SimpleConversation: Story = {
  render: (args) => (
    <ChatProvider store={simpleConversationStore}>
      <Chat {...args} />
    </ChatProvider>
  ),
};

// Conversation with tool execution — the most common pattern.
// Assistant reads a file, then edits it.
export const WithToolExecution: Story = {
  render: (args) => (
    <ChatProvider store={toolExecutionStore}>
      <Chat {...args} />
    </ChatProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: `The most common conversation pattern: assistant reads a file,
        analyzes it, makes an edit, and explains what changed. Note how
        text blocks and tool_use blocks are interleaved in the content array.`,
      },
    },
  },
};

// System events — model change and interruption.
// These are app-injected events that flow through the same pipeline.
export const WithSystemEvents: Story = {
  render: (args) => (
    <ChatProvider store={systemEventsStore}>
      <Chat {...args} />
    </ChatProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: `System events (model_change, interrupted) are rendered as
        centered system messages. They flow through the exact same
        store.processEvent() pipeline as provider events — no special code path.`,
      },
    },
  },
};

// Permission flow — tool waiting for user approval.
// Shows the approval UI in the ToolOutput wrapper.
export const PendingPermission: Story = {
  render: (args) => (
    <ChatProvider store={permissionStore}>
      <Chat {...args} />
    </ChatProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: `When a tool needs permission, the ToolOutput auto-expands and
        shows approval buttons. The entire agent is paused waiting for the
        user's response. Clicking "Allow for session" creates a permission
        rule in the PermissionEngine (persisted to SQLite) and sends
        the response to the provider via IPC.`,
      },
    },
  },
};

// Accessory slots — leadingAccessory in the controls row, footer below the input.
// These are generic ReactNode slots for host-app injection (e.g., branch picker).
export const WithAccessorySlots: Story = {
  render: (args) => (
    <ChatProvider store={simpleConversationStore}>
      <Chat
        {...args}
        leadingAccessory={
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-border-muted px-1.5 h-[22px] text-[9px] font-mono text-foreground-secondary hover:bg-surface-hover transition-colors"
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            <span>feat/branch</span>
            <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        }
        footer={
          <div className="mt-1 pl-1.5 flex items-center h-4">
            <div className="text-[11px] text-foreground-secondary/70 flex items-center gap-1">
              <svg className="h-2.5 w-2.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="6" y1="3" x2="6" y2="15" />
                <circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M18 9a9 9 0 0 1-9 9" />
              </svg>
              <span>
                <span className="opacity-80">vienna</span>
                <span className="opacity-50">{' \u2192 '}</span>
                <span>feat/branch</span>
                <span className="mx-0.5 opacity-50">&middot;</span>
                <span className="opacity-80">vienna</span>
                <span className="opacity-50">{' \u2192 '}</span>
                <span>feat/branch</span>
              </span>
            </div>
          </div>
        }
      />
    </ChatProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: `Demonstrates the \`leadingAccessory\` and \`footer\` slots:

        - **leadingAccessory** — rendered in the bottom controls row (left side,
          after attachment/builder/voice buttons). Used for branch pickers,
          workspace selectors, or other contextual actions.
        - **footer** — rendered below the entire input container. Used for
          status indicators like active branch selections.

        Both slots accept any ReactNode and are threaded through
        Chat → ChatInput → ChatInputUnified. The host app (desktop, web)
        passes its own components through these slots.`,
      },
    },
  },
};

// ─── API Retry ───────────────────────────────────────────────────────────
//
// Interactive demo: inject api_retry events into a live store.
// Click "Start Retries" to simulate escalating retry attempts,
// then "Resolve (turn_start)" to clear the retry widget.

const apiRetryBaseStore = createPopulatedStore([
  { type: 'turn_start', messageId: 'msg-1', timestamp: Date.now() - 30000 },
  { type: 'text_delta', messageId: 'msg-1', text: 'Let me analyze that code for you...' },
  { type: 'text_done', messageId: 'msg-1', fullText: 'Let me analyze that code for you...' },
  {
    type: 'turn_end',
    messageId: 'msg-1',
    durationMs: 1000,
    usage: { inputTokens: 500, outputTokens: 50, cacheReadTokens: 0, cacheCreationTokens: 0, totalCostUsd: 0.01 },
  },
]);

function ApiRetryDemo(props: React.ComponentProps<typeof Chat>) {
  const storeRef = useRef(apiRetryBaseStore);
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const injectRetry = useCallback((n: number) => {
    const delay = Math.round(500 * Math.pow(2, n - 1) * (0.8 + Math.random() * 0.4));
    storeRef.current.getState().processEvent({
      type: 'api_retry',
      attempt: n,
      maxRetries: 10,
      retryDelayMs: delay,
      errorStatus: 529,
      error: 'rate_limit',
      timestamp: Date.now(),
    });
    setAttempt(n);
  }, []);

  const startRetries = useCallback(() => {
    let n = 1;
    injectRetry(n);
    function next() {
      n++;
      if (n > 5) return; // stop at 5 for demo
      timerRef.current = setTimeout(() => {
        injectRetry(n);
        next();
      }, 1500);
    }
    next();
  }, [injectRetry]);

  const resolve = useCallback(() => {
    clearTimeout(timerRef.current);
    const resolvedId = `msg-resolved-${Date.now()}`;
    storeRef.current.getState().processEvent({
      type: 'turn_start',
      messageId: resolvedId,
      timestamp: Date.now(),
    });
    storeRef.current.getState().processEvent({
      type: 'text_delta',
      messageId: resolvedId,
      text: 'API recovered — continuing analysis.',
    });
    setAttempt(0);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border-default)' }}>
        <button onClick={startRetries} style={{ fontSize: 12, padding: '4px 12px', cursor: 'pointer' }}>
          Start Retries
        </button>
        <button onClick={() => injectRetry(attempt + 1)} style={{ fontSize: 12, padding: '4px 12px', cursor: 'pointer' }}>
          +1 Retry
        </button>
        <button onClick={resolve} style={{ fontSize: 12, padding: '4px 12px', cursor: 'pointer' }}>
          Resolve (turn_start)
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
          {attempt > 0 ? `attempt ${attempt}/10` : 'idle'}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ChatProvider store={storeRef.current}>
          <Chat {...props} />
        </ChatProvider>
      </div>
    </div>
  );
}

export const WithApiRetry: Story = {
  render: (args) => <ApiRetryDemo {...args} />,
  parameters: {
    docs: {
      description: {
        story: `Interactive API retry demo. Click **Start Retries** to inject
        escalating api_retry events (updates in-place). Click **Resolve** to
        inject a turn_start that clears the retry widget. The widget shows a
        pulsing indicator, attempt counter, and backoff delay.`,
      },
    },
  },
};
