// ToolOutput Stories — Base wrapper for all tool renderers
//
// ToolOutput provides consistent UX: status indicator, collapse/expand,
// permission approval UI, and error display. Tool lifecycle:
// tool_start (pending) -> tool_permission_needed (pending_permission) ->
// tool_running (running) -> tool_result (complete/error)
// Always wrap tool-specific content in ToolOutput.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ToolOutput } from './tool-output';

const meta: Meta<typeof ToolOutput> = {
  title: 'Tools/tool-output',
  component: ToolOutput,
  tags: ['autodocs'],
  args: {
    onApprove: fn(),
    onDeny: fn(),
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'pending_permission', 'running', 'complete', 'error'],
      description: 'Current execution status of the tool',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ToolOutput>;

/**
 * Default state: tool queued but not yet executing.
 * The spinner icon indicates the tool is waiting.
 */
export const Pending: Story = {
  args: {
    id: 'tool-1',
    toolName: 'Bash',
    description: 'npm install',
    status: 'pending',
  },
  parameters: {
    docs: {
      description: {
        story: 'Tool is queued. Shows ○ spinner. Content is collapsed by default.',
      },
    },
  },
};

/**
 * Running state: tool is currently executing.
 * Shows a spinning indicator. Content may be streaming.
 */
export const Running: Story = {
  args: {
    id: 'tool-2',
    toolName: 'Bash',
    description: 'Running tests...',
    status: 'running',
    children: (
      <pre className="p-3 text-xs text-foreground-secondary">
        PASS src/store.test.ts{'\n'}PASS src/adapters.test.ts{'\n'}
        Running 3 of 5 suites...
      </pre>
    ),
  },
};

/**
 * Complete state: tool finished successfully.
 * Shows green checkmark. Content collapsed by default.
 */
export const Complete: Story = {
  args: {
    id: 'tool-3',
    toolName: 'Read',
    description: '/src/index.ts',
    status: 'complete',
    children: (
      <pre className="p-3 text-xs text-muted-foreground">
        export function main() {'{\n'} console.log('hello');{'\n}'}
      </pre>
    ),
  },
};

/**
 * Error state: tool failed.
 * Shows red X and error message below content.
 */
export const Error: Story = {
  args: {
    id: 'tool-4',
    toolName: 'Bash',
    description: 'rm -rf /protected',
    status: 'error',
    error: 'Permission denied: cannot delete protected directory',
  },
};

/**
 * Permission needed: tool is waiting for user approval.
 *
 * This is the critical UX state. When a tool needs permission:
 * 1. ToolOutput auto-expands (even if collapsed)
 * 2. Approval buttons appear: "Allow once" / "Allow for session" / "Deny"
 * 3. Clicking a button calls onApprove(requestId, scope) or onDeny(requestId)
 * 4. The IPC layer sends the response to the provider
 *
 * The requestId links this UI interaction to the specific permission
 * request from the provider, ensuring the correct tool gets approved.
 */
export const PendingPermission: Story = {
  args: {
    id: 'tool-5',
    toolName: 'Bash',
    description: 'git push origin main',
    status: 'pending_permission',
    requestId: 'req-abc-123',
    children: <pre className="p-3 text-xs text-warning">$ git push origin main</pre>,
  },
  parameters: {
    docs: {
      description: {
        story: `**Critical UX state**: When a provider requests permission to execute a tool,
        this state shows. The ToolOutput auto-expands and renders approval buttons.
        The requestId links to the specific permission request in the provider.

        Approval scopes:
        - **once**: Allow this specific invocation only
        - **session**: Allow this tool for the rest of the session
        - **permanent**: Allow this tool permanently (persisted to SQLite)`,
      },
    },
  },
};

/**
 * Auto-approved tool: shows how the tool was approved automatically.
 * The approvalMethod badge appears in the header.
 */
export const AutoApproved: Story = {
  args: {
    id: 'tool-6',
    toolName: 'Read',
    description: '/src/config.ts',
    status: 'complete',
    approvalMethod: 'session_rule',
    children: <pre className="p-3 text-xs text-muted-foreground">{'// config.ts content...'}</pre>,
  },
  parameters: {
    docs: {
      description: {
        story: `When a tool is auto-approved by the PermissionEngine, the approvalMethod
        is shown as a badge. Possible values:
        - **session_rule**: Rule created during this session
        - **persistent_rule**: Permanently saved rule
        - **trusted_tool**: Tool in the trusted tools list
        - **auto_policy**: Matched an automatic policy`,
      },
    },
  },
};

/**
 * Non-collapsible: some tools don't benefit from collapse behavior.
 * When collapsible=false, no chevron is shown and content is always visible.
 */
export const NonCollapsible: Story = {
  args: {
    id: 'tool-7',
    toolName: 'EnterPlanMode',
    description: 'Entering plan mode',
    status: 'complete',
    collapsible: false,
    children: (
      <span className="p-3 text-xs text-muted-foreground">Planning implementation approach</span>
    ),
  },
};

/** Permanent rule approval — shows TrustBadge with "Always" label */
export const PermanentRuleApproved: Story = {
  args: {
    id: 'tool-8',
    toolName: 'Write',
    description: '/src/components/Button.tsx',
    status: 'complete',
    approvalMethod: 'persistent_rule',
    onRevoke: fn(),
    children: (
      <pre className="p-3 text-xs text-muted-foreground">{'// file written successfully'}</pre>
    ),
  },
};

/** Trusted tool approval */
export const TrustedToolApproved: Story = {
  args: {
    id: 'tool-9',
    toolName: 'Glob',
    description: '**/*.tsx',
    status: 'complete',
    approvalMethod: 'trusted_tool',
    children: (
      <pre className="p-3 text-xs text-muted-foreground">
        {'src/components/Chat.tsx\nsrc/components/Message.tsx\nsrc/index.tsx'}
      </pre>
    ),
  },
};

/**
 * Permission with visible content — some tools show partial content
 * even during the permission prompt (e.g., the command to be executed).
 */
export const PermissionWithContent: Story = {
  args: {
    id: 'tool-10',
    toolName: 'Bash',
    description: 'docker compose up -d',
    status: 'pending_permission',
    requestId: 'req-docker-001',
    showContentWhilePendingPermission: true,
    children: (
      <pre className="p-3 text-xs text-warning">
        $ docker compose up -d{'\n'}
        Starting postgres_1 ... {'\n'}
        Starting redis_1 ...
      </pre>
    ),
  },
};

/**
 * Multiple tools in a row — demonstrates how tools stack visually.
 * Each tool independently tracks its own collapse/expand state.
 */
export const MultipleTools: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-1 max-w-3xl p-4">
      <ToolOutput
        id="t1"
        toolName="Read"
        description="/src/store.ts"
        status="complete"
        approvalMethod="trusted_tool"
      >
        <pre className="p-3 text-xs text-muted-foreground">export const store = create(...);</pre>
      </ToolOutput>
      <ToolOutput
        id="t2"
        toolName="Edit"
        description="/src/store.ts"
        status="complete"
        approvalMethod="session_rule"
        onRevoke={fn()}
      >
        <pre className="p-3 text-xs text-muted-foreground">// edited successfully</pre>
      </ToolOutput>
      <ToolOutput id="t3" toolName="Bash" description="pnpm test" status="running">
        <pre className="p-3 text-xs text-foreground-secondary">Running tests...</pre>
      </ToolOutput>
    </div>
  ),
  name: 'Multiple Tools Stacked',
};
