// PermissionActionBar Stories
//
// The PermissionActionBar replaces the chat input when a tool needs user approval.
// It matches the chat input container shape for a seamless morph transition.
//
// Props:
//   current: PendingApproval    — the approval request currently displayed
//   currentPosition: number     — 1-based position in the queue
//   totalCount: number          — total pending approvals
//   onApprove(requestId, policy) — called with 'once' | 'session' | 'permanent'
//   onDeny(requestId)            — called when user denies
//
// PendingApproval shape:
//   { requestId, toolId, toolName, displayName, description, input, messageId, timestamp }
//
// Keyboard shortcuts (global, not in input/textarea):
//   a / Enter  → Allow once
//   s          → Allow for session
//   p          → Allow permanently
//   n          → Deny
//
// Layout:
//   Top row:  Shield icon + displayName + description (truncated)
//   Bottom:   [a Allow] [s Session] [p Permanent] ... queue indicator ... [n Deny]
//
// Queue indicator only renders when totalCount > 1, showing "currentPosition/totalCount".

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PermissionActionBar } from './permission-action-bar';
import type { PendingApproval } from '../../hooks/use-all-pending-approvals';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApproval(overrides: Partial<PendingApproval> = {}): PendingApproval {
  return {
    requestId: 'req-001',
    toolId: 'tool-bash-1',
    toolName: 'Bash',
    displayName: 'Bash',
    description: 'npm install',
    input: { command: 'npm install' },
    messageId: 'msg-001',
    timestamp: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof PermissionActionBar> = {
  title: 'Input/permission-action-bar',
  component: PermissionActionBar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-6 bg-surface-sunken">
        <Story />
      </div>
    ),
  ],
  args: {
    onApprove: fn(),
    onDeny: fn(),
  },
  argTypes: {
    currentPosition: {
      control: { type: 'number', min: 1 },
      description: '1-based position of the current approval in the queue',
    },
    totalCount: {
      control: { type: 'number', min: 1 },
      description: 'Total number of pending approvals in the queue',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PermissionActionBar>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Default single permission request for a Bash command.
 *
 * Shows the shield icon, tool display name, and description.
 * Bottom row shows Allow / Session / Permanent / Deny pills.
 * No queue indicator because totalCount is 1.
 */
export const Default: Story = {
  args: {
    current: makeApproval(),
    currentPosition: 1,
    totalCount: 1,
  },
};

/**
 * Tool approval for file-modifying operations.
 *
 * Demonstrates how different tool types surface in the bar.
 * The displayName and description change per tool — here we show
 * a file edit approval with a path-based description.
 */
export const ToolApproval: Story = {
  args: {
    current: makeApproval({
      requestId: 'req-edit-001',
      toolId: 'tool-edit-file-1',
      toolName: 'edit_file',
      displayName: 'Edit File',
      description: '/src/components/Button.tsx',
      input: {
        file_path: '/src/components/Button.tsx',
        old_string: 'className="btn"',
        new_string: 'className="btn btn-primary"',
      },
    }),
    currentPosition: 1,
    totalCount: 1,
  },
};

/**
 * Queue mode — multiple pending approvals.
 *
 * When totalCount > 1, a queue indicator appears between the spacer
 * and the Deny button showing "currentPosition/totalCount" in a
 * small monospace font. Users can approve/deny each request in order.
 */
export const Queue: Story = {
  args: {
    current: makeApproval({
      requestId: 'req-002',
      toolId: 'tool-bash-2',
      toolName: 'Bash',
      displayName: 'Bash',
      description: 'docker compose up -d',
      input: { command: 'docker compose up -d' },
    }),
    currentPosition: 2,
    totalCount: 5,
  },
};

/**
 * Detailed tool description.
 *
 * When the description differs from both toolName and displayName,
 * it renders as a secondary muted monospace label to the right of
 * the display name, truncated with ellipsis on overflow.
 */
export const WithDescription: Story = {
  args: {
    current: makeApproval({
      requestId: 'req-read-001',
      toolId: 'tool-file-read-1',
      toolName: 'file_read',
      displayName: 'Read File',
      description:
        '/Users/will/Documents/dev/vienna/packages/chat-ui/src/components/Input/chat-input-unified.tsx (lines 1-200)',
      input: {
        file_path:
          '/Users/will/Documents/dev/vienna/packages/chat-ui/src/components/Input/chat-input-unified.tsx',
      },
    }),
    currentPosition: 1,
    totalCount: 1,
  },
  parameters: {
    docs: {
      description: {
        story: `The description is shown only when it differs from both toolName and displayName.
        It renders in a muted monospace font and truncates with ellipsis on overflow.`,
      },
    },
  },
};

/**
 * Interactive story demonstrating approve/deny actions.
 *
 * Open the Actions panel in Storybook to see onApprove and onDeny
 * fire when clicking the pill buttons. onApprove receives the requestId
 * and one of 'once' | 'session' | 'permanent' as the policy argument.
 *
 * Keyboard shortcuts also work when the story is focused:
 *   a / Enter → Allow once
 *   s → Session
 *   p → Permanent
 *   n → Deny
 */
export const Interactive: Story = {
  args: {
    current: makeApproval({
      requestId: 'req-interactive',
      toolId: 'tool-bash-interactive',
      toolName: 'Bash',
      displayName: 'Bash',
      description: 'git push origin main --force',
      input: { command: 'git push origin main --force' },
    }),
    currentPosition: 1,
    totalCount: 3,
  },
  parameters: {
    docs: {
      description: {
        story: `Click the action buttons or use keyboard shortcuts to trigger callbacks.
        Check the Actions panel for logged events.

        **Keyboard shortcuts** (focus the story frame first):
        - \`a\` or \`Enter\` — Allow once
        - \`s\` — Allow for session
        - \`p\` — Allow permanently
        - \`n\` — Deny`,
      },
    },
  },
};
