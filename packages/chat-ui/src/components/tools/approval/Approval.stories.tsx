// Approval Stories — ApprovalDropdown, TrustBadge, DirectoryScoping
//
// Comprehensive stories for the permission/approval system.
// Matches drift-v2's Approval.stories.tsx coverage.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ApprovalDropdown } from './approval-dropdown';
import { TrustBadge } from './trust-badge';
import { DirectoryScoping } from './directory-scoping';
import type { ApprovalMethod } from './types';

// ─── ApprovalDropdown ──────────────────────────────────────────────────────

const approvalMeta: Meta<typeof ApprovalDropdown> = {
  title: 'Approval/approval-dropdown',
  component: ApprovalDropdown,
  tags: ['autodocs'],
  args: {
    requestId: 'req-001',
    onApprove: fn(),
    onDeny: fn(),
  },
  decorators: [
    (Story) => (
      <div className="p-8 min-h-[300px]">
        <Story />
      </div>
    ),
  ],
};

export default approvalMeta;
type ApprovalStory = StoryObj<typeof ApprovalDropdown>;

/** Default split button: "Allow" + chevron dropdown */
export const Default: ApprovalStory = {};

/** Small variant for compact layouts */
export const Small: ApprovalStory = {
  args: { size: 'sm' },
};

/** Disabled state — e.g., while a previous approval is being processed */
export const Disabled: ApprovalStory = {
  args: { disabled: true },
};

/**
 * Keyboard shortcuts — Focus the dropdown and use:
 * - a or Enter: Allow once
 * - s: Allow for session
 * - p: Allow permanently
 * - n: Deny
 * - Escape: Close dropdown
 */
export const WithKeyboardHints: ApprovalStory = {
  parameters: {
    docs: {
      description: {
        story: `Focus the component and press keyboard shortcuts to approve/deny.
        The dropdown menu shows keyboard hints (a, s, p, n) next to each option.`,
      },
    },
  },
};

// ─── TrustBadge ────────────────────────────────────────────────────────────

export const TrustBadgeManual: StoryObj<typeof TrustBadge> = {
  render: () => (
    <div className="p-8 flex gap-4 items-center">
      <TrustBadge method="manual" toolName="Bash" />
    </div>
  ),
  name: 'TrustBadge — Manual',
};

export const TrustBadgeSessionRule: StoryObj<typeof TrustBadge> = {
  render: () => (
    <div className="p-8 flex gap-4 items-center">
      <TrustBadge method="session_rule" toolName="Read" scope="session" onRevoke={fn()} />
    </div>
  ),
  name: 'TrustBadge — Session Rule',
};

export const TrustBadgePermanentRule: StoryObj<typeof TrustBadge> = {
  render: () => (
    <div className="p-8 flex gap-4 items-center">
      <TrustBadge method="persistent_rule" toolName="Write" scope="permanent" onRevoke={fn()} />
    </div>
  ),
  name: 'TrustBadge — Permanent Rule',
};

export const TrustBadgeTrustedTool: StoryObj<typeof TrustBadge> = {
  render: () => (
    <div className="p-8 flex gap-4 items-center">
      <TrustBadge method="trusted_tool" toolName="Glob" />
    </div>
  ),
  name: 'TrustBadge — Trusted Tool',
};

export const TrustBadgeAutoPolicy: StoryObj<typeof TrustBadge> = {
  render: () => (
    <div className="p-8 flex gap-4 items-center">
      <TrustBadge method="auto_policy" toolName="Grep" />
    </div>
  ),
  name: 'TrustBadge — Auto Policy',
};

/** All badge variants side by side */
export const TrustBadgeAllVariants: StoryObj<typeof TrustBadge> = {
  render: () => {
    const methods: ApprovalMethod[] = [
      'manual',
      'session_rule',
      'persistent_rule',
      'trusted_tool',
      'auto_policy',
    ];
    return (
      <div className="p-8 flex gap-3 items-center flex-wrap">
        {methods.map((method) => (
          <TrustBadge
            key={method}
            method={method}
            toolName="Tool"
            onRevoke={method === 'session_rule' || method === 'persistent_rule' ? fn() : undefined}
          />
        ))}
      </div>
    );
  },
  name: 'TrustBadge — All Variants',
};

/** Badge with entrance animation */
export const TrustBadgeAnimated: StoryObj<typeof TrustBadge> = {
  render: () => (
    <div className="p-8 flex gap-4 items-center">
      <TrustBadge method="session_rule" toolName="Bash" animate onRevoke={fn()} />
    </div>
  ),
  name: 'TrustBadge — Animated Entry',
};

// ─── DirectoryScoping ──────────────────────────────────────────────────────

export const DirectoryScopingSingle: StoryObj<typeof DirectoryScoping> = {
  render: () => (
    <div className="p-8 max-w-[400px]">
      <DirectoryScoping
        directories={['/Users/will/Documents/dev/vienna']}
        cwd="/Users/will/Documents/dev/vienna"
        onConfirm={fn()}
        onCancel={fn()}
      />
    </div>
  ),
  name: 'DirectoryScoping — Single Directory',
};

export const DirectoryScopingMultiple: StoryObj<typeof DirectoryScoping> = {
  render: () => (
    <div className="p-8 max-w-[400px]">
      <DirectoryScoping
        directories={[
          '/Users/will/Documents/dev/vienna',
          '/Users/will/Documents/dev/vienna-legacy',
          '/Users/will/.config/vienna',
          '/tmp',
        ]}
        cwd="/Users/will/Documents/dev/vienna"
        onConfirm={fn()}
        onCancel={fn()}
      />
    </div>
  ),
  name: 'DirectoryScoping — Multiple Directories',
};

export const DirectoryScopingNoCwd: StoryObj<typeof DirectoryScoping> = {
  render: () => (
    <div className="p-8 max-w-[400px]">
      <DirectoryScoping
        directories={['/tmp/project-a', '/tmp/project-b']}
        onConfirm={fn()}
        onCancel={fn()}
      />
    </div>
  ),
  name: 'DirectoryScoping — No CWD Badge',
};
