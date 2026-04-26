// VerificationActionBar Stories
//
// Replaces the chat input when a workstream enters needs_manual_verification.
// Same container shape as the chat input for a seamless morph.
//
// Two-step flow:
//   Step 1 (Awaiting):  [Back to Workstream] [Mark as Verified]
//   Step 2 (Verified):  [Back to Workstream] [Action1] [Action2] ... [Customize...]
//
// Props:
//   onBackToWorkstream()          — always available, navigates to workstream
//   onArchive()                   — archive the workstream (default verified action)
//   customActions?                — array of { id, label, onExecute } shown in step 2
//   onOpenCustomize?()            — opens customize modal (always shown in step 2)
//
// ResolvedVerificationAction shape:
//   { id: string; label: string; onExecute: () => void }
//
// Keyboard shortcuts:
//   Step 1: Escape → back, Enter → mark verified
//   Step 2: Escape → back, 1-5 → trigger numbered action
//
// Layout:
//   Top row:  Shield icon (orange in step 1, green in step 2) + status text + description
//   Bottom:   Pill buttons for current step

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { VerificationActionBar } from './verification-action-bar';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof VerificationActionBar> = {
  title: 'Input/verification-action-bar',
  component: VerificationActionBar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-6 bg-surface-sunken">
        <Story />
      </div>
    ),
  ],
  args: {
    onBackToWorkstream: fn(),
    onArchive: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof VerificationActionBar>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Default verification bar — Step 1 (Awaiting Verification).
 *
 * Shows an orange animated shield icon and "Awaiting Verification" text.
 * Bottom row has "Back to Workstream" and "Mark as Verified" buttons.
 * Pressing Enter or clicking "Mark as Verified" advances to step 2.
 */
export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: `The initial state when a workstream completes work and awaits review.
        The orange shield icon pulses to draw attention. Click "Mark as Verified"
        to advance to step 2 where post-verification actions are shown.`,
      },
    },
  },
};

/**
 * Step 2 with custom actions.
 *
 * After clicking "Mark as Verified", the bar transitions to show custom
 * actions provided via the customActions prop. Each action gets a number
 * badge (1-5) for keyboard shortcut access. The "Customize..." button
 * is always shown at the end.
 *
 * Note: This story starts at Step 1. Click "Mark as Verified" to see
 * the custom actions in Step 2.
 */
export const WithActions: Story = {
  args: {
    customActions: [
      { id: 'deploy', label: 'Deploy to Production', onExecute: fn() },
      { id: 'merge', label: 'Merge PR', onExecute: fn() },
      { id: 'notify', label: 'Notify Team', onExecute: fn() },
    ],
    onOpenCustomize: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: `Custom actions replace the default "Archive Workstream" fallback.
        Up to 5 actions are displayed with number key shortcuts (1-5).
        The "Customize..." button opens a modal for editing actions.`,
      },
    },
  },
};

/**
 * With archive callback — the default verified action.
 *
 * When no customActions are provided, the verified step shows a single
 * "Archive Workstream" button that calls onArchive().
 * Click "Mark as Verified" to see the archive action.
 */
export const WithArchive: Story = {
  args: {
    onArchive: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: `Without customActions, the verified step falls back to a single
        "Archive Workstream" action. This is the default behavior for workstreams
        that don't have post-verification workflows configured.`,
      },
    },
  },
};

/**
 * With customize callback enabled.
 *
 * The "Customize..." button appears in the verified step when onOpenCustomize
 * is provided. It's always rendered at the end of the action row with a
 * dashed border style. Click "Mark as Verified" to see it.
 */
export const WithCustomize: Story = {
  args: {
    onOpenCustomize: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: `The "Customize..." button opens a configuration modal where users can
        add, remove, or reorder post-verification actions. It's rendered with a
        dashed border to visually distinguish it from action buttons.`,
      },
    },
  },
};

/**
 * Full flow — all options enabled.
 *
 * Combines custom actions, archive, and customize in one story.
 * Click "Mark as Verified" to see all post-verification options.
 *
 * Keyboard shortcuts in step 2:
 *   Escape → back to workstream
 *   1      → Deploy to Staging
 *   2      → Run Smoke Tests
 *   3      → Merge & Close PR
 *   4      → Send Changelog
 */
export const FullFlow: Story = {
  args: {
    customActions: [
      { id: 'deploy-staging', label: 'Deploy to Staging', onExecute: fn() },
      { id: 'smoke-tests', label: 'Run Smoke Tests', onExecute: fn() },
      { id: 'merge-pr', label: 'Merge & Close PR', onExecute: fn() },
      { id: 'changelog', label: 'Send Changelog', onExecute: fn() },
    ],
    onOpenCustomize: fn(),
    onArchive: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: `Complete two-step verification flow with all features enabled.

        **Step 1** — Awaiting Verification:
        - Shield icon pulses in orange
        - "Back to Workstream" (Escape) and "Mark as Verified" (Enter)

        **Step 2** — Work Verified:
        - Shield icon shows checkmark in green
        - Up to 5 numbered action buttons (keyboard 1-5)
        - "Customize..." button at the end
        - "Back to Workstream" (Escape)`,
      },
    },
  },
};
