// Architecture Overview — AI-readable system documentation
//
// 3 layers: Providers (CLI -> NDJSON -> Normalizer -> AgentEvent) ->
// SessionManager (permissions, SQLite, IPC emit) -> Chat UI (store, components).
//
// Key decisions: same code path for live+replay, Zod-first types, event coalescing,
// replay bracket optimization, provider-agnostic UI, extensible tool registry.

import type { Meta, StoryObj } from '@storybook/react';

// Minimal component just for Storybook to render
function ArchitectureDocs() {
  return (
    <div className="max-w-3xl p-8 text-foreground">
      <h1 className="text-2xl font-bold mb-6">Vienna Chat UI — Architecture Reference</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-info">Data Flow</h2>
        <pre className="rounded-lg bg-surface-sunken p-4 text-[13px] text-foreground-secondary">
          {`Provider (CLI subprocess)
    │ stdout: NDJSON
    ▼
Normalizer → AgentEvent
    │
    ▼
SessionManager
    ├─ PermissionEngine.check()
    ├─ Persist to SQLite
    │
    ▼
IPC emit: agent.onEvent
    │
    ▼
IpcEventSource (coalesces text_deltas)
    │
    ▼
store.processEvent()
    │
    ▼
React re-render → UI`}
        </pre>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-info">Event Lifecycle: Tool Execution</h2>
        <pre className="rounded-lg bg-surface-sunken p-4 text-[13px] text-foreground-secondary">
          {`1. tool_start    → ToolUse created, status='pending'
2. [optional] tool_permission_needed → status='pending_permission'
   → ToolOutput shows approval UI
3. [user approves OR auto-approved]
4. tool_running   → status='running', shows spinner
5. tool_result    → status='complete' or 'error'
   → ToolOutput shows result`}
        </pre>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-info">Store State Shape</h2>
        <pre className="rounded-lg bg-surface-sunken p-4 text-[13px] text-foreground-secondary">
          {`ChatState {
  messages: Map<string, Message>   // O(1) lookup by ID
  messageOrder: string[]            // Ordered message IDs
  messageGroups: MessageGroup[]     // Grouped for rendering
  streamingMessageId: string | null // Currently streaming message
  isStreaming: boolean              // Any message streaming?
  isThinking: boolean              // Model thinking?
  isAgentBusy: boolean             // Agent processing?
  error: { code, message } | null  // Current error
  usage: TokenUsageState           // Token counts + cost
}`}
        </pre>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-info">Message Content Blocks</h2>
        <pre className="rounded-lg bg-surface-sunken p-4 text-[13px] text-foreground-secondary">
          {`Message.content: ContentBlock[]
  ├─ TextBlock        { type: 'text', text: string }
  ├─ ThinkingBlock    { type: 'thinking', text: string }
  ├─ ToolUseBlock     { type: 'tool_use', toolUseId: string }
  └─ SystemEventBlock { type: 'system_event', eventType: string, data: unknown }

ToolUse objects stored in Message.toolUses[]
Referenced by ToolUseBlock.toolUseId`}
        </pre>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2 text-info">Packages</h2>
        <div className="text-[13px] leading-[1.8]">
          <div>
            <span className="text-success">agent-core</span> — AgentEvent, AgentProvider interface,
            Zod schemas
          </div>
          <div>
            <span className="text-success">agent-providers</span> — Claude Code provider +
            normalizer, ProviderRegistry
          </div>
          <div>
            <span className="text-success">agent-permissions</span> — PermissionEngine, rule
            matching, trusted tools
          </div>
          <div>
            <span className="text-success">agent-db</span> — SQLite persistence (sessions, events,
            permissions)
          </div>
          <div>
            <span className="text-success">chat-ui</span> — This package. React components + Zustand
            store
          </div>
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof ArchitectureDocs> = {
  title: 'Documentation/Architecture Overview',
  component: ArchitectureDocs,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `This page is an architecture reference for AI systems and developers.
        It explains the full data flow, key design decisions, and how
        all packages connect in the Vienna chat system.`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ArchitectureDocs>;

export const Overview: Story = {};
