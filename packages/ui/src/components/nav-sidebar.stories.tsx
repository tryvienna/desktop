import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import {
  SidePanel,
  NavHeaderActions,
  NavCreateButton,
  NavSettingsButton,
  type NavSectionData,
} from './nav-sidebar';

const meta = {
  title: 'Domain/SidePanel',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleSections: NavSectionData[] = [
  {
    id: 'workstreams',
    label: 'Workstreams',
    hasNotification: true,
    notificationCount: 3,
    items: [
      { id: 'ws-1', label: 'UI Migration', variant: 'item' as const, accentColor: '#10B981' },
      {
        id: 'ws-2',
        label: 'Backend Refactor',
        variant: 'item' as const,
        accentColor: '#6366F1',
        hasNotification: true,
      },
      { id: 'ws-3', label: 'Testing Suite', variant: 'item' as const },
    ],
    hoverActions: (
      <NavHeaderActions>
        <NavCreateButton onClick={fn('create')} />
      </NavHeaderActions>
    ),
  },
  {
    id: 'folders',
    label: 'Projects',
    items: [
      {
        id: 'folder-1',
        label: 'Frontend',
        variant: 'folder' as const,
        children: [
          { id: 'f1-1', label: 'Components', variant: 'item' as const },
          { id: 'f1-2', label: 'Pages', variant: 'item' as const },
          {
            id: 'f1-3',
            label: 'Utils',
            variant: 'folder' as const,
            children: [
              { id: 'f1-3-1', label: 'helpers.ts', variant: 'item' as const },
              { id: 'f1-3-2', label: 'cn.ts', variant: 'item' as const },
            ],
          },
        ],
      },
      {
        id: 'folder-2',
        label: 'Backend',
        variant: 'folder' as const,
        children: [
          { id: 'f2-1', label: 'API Routes', variant: 'item' as const },
          { id: 'f2-2', label: 'Database', variant: 'item' as const },
        ],
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { id: 'sep-1', label: '', variant: 'separator' as const },
      { id: 'set-1', label: 'Preferences', variant: 'item' as const },
      { id: 'set-2', label: 'Account', variant: 'item' as const },
    ],
    hoverActions: (
      <NavHeaderActions>
        <NavSettingsButton onClick={fn('settings')} />
      </NavHeaderActions>
    ),
  },
];

function SidePanelDemo() {
  const [selectedId, setSelectedId] = React.useState('ws-1');
  return (
    <div className="flex h-[600px] bg-background">
      <SidePanel
        sections={sampleSections}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        toggleShortcutKeys={['⌘', 'B']}
        header={<div className="px-4 py-3 text-sm font-semibold text-foreground">My App</div>}
        footer={<div className="px-4 py-3 text-xs text-muted-foreground">v1.0.0</div>}
      />
      <div className="flex-1 p-8">
        <p className="text-sm text-muted-foreground">Selected: {selectedId}</p>
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <SidePanelDemo />,
};

function CompactDemo() {
  const [selectedId, setSelectedId] = React.useState('ws-1');
  return (
    <div className="flex h-[600px] bg-background">
      <SidePanel
        sections={sampleSections}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        density="compact"
        header={<div className="px-3 py-2 text-xs font-semibold text-foreground">Compact Mode</div>}
      />
      <div className="flex-1 p-8">
        <p className="text-sm text-muted-foreground">Selected: {selectedId}</p>
      </div>
    </div>
  );
}

export const Compact: Story = {
  render: () => <CompactDemo />,
};

function CollapsedDemo() {
  const [collapsed, setCollapsed] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState('ws-1');
  return (
    <div className="flex h-[600px] bg-background">
      <SidePanel
        sections={sampleSections}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        toggleShortcutKeys={['⌘', 'B']}
      />
      <div className="flex-1 p-8">
        <p className="text-sm text-muted-foreground">
          Sidebar is {collapsed ? 'collapsed' : 'expanded'}. Click the glass pill or press ⌘B.
        </p>
      </div>
    </div>
  );
}

export const Collapsed: Story = {
  render: () => <CollapsedDemo />,
};

function RightPanelDemo() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState('ws-1');
  return (
    <div className="flex h-[600px] bg-background">
      <div className="flex-1 p-8">
        <p className="text-sm text-muted-foreground">
          Right panel is {collapsed ? 'collapsed' : 'expanded'}. Selected: {selectedId}
        </p>
      </div>
      <SidePanel
        side="right"
        sections={sampleSections}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        toggleShortcutKeys={['⌘', '\\']}
      />
    </div>
  );
}

export const RightPanel: Story = {
  render: () => <RightPanelDemo />,
};

function ThreeColumnDemo() {
  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState('ws-1');
  return (
    <div className="flex h-[600px] bg-background">
      <SidePanel
        sections={sampleSections}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        collapsed={leftCollapsed}
        onCollapsedChange={setLeftCollapsed}
        toggleShortcutKeys={['⌘', 'B']}
        header={<div className="px-4 py-3 text-sm font-semibold text-foreground">Navigation</div>}
      />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Selected: {selectedId}</p>
      </div>
      <SidePanel
        side="right"
        sections={sampleSections}
        collapsed={rightCollapsed}
        onCollapsedChange={setRightCollapsed}
        toggleShortcutKeys={['⌘', '\\']}
        header={<div className="px-4 py-3 text-sm font-semibold text-foreground">Details</div>}
      />
    </div>
  );
}

export const ThreeColumn: Story = {
  render: () => <ThreeColumnDemo />,
};

export const EmptySection: Story = {
  render: () => {
    const emptySection: NavSectionData[] = [
      {
        id: 'empty',
        label: 'Empty Section',
        items: [],
        emptyState: {
          message: 'No items yet',
          actionLabel: 'Create one',
          onAction: fn('create'),
        },
      },
    ];
    return (
      <div className="flex h-[400px] bg-background">
        <SidePanel sections={emptySection} />
        <div className="flex-1" />
      </div>
    );
  },
};
