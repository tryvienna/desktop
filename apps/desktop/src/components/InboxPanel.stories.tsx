/**
 * InboxPanel Stories — Detached sidebar inbox panel.
 *
 * The panel is a 380px-wide, full-height, always-on-top, frameless Electron
 * window with macOS sidebar vibrancy. It pins to the right edge of the screen.
 *
 * Window config: frame:false, transparent:true, vibrancy:'sidebar',
 * roundedCorners:true, minWidth:300, maxWidth:600, alwaysOnTop:true.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { InboxPanel, PanelItem } from './inbox-presentational';
import {
  mockItems,
  unreadOnlyItems,
  allReadItems,
  singleUnreadItem,
  manyItems,
} from './inbox-stories-data';

// ── Realistic window chrome ───────────────────────────────────────────────

/**
 * Simulates the actual Electron panel window: 380px wide, ~full screen height,
 * frameless with sidebar vibrancy, pinned to the right edge.
 */
function PanelWindow({
  children,
  height = 800,
}: {
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 24 }}>
      <div
        style={{
          width: 380,
          height,
          borderRadius: 10,
          overflow: 'hidden',
          // Approximate macOS sidebar vibrancy with a frosted translucent bg
          backgroundColor: 'color-mix(in oklch, var(--surface-page) 85%, transparent)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid color-mix(in oklch, var(--border-default) 60%, transparent)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Constrained container for individual item stories at panel width. */
function PanelItemFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 380,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'var(--surface-page)',
        border: '1px solid var(--border-default)',
      }}
    >
      {children}
    </div>
  );
}

// ── Panel item stories ────────────────────────────────────────────────────

const itemMeta: Meta<typeof PanelItem> = {
  title: 'Inbox/Panel/PanelItem',
  component: PanelItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <PanelItemFrame>
        <Story />
      </PanelItemFrame>
    ),
  ],
  args: {
    onMarkRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
  },
};

export default itemMeta;
type ItemStory = StoryObj<typeof PanelItem>;

/** Unread item with SVG icon, description, and entity link. */
export const UnreadWithSvgIcon: ItemStory = {
  args: { item: mockItems[0]! },
};

/** Unread item with emoji icon and an action CTA button. */
export const UnreadWithActionCTA: ItemStory = {
  args: { item: mockItems[1]! },
};

/** Unread item with SVG icon and entity URI (shows external link indicator). */
export const UnreadWithEntityLink: ItemStory = {
  args: { item: mockItems[2]! },
};

/** Unread item with action CTA — Slack standup reminder. */
export const UnreadWithSlackAction: ItemStory = {
  args: { item: mockItems[3]! },
};

/** Read item with emoji icon — muted styling, no unread dot. */
export const ReadItem: ItemStory = {
  args: { item: mockItems[4]! },
};

/** Read item with no icon — falls back to default Inbox icon. Has upgrade action CTA. */
export const ReadItemWithAction: ItemStory = {
  args: { item: mockItems[6]! },
};

/** Item with a long description that gets clamped to 2 lines. */
export const LongDescription: ItemStory = {
  args: {
    item: {
      ...mockItems[6]!,
      read: false,
      description:
        'This is a very long description that should wrap to multiple lines and eventually get clamped. It contains important details about the notification that the user might want to read in full by clicking through to the full view. The text continues here with even more context about what happened and why it matters.',
    },
  },
};

// ── Full panel stories ────────────────────────────────────────────────────

export const PanelDefault: StoryObj<typeof InboxPanel> = {
  name: 'Panel — Default',
  render: (args) => (
    <PanelWindow>
      <InboxPanel {...args} />
    </PanelWindow>
  ),
  args: {
    items: mockItems,
    unreadCount: mockItems.filter((i) => !i.read).length,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onClose: fn(),
  },
};

export const PanelEmpty: StoryObj<typeof InboxPanel> = {
  name: 'Panel — Empty',
  render: (args) => (
    <PanelWindow height={400}>
      <InboxPanel {...args} />
    </PanelWindow>
  ),
  args: {
    items: [],
    unreadCount: 0,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onClose: fn(),
  },
};

export const PanelLoading: StoryObj<typeof InboxPanel> = {
  name: 'Panel — Loading',
  render: (args) => (
    <PanelWindow height={400}>
      <InboxPanel {...args} />
    </PanelWindow>
  ),
  args: {
    items: [],
    unreadCount: 0,
    loading: true,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onClose: fn(),
  },
};

export const PanelAllUnread: StoryObj<typeof InboxPanel> = {
  name: 'Panel — All Unread',
  render: (args) => (
    <PanelWindow>
      <InboxPanel {...args} />
    </PanelWindow>
  ),
  args: {
    items: unreadOnlyItems,
    unreadCount: unreadOnlyItems.length,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onClose: fn(),
  },
};

export const PanelAllRead: StoryObj<typeof InboxPanel> = {
  name: 'Panel — All Read',
  render: (args) => (
    <PanelWindow>
      <InboxPanel {...args} />
    </PanelWindow>
  ),
  args: {
    items: allReadItems,
    unreadCount: 0,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onClose: fn(),
  },
};

export const PanelSingleItem: StoryObj<typeof InboxPanel> = {
  name: 'Panel — Single Item',
  render: (args) => (
    <PanelWindow height={400}>
      <InboxPanel {...args} />
    </PanelWindow>
  ),
  args: {
    items: singleUnreadItem,
    unreadCount: 1,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onClose: fn(),
  },
};

export const PanelManyItems: StoryObj<typeof InboxPanel> = {
  name: 'Panel — Many Items (Scroll)',
  render: (args) => (
    <PanelWindow>
      <InboxPanel {...args} />
    </PanelWindow>
  ),
  args: {
    items: manyItems,
    unreadCount: manyItems.filter((i) => !i.read).length,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onArchive: fn(),
    onExecuteAction: fn(),
    onClose: fn(),
  },
};
