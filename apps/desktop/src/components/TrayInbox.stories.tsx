/**
 * TrayInbox Stories — Compact tray popover inbox view.
 *
 * The tray popover is a 360x480 frameless, non-resizable, always-on-top
 * window that appears below the system tray icon. It has macOS popover
 * vibrancy and rounded corners.
 *
 * Window config: 360x480, frame:false, resizable:false, movable:false,
 * transparent:true, vibrancy:'popover', roundedCorners:true, skipTaskbar:true.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TrayInbox, TrayItem } from './inbox-presentational';
import {
  mockItems,
  unreadOnlyItems,
  allReadItems,
} from './inbox-stories-data';

// ── Realistic tray popover chrome ─────────────────────────────────────────

/**
 * Simulates the actual Electron tray popover: 360x480, centered at top
 * (as if dropping down from the menu bar), with popover vibrancy.
 */
function TrayPopover({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16, paddingBottom: 24 }}>
      <div
        style={{
          width: 360,
          height: 480,
          borderRadius: 12,
          overflow: 'hidden',
          // Approximate macOS popover vibrancy
          backgroundColor: 'color-mix(in oklch, var(--surface-page) 80%, transparent)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid color-mix(in oklch, var(--border-default) 50%, transparent)',
          boxShadow: '0 20px 60px -15px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06) inset',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Constrained container for individual tray item stories. */
function TrayItemFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 360,
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

// ── Tray item stories ─────────────────────────────────────────────────────

const meta: Meta<typeof TrayItem> = {
  title: 'Inbox/Tray/TrayItem',
  component: TrayItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TrayItemFrame>
        <Story />
      </TrayItemFrame>
    ),
  ],
  args: {
    onMarkRead: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TrayItem>;

/** Unread tray item with SVG icon and description. */
export const UnreadWithIcon: Story = {
  args: { item: mockItems[0]! },
};

/** Unread item with emoji icon — shows "Mark as Read" button. */
export const UnreadWithEmoji: Story = {
  args: { item: mockItems[1]! },
};

/** Read item — muted styling, no "Mark as Read" button. */
export const ReadItem: Story = {
  args: { item: mockItems[5]! },
};

/** Item with no description — title only. */
export const NoDescription: Story = {
  args: { item: mockItems[4]! },
};

// ── Full tray stories ─────────────────────────────────────────────────────

export const TrayDefault: StoryObj<typeof TrayInbox> = {
  name: 'Tray — Default',
  render: (args) => (
    <TrayPopover>
      <TrayInbox {...args} />
    </TrayPopover>
  ),
  args: {
    items: mockItems.slice(0, 6),
    unreadCount: mockItems.filter((i) => !i.read).length,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onOpenInbox: fn(),
  },
};

export const TrayEmpty: StoryObj<typeof TrayInbox> = {
  name: 'Tray — Empty',
  render: (args) => (
    <TrayPopover>
      <TrayInbox {...args} />
    </TrayPopover>
  ),
  args: {
    items: [],
    unreadCount: 0,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onOpenInbox: fn(),
  },
};

export const TrayLoading: StoryObj<typeof TrayInbox> = {
  name: 'Tray — Loading',
  render: (args) => (
    <TrayPopover>
      <TrayInbox {...args} />
    </TrayPopover>
  ),
  args: {
    items: [],
    unreadCount: 0,
    loading: true,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onOpenInbox: fn(),
  },
};

export const TrayAllUnread: StoryObj<typeof TrayInbox> = {
  name: 'Tray — All Unread',
  render: (args) => (
    <TrayPopover>
      <TrayInbox {...args} />
    </TrayPopover>
  ),
  args: {
    items: unreadOnlyItems,
    unreadCount: unreadOnlyItems.length,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onOpenInbox: fn(),
  },
};

export const TrayAllRead: StoryObj<typeof TrayInbox> = {
  name: 'Tray — All Read',
  render: (args) => (
    <TrayPopover>
      <TrayInbox {...args} />
    </TrayPopover>
  ),
  args: {
    items: allReadItems.slice(0, 6),
    unreadCount: 0,
    loading: false,
    onMarkRead: fn(),
    onMarkAllRead: fn(),
    onOpenInbox: fn(),
  },
};
