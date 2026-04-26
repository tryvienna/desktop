/**
 * FullInbox Stories — Main app full-page inbox view.
 *
 * The full inbox is the primary destination inside the main Vienna window.
 * It occupies the main content area (typically ~720px wide, full height)
 * alongside the sidebar. Supports mark-read, archive, action CTAs,
 * and entity deep-linking via drawers.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FullInbox, FullInboxItem } from './inbox-presentational';
import {
  mockItems,
  unreadOnlyItems,
  allReadItems,
  manyItems,
} from './inbox-stories-data';

// ── Realistic main window content area ────────────────────────────────────

/**
 * Simulates the main Vienna window content area: the inbox view sits to the
 * right of the navigation sidebar, filling the remaining space. We render a
 * minimal sidebar stub + the inbox at realistic proportions.
 */
function MainWindowFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        maxWidth: 1100,
        height: 700,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--border-default)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        backgroundColor: 'var(--surface-page)',
      }}
    >
      {/* Sidebar stub */}
      <div
        style={{
          width: 220,
          borderRight: '1px solid var(--border-default)',
          backgroundColor: 'var(--nav-sidebar-bg)',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            backgroundColor: 'var(--nav-item-selected-bg)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          Inbox
        </div>
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Home
        </div>
        <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '8px 0' }} />
        {['Design System', 'Plugins', 'Inbox Feature'].map((name) => (
          <div
            key={name}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'var(--text-muted)', opacity: 0.3 }} />
            {name}
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

/** Constrained container for individual item stories. */
function InboxItemFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 720,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border-default)',
      }}
    >
      {children}
    </div>
  );
}

// ── Item stories ──────────────────────────────────────────────────────────

const meta: Meta<typeof FullInboxItem> = {
  title: 'Inbox/FullPage/InboxItem',
  component: FullInboxItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: 24 }}>
        <InboxItemFrame>
          <Story />
        </InboxItemFrame>
      </div>
    ),
  ],
  args: {
    onMarkRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onOpenEntity: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof FullInboxItem>;

/** Unread item with entity link — shows external link icon and clickable. */
export const UnreadWithEntity: Story = {
  args: { item: mockItems[0]! },
};

/** Unread item with action CTA — "View CI Logs" button. */
export const UnreadWithAction: Story = {
  args: { item: mockItems[1]! },
};

/** Unread item with Slack action CTA. */
export const UnreadWithSlackAction: Story = {
  args: { item: mockItems[3]! },
};

/** Read item with emoji icon. */
export const ReadWithEmoji: Story = {
  args: { item: mockItems[5]! },
};

/** Read item with action CTA — "Upgrade Plugin". */
export const ReadWithAction: Story = {
  args: { item: mockItems[6]! },
};

/** Item with no icon — uses default Inbox icon. */
export const FallbackIcon: Story = {
  args: {
    item: {
      ...mockItems[7]!,
      icon: null,
      actions: [],
    },
  },
};

// ── Full inbox view stories ───────────────────────────────────────────────

export const InboxDefault: StoryObj<typeof FullInbox> = {
  name: 'Inbox — Default',
  render: (args) => (
    <MainWindowFrame>
      <FullInbox {...args} />
    </MainWindowFrame>
  ),
  args: {
    items: mockItems,
    unreadCount: mockItems.filter((i) => !i.read).length,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onOpenEntity: fn(),
  },
};

export const InboxEmpty: StoryObj<typeof FullInbox> = {
  name: 'Inbox — Empty',
  render: (args) => (
    <MainWindowFrame>
      <FullInbox {...args} />
    </MainWindowFrame>
  ),
  args: {
    items: [],
    unreadCount: 0,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onOpenEntity: fn(),
  },
};

export const InboxLoading: StoryObj<typeof FullInbox> = {
  name: 'Inbox — Loading',
  render: (args) => (
    <MainWindowFrame>
      <FullInbox {...args} />
    </MainWindowFrame>
  ),
  args: {
    items: [],
    unreadCount: 0,
    loading: true,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onOpenEntity: fn(),
  },
};

export const InboxAllUnread: StoryObj<typeof FullInbox> = {
  name: 'Inbox — All Unread',
  render: (args) => (
    <MainWindowFrame>
      <FullInbox {...args} />
    </MainWindowFrame>
  ),
  args: {
    items: unreadOnlyItems,
    unreadCount: unreadOnlyItems.length,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onOpenEntity: fn(),
  },
};

export const InboxAllRead: StoryObj<typeof FullInbox> = {
  name: 'Inbox — All Read',
  render: (args) => (
    <MainWindowFrame>
      <FullInbox {...args} />
    </MainWindowFrame>
  ),
  args: {
    items: allReadItems,
    unreadCount: 0,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onOpenEntity: fn(),
  },
};

export const InboxManyItems: StoryObj<typeof FullInbox> = {
  name: 'Inbox — Many Items (Scroll)',
  render: (args) => (
    <MainWindowFrame>
      <FullInbox {...args} />
    </MainWindowFrame>
  ),
  args: {
    items: manyItems,
    unreadCount: manyItems.filter((i) => !i.read).length,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onOpenEntity: fn(),
  },
};
