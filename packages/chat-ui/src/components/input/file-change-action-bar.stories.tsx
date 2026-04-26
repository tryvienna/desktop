// FileChangeActionBar Stories
//
// The FileChangeActionBar replaces the chat input when Edit/Write tools need approval.
// It takes priority over PermissionActionBar when file changes are pending.
//
// Props:
//   pendingCount: number         — count of pending file changes
//   currentFilePath?: string     — path of the first pending change
//   currentRequestId?: string    — request ID (used for transition keys)
//   onApprove()                  — approve the first pending change
//   onApproveAll()               — approve all pending changes
//   onApproveAllForSession()     — approve all + auto-approve future Edit/Write
//   onDeny()                     — deny the first pending change
//   onReview()                   — open the diff review panel in the drawer
//
// Keyboard shortcuts (global, not in input/textarea):
//   a / Enter  → Approve (first pending)
//   A (shift)  → Approve All
//   s          → Approve All in Session
//   n          → Deny
//   r          → Review (open drawer)
//
// Layout:
//   Top row:  File icon + "N file changes" + file path + [r Review]
//   Bottom:   [a Approve] [A Approve All] [s Session] ... pending count ... [n Deny]
//   "Approve All" pill is hidden when pendingCount === 1.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FileChangeActionBar } from './file-change-action-bar';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof FileChangeActionBar> = {
  title: 'Input/file-change-action-bar',
  component: FileChangeActionBar,
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
    onApproveAll: fn(),
    onApproveAllForSession: fn(),
    onDeny: fn(),
    onReview: fn(),
  },
  argTypes: {
    pendingCount: {
      control: { type: 'number', min: 1 },
      description: 'Number of pending file changes awaiting review',
    },
    currentFilePath: {
      control: 'text',
      description: 'File path of the first pending change (shown as context)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof FileChangeActionBar>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Single pending file change.
 *
 * Shows the file edit icon, "1 file change" label, and the file path.
 * Bottom row shows Approve / Session / Deny — no "Approve All" when count is 1.
 */
export const SingleChange: Story = {
  args: {
    pendingCount: 1,
    currentFilePath: '/src/components/Button.tsx',
    currentRequestId: 'req-001',
  },
};

/**
 * Multiple pending file changes.
 *
 * Shows "N file changes" label. The "Approve All" pill appears in the bottom row
 * alongside the pending count indicator.
 */
export const MultipleChanges: Story = {
  args: {
    pendingCount: 5,
    currentFilePath: '/packages/chat-ui/src/components/input/chat-input.tsx',
    currentRequestId: 'req-002',
  },
};

/**
 * Long file path — truncated with tooltip.
 *
 * The file path is shown in monospace and truncates with ellipsis.
 * Hovering reveals the full path via the title attribute.
 */
export const LongFilePath: Story = {
  args: {
    pendingCount: 3,
    currentFilePath:
      '/Users/will/Documents/dev/vienna/packages/chat-ui/src/components/tools/bulk-review/file-change-review-panel.tsx',
    currentRequestId: 'req-003',
  },
};

/**
 * No file path — when the path is unknown or not yet parsed.
 *
 * Only shows the count label without any path context.
 */
export const NoFilePath: Story = {
  args: {
    pendingCount: 2,
    currentRequestId: 'req-004',
  },
};

/**
 * Interactive story demonstrating all actions.
 *
 * Open the Actions panel in Storybook to see callbacks fire.
 *
 * **Keyboard shortcuts** (focus the story frame first):
 * - `a` or `Enter` — Approve first pending
 * - `A` (Shift+A) — Approve All
 * - `s` — Approve All in Session
 * - `n` — Deny
 * - `r` — Review (open drawer)
 */
export const Interactive: Story = {
  args: {
    pendingCount: 7,
    currentFilePath: '/src/app.tsx',
    currentRequestId: 'req-interactive',
  },
  parameters: {
    docs: {
      description: {
        story: `Click the action buttons or use keyboard shortcuts to trigger callbacks.
        Check the Actions panel for logged events.

        **Keyboard shortcuts** (focus the story frame first):
        - \`a\` or \`Enter\` — Approve first pending
        - \`A\` (Shift+A) — Approve All
        - \`s\` — Approve All in Session
        - \`n\` — Deny
        - \`r\` — Review (open drawer)`,
      },
    },
  },
};
