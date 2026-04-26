/**
 * Palette System Storybooks
 *
 * Comprehensive interactive documentation for the entire Palette system:
 * primitives, states, entity palette, command palette, and flow system.
 * Each story demonstrates component behavior with realistic data and
 * every visual state.
 *
 * Designed for both humans and AI systems to learn every component's
 * API and behavior from the stories alone.
 *
 * @module chat-ui/components/Palette/Palette.stories
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/test';

// Primitives
import {
  PaletteContainer,
  PaletteTabBar,
  PaletteResultsList,
  PaletteResultItem,
  PaletteSection,
  EmptyState,
  LoadingState,
  ErrorState,
  DisconnectedState,
  PaletteFilterBar,
  PaletteKeyboardHints,
  KeyboardKey,
  KeyboardShortcutDisplay,
  PaletteEntityChip,
} from './primitives';

// Types
import type {
  PaletteTab,
  Entity,
  Command,
  EntityPaletteDataProvider,
  CommandPaletteDataProvider,
  PaletteFilterDefinition,
  ActivePaletteFilter,
} from './types';

// Icons
import { EntityIcon, CommandIcon } from './icons';

// Main components
import { EntityPalette } from './entity-palette';
import { CommandPalette } from './command-palette';

// Flow system
import { FlowScreen, FlowHeader, FlowList, FlowConfirmation, FlowSearchableList } from './flow-primitives';
import type { FlowListItemData, FlowSearchableListSection } from './flow-primitives';

// ═══════════════════════════════════════════════════════════════════════════════
// META
// ═══════════════════════════════════════════════════════════════════════════════

const meta: Meta = {
  title: 'Palette System',
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component: `
# Palette System

A complete command and entity palette framework for keyboard-driven navigation.
Two main palettes (Entity and Command) are built from shared primitives,
ensuring visual and behavioral consistency.

## Architecture

- **Primitives** - PaletteContainer, TabBar, ResultsList, ResultItem, Section,
  States, FilterBar, KeyboardHints, EntityChip
- **Icons** - EntityIcon (per entity type) and CommandIcon (per category)
- **EntityPalette** - Triggered by \`@\` in chat input; searches entities
  (Linear issues, GitHub PRs, Gmail, files, etc.)
- **CommandPalette** - Triggered by \`/\` at start of input; executes commands
  with keyboard shortcuts and multi-step flows
- **Flow System** - FlowHeader, FlowList, FlowConfirmation for multi-step
  command flows within the palette container

## Visual Language

All palette components share:
- Fixed height (388px) PaletteContainer with rounded-2xl border
- Animated tab indicator (brand color)
- Left-border selection indicator on result items
- Spring-animated checked state for bulk selection
- Theme-aware colors via CSS variable semantic tokens
- Keyboard hints footer with styled key badges
        `,
      },
    },
  },
};

export default meta;

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED STYLES & DATA
// ═══════════════════════════════════════════════════════════════════════════════

const wrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 560,
  padding: 24,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-muted)',
  marginBottom: 4,
};

const demoTabs: PaletteTab[] = [
  { id: 'all', label: 'All', shortLabel: 'All' },
  { id: 'linear', label: 'Linear', shortLabel: 'Linear' },
  { id: 'github_pr', label: 'GitHub', shortLabel: 'GitHub' },
  { id: 'gmail', label: 'Gmail', shortLabel: 'Gmail' },
  { id: 'local_file', label: 'Files', shortLabel: 'Files' },
];

const commandTabs: PaletteTab[] = [
  { id: 'all', label: 'All', shortLabel: 'All' },
  { id: 'claude', label: 'Claude', shortLabel: 'Claude' },
  { id: 'navigation', label: 'Navigation', shortLabel: 'Nav' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings' },
];

const sampleEntities: Entity[] = [
  {
    id: '1',
    type: 'linear',
    title: 'Fix authentication bug',
    subtitle: 'DRF-142',
    metadata: { status: 'In Progress', statusVariant: 'active', time: '2h ago' },
  },
  {
    id: '2',
    type: 'github_pr',
    title: 'Add dark mode support',
    subtitle: 'anthropics/vienna#42',
    metadata: { status: 'Open', statusVariant: 'default', number: '#42' },
  },
  {
    id: '3',
    type: 'gmail',
    title: 'Meeting notes from standup',
    subtitle: 'team@company.com',
    metadata: { time: '1h ago' },
  },
  { id: '4', type: 'local_file', title: 'README.md', subtitle: '/Users/will/project/README.md' },
  { id: '5', type: 'slack', title: '#development channel', subtitle: 'Latest: deployment update' },
  {
    id: '6',
    type: 'sentry_issue',
    title: 'TypeError: Cannot read property',
    subtitle: 'SENTRY-789',
    metadata: { status: 'Unresolved', statusVariant: 'error' },
  },
];

const sampleCommands: Command[] = [
  {
    id: 'new-workstream',
    category: 'workstream',
    title: 'New Workstream',
    description: 'Create a new workstream',
    shortcut: { modifiers: ['cmd'], key: 'N' },
  },
  {
    id: 'open-settings',
    category: 'settings',
    title: 'Open Settings',
    description: 'Application settings',
    shortcut: { modifiers: ['cmd'], key: ',' },
  },
  {
    id: 'toggle-sidebar',
    category: 'view',
    title: 'Toggle Sidebar',
    description: 'Show/hide the sidebar',
  },
  { id: 'commit', category: 'claude', title: '/commit', description: 'Create a git commit' },
  {
    id: 'review-pr',
    category: 'claude',
    title: '/review-pr',
    description: 'Review a pull request',
  },
  {
    id: 'go-to-file',
    category: 'navigation',
    title: 'Go to File',
    description: 'Quick file navigation',
    shortcut: { modifiers: ['cmd'], key: 'P' },
    hasFlow: true,
  },
  {
    id: 'disabled-cmd',
    category: 'developer',
    title: 'Debug Mode',
    description: 'Toggle debug mode',
    disabled: true,
    disabledReason: 'Only available in development',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PRIMITIVES OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function PrimitivesOverviewDemo() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredEntities =
    activeTab === 'all' ? sampleEntities : sampleEntities.filter((e) => e.type === activeTab);

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>Full primitives composition</div>
      <PaletteContainer>
        <PaletteTabBar
          tabs={demoTabs}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedIndex(0);
          }}
          resultCounts={{
            all: sampleEntities.length,
            linear: sampleEntities.filter((e) => e.type === 'linear').length,
            github_pr: sampleEntities.filter((e) => e.type === 'github_pr').length,
            gmail: sampleEntities.filter((e) => e.type === 'gmail').length,
            local_file: sampleEntities.filter((e) => e.type === 'local_file').length,
          }}
        />
        <PaletteResultsList>
          <PaletteSection title="Results" />
          {filteredEntities.map((entity, index) => (
            <PaletteResultItem
              key={entity.id}
              title={entity.title}
              subtitle={entity.subtitle}
              icon={<EntityIcon type={entity.type} size={16} />}
              metadata={
                entity.metadata && (
                  <span style={{ fontSize: 11, opacity: 0.7 }}>
                    {entity.metadata.status || entity.metadata.time}
                  </span>
                )
              }
              selected={index === selectedIndex}
              onSelect={() => alert(`Selected: ${entity.title}`)}
              onHover={() => setSelectedIndex(index)}
            />
          ))}
        </PaletteResultsList>
        <PaletteKeyboardHints hints={['navigate', 'select', 'tab', 'close']} />
      </PaletteContainer>
    </div>
  );
}

export const PrimitivesOverview: StoryObj = {
  render: () => <PrimitivesOverviewDemo />,
  parameters: {
    docs: {
      description: {
        story: `**PrimitivesOverview** -- Shows all core primitives composed together:
PaletteContainer > PaletteTabBar > PaletteResultsList > PaletteSection > PaletteResultItem > PaletteKeyboardHints.
Click tabs to filter results. Hover items to change selection. Demonstrates the full vertical layout stack.`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TAB BAR
// ═══════════════════════════════════════════════════════════════════════════════

function TabBarDemo() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>With result count badges</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <PaletteTabBar
          tabs={demoTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          resultCounts={{ all: 42, linear: 8, github_pr: 12, gmail: 5, local_file: 17 }}
        />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Active tab: <strong style={{ color: 'var(--text-primary)' }}>{activeTab}</strong>
      </div>

      <div style={labelStyle}>Without result counts</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <PaletteTabBar tabs={demoTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div style={labelStyle}>Many tabs (scroll overflow)</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          maxWidth: 320,
        }}
      >
        <PaletteTabBar
          tabs={[
            ...demoTabs,
            { id: 'slack', label: 'Slack', shortLabel: 'Slack' },
            { id: 'sentry_issue', label: 'Sentry', shortLabel: 'Sentry' },
            { id: 'calendar_event', label: 'Calendar', shortLabel: 'Cal' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          resultCounts={{
            all: 99,
            linear: 8,
            github_pr: 12,
            gmail: 5,
            local_file: 17,
            slack: 3,
            sentry_issue: 2,
            calendar_event: 1,
          }}
        />
      </div>
    </div>
  );
}

export const TabBar: StoryObj = {
  render: () => <TabBarDemo />,
  parameters: {
    docs: {
      description: {
        story: `**PaletteTabBar** -- Horizontal tab navigation with animated underline indicator.

Props:
- \`tabs\`: PaletteTab[] (id, label, shortLabel)
- \`activeTab\`: string (current tab ID)
- \`onTabChange\`: (tabId: string) => void
- \`resultCounts?\`: Record<string, number> (badge per tab)

Features:
- Animated brand-colored underline indicator
- Badge counts (capped at 99+)
- Hidden scrollbar for overflow
- Active tab auto-scrolls into view`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. RESULT ITEM
// ═══════════════════════════════════════════════════════════════════════════════

export const ResultItem: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <div style={labelStyle}>Normal (not selected)</div>
      <PaletteResultItem
        title="Fix authentication bug"
        subtitle="DRF-142"
        icon={<EntityIcon type="linear" size={16} />}
        metadata={<span style={{ fontSize: 11 }}>2h ago</span>}
      />

      <div style={labelStyle}>Selected (keyboard navigation)</div>
      <PaletteResultItem
        title="Add dark mode support"
        subtitle="anthropics/vienna#42"
        icon={<EntityIcon type="github_pr" size={16} />}
        metadata={<span style={{ fontSize: 11 }}>Open</span>}
        selected
      />

      <div style={labelStyle}>Disabled</div>
      <PaletteResultItem
        title="Debug Mode"
        subtitle="Only available in development"
        icon={<CommandIcon category="developer" size={16} />}
        disabled
      />

      <div style={labelStyle}>With rich metadata</div>
      <PaletteResultItem
        title="Performance regression in dashboard"
        subtitle="TEAM-456"
        icon={<EntityIcon type="linear" size={16} />}
        metadata={
          <>
            <span
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid var(--border-muted)',
                color: 'var(--text-muted)',
              }}
            >
              In Progress
            </span>
            <span style={{ fontSize: 11, fontFamily: 'monospace' }}>#456</span>
          </>
        }
        selected
      />

      <div style={labelStyle}>Checked state (bulk selection)</div>
      <PaletteResultItem
        title="README.md"
        subtitle="/Users/will/project/README.md"
        icon={<EntityIcon type="local_file" size={16} />}
        checked={true}
      />

      <div style={labelStyle}>Unchecked state (bulk selection)</div>
      <PaletteResultItem
        title="package.json"
        subtitle="/Users/will/project/package.json"
        icon={<EntityIcon type="local_file" size={16} />}
        checked={false}
      />

      <div style={labelStyle}>Selected + checked</div>
      <PaletteResultItem
        title="tsconfig.json"
        subtitle="/Users/will/project/tsconfig.json"
        icon={<EntityIcon type="local_file" size={16} />}
        checked={true}
        selected
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `**PaletteResultItem** -- Generic result row for all palette types.

Props:
- \`title\`: string (primary text, truncates)
- \`subtitle?\`: string (secondary text, truncates)
- \`icon?\`: ReactNode (left-side icon)
- \`metadata?\`: ReactNode (right-side content: badges, timestamps)
- \`selected?\`: boolean (keyboard navigation highlight + left border indicator)
- \`checked?\`: boolean | undefined (when defined, shows animated check circle)
- \`disabled?\`: boolean (grayed out, non-interactive)
- \`onSelect?\`: () => void (click handler)
- \`onHover?\`: () => void (mouse enter for hover-to-select)

Visual states:
- Normal: transparent background
- Selected: elevated background + brand left-border indicator
- Disabled: 50% opacity, cursor not-allowed
- Checked: brand/10 background, brand font color, spring-animated check circle
- Unchecked: empty circle with border-muted border`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. RESULT ITEM CHECKED (INTERACTIVE)
// ═══════════════════════════════════════════════════════════════════════════════

function ResultItemCheckedDemo() {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(['1', '3']));

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const items = [
    { id: '1', title: 'README.md', subtitle: '/project/README.md' },
    { id: '2', title: 'package.json', subtitle: '/project/package.json' },
    { id: '3', title: 'tsconfig.json', subtitle: '/project/tsconfig.json' },
    { id: '4', title: 'index.ts', subtitle: '/project/src/index.ts' },
  ];

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>Click items to toggle checked state</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <PaletteResultsList>
          {items.map((item) => (
            <PaletteResultItem
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              icon={<EntityIcon type="local_file" size={16} />}
              checked={checkedIds.has(item.id)}
              onSelect={() => toggleCheck(item.id)}
            />
          ))}
        </PaletteResultsList>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Checked:{' '}
        <strong style={{ color: 'var(--text-primary)' }}>
          {checkedIds.size > 0 ? Array.from(checkedIds).join(', ') : 'none'}
        </strong>
      </div>
    </div>
  );
}

export const ResultItemChecked: StoryObj = {
  render: () => <ResultItemCheckedDemo />,
  parameters: {
    docs: {
      description: {
        story: `**PaletteResultItem checked toggle** -- Interactive demo of bulk selection.

When \`checked\` prop is defined (boolean, not undefined), a check circle appears
on the right side of the item. The circle uses framer-motion spring animation
when transitioning between checked/unchecked states.

Click any item to toggle its checked state and observe the animated transition.`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SECTION HEADERS
// ═══════════════════════════════════════════════════════════════════════════════

export const SectionHeaders: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <div style={labelStyle}>Standard section header</div>
      <PaletteSection title="Recent" />

      <div style={labelStyle}>Section header with loading spinner</div>
      <PaletteSection title="Files" isLoading />

      <div style={labelStyle}>Multiple sections in context</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <PaletteResultsList>
          <PaletteSection title="Recent" />
          <PaletteResultItem
            title="Fix authentication bug"
            subtitle="DRF-142"
            icon={<EntityIcon type="linear" size={16} />}
          />
          <PaletteResultItem
            title="Meeting notes from standup"
            subtitle="team@company.com"
            icon={<EntityIcon type="gmail" size={16} />}
          />

          <PaletteSection title="Files" isLoading />
          <PaletteResultItem
            title="README.md"
            subtitle="/Users/will/project/README.md"
            icon={<EntityIcon type="local_file" size={16} />}
          />

          <PaletteSection title="Linear" />
          <PaletteResultItem
            title="Performance regression"
            subtitle="TEAM-456"
            icon={<EntityIcon type="linear" size={16} />}
          />
        </PaletteResultsList>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `**PaletteSection** -- Group label for result sections.

Props:
- \`title\`: string (uppercase small text with letter-spacing)
- \`isLoading?\`: boolean (shows animated spinner next to title)

Used to visually separate groups of results (e.g., "Recent", "Files", "Linear").
The loading spinner indicates that a section is still streaming or fetching results.`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PALETTE STATES
// ═══════════════════════════════════════════════════════════════════════════════

function PaletteStatesDemo() {
  const [retryCount, setRetryCount] = useState(0);

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>EmptyState -- no results</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 160,
        }}
      >
        <EmptyState message="No results found" hint="Try a different search term" />
      </div>

      <div style={labelStyle}>EmptyState -- no hint</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 160,
        }}
      >
        <EmptyState message="No recent items" />
      </div>

      <div style={labelStyle}>LoadingState</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 160,
        }}
      >
        <LoadingState message="Searching..." />
      </div>

      <div style={labelStyle}>LoadingState -- default message</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 160,
        }}
      >
        <LoadingState />
      </div>

      <div style={labelStyle}>ErrorState with retry (clicked {retryCount} times)</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 180,
        }}
      >
        <ErrorState
          message="Failed to load results"
          onRetry={() => setRetryCount((c) => c + 1)}
          retryText="Try again"
        />
      </div>

      <div style={labelStyle}>ErrorState without retry</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 160,
        }}
      >
        <ErrorState message="Rate limit exceeded. Please try again later." />
      </div>

      <div style={labelStyle}>DisconnectedState with connect</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 180,
        }}
      >
        <DisconnectedState
          integrationName="Linear"
          onConnect={() => alert('Connect Linear clicked')}
          connectText="Connect Linear"
        />
      </div>

      <div style={labelStyle}>DisconnectedState without connect</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 160,
        }}
      >
        <DisconnectedState integrationName="Calendar" />
      </div>
    </div>
  );
}

export const PaletteStates: StoryObj = {
  render: () => <PaletteStatesDemo />,
  parameters: {
    docs: {
      description: {
        story: `**Palette States** -- All four feedback states for palette components.

**EmptyState** (message, hint?)
- Centered message + optional hint text
- Used when search returns no matches

**LoadingState** (message?)
- Animated spinner + message (default: "Loading...")
- role="status" + aria-live="polite"

**ErrorState** (message, onRetry?, retryText?)
- AlertCircle icon + message + optional retry button
- role="alert" for screen readers

**DisconnectedState** (integrationName, onConnect?, connectText?)
- Globe icon + "[name] is not connected" + optional connect button
- Used when a data source requires authentication`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. FILTER BAR
// ═══════════════════════════════════════════════════════════════════════════════

function FilterBarDemo() {
  const [activeFilters, setActiveFilters] = useState<ActivePaletteFilter[]>([]);

  const statusFilter: PaletteFilterDefinition = {
    key: 'status',
    label: 'Status',
    aliases: ['s'],
    values: [
      { id: 'todo', label: 'Todo', colorToken: 'muted' },
      { id: 'in-progress', label: 'In Progress', colorToken: 'brand', aliases: ['wip'] },
      { id: 'done', label: 'Done', colorToken: 'success' },
      { id: 'cancelled', label: 'Cancelled', colorToken: 'muted' },
    ],
  };

  const priorityFilter: PaletteFilterDefinition = {
    key: 'priority',
    label: 'Priority',
    aliases: ['p'],
    values: [
      { id: 'urgent', label: 'Urgent', colorToken: 'error' },
      { id: 'high', label: 'High', colorToken: 'warning' },
      { id: 'medium', label: 'Medium', colorToken: 'brand' },
      { id: 'low', label: 'Low', colorToken: 'muted' },
    ],
  };

  const assigneeFilter: PaletteFilterDefinition = {
    key: 'assignee',
    label: 'Assignee',
    values: [
      { id: 'me', label: 'Me' },
      { id: 'unassigned', label: 'Unassigned' },
      { id: 'will', label: 'Will' },
      { id: 'alex', label: 'Alex' },
    ],
  };

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>Interactive filter bar -- click buttons to toggle values</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <PaletteFilterBar
          filters={[statusFilter, priorityFilter, assigneeFilter]}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
        />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Active filters:{' '}
        <strong style={{ color: 'var(--text-primary)' }}>
          {activeFilters.length === 0
            ? 'none'
            : activeFilters.map((f) => `${f.key}:${f.values.join(',')}`).join(' AND ')}
        </strong>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        Filter logic: multiple values within the same key are OR'd; different keys are AND'd.
        <br />
        E.g., (status=done OR status=cancelled) AND priority=high
      </div>

      <div style={labelStyle}>Pre-populated filters</div>
      <PrePopulatedFilterDemo filters={[statusFilter, priorityFilter]} />

      <div style={labelStyle}>Empty filter definitions (renders nothing)</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          padding: 8,
        }}
      >
        <PaletteFilterBar filters={[]} activeFilters={[]} onFiltersChange={() => {}} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          (PaletteFilterBar returns null when filters array is empty)
        </span>
      </div>
    </div>
  );
}

function PrePopulatedFilterDemo({ filters }: { filters: PaletteFilterDefinition[] }) {
  const [activeFilters, setActiveFilters] = useState<ActivePaletteFilter[]>([
    { key: 'status', values: ['in-progress'] },
    { key: 'priority', values: ['high', 'urgent'] },
  ]);

  return (
    <div
      style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
    >
      <PaletteFilterBar
        filters={filters}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
      />
    </div>
  );
}

export const FilterBar: StoryObj = {
  render: () => <FilterBarDemo />,
  parameters: {
    docs: {
      description: {
        story: `**PaletteFilterBar** -- Filter controls rendered between the tab bar and results list.

Props:
- \`filters\`: PaletteFilterDefinition[] (filter key definitions with values)
- \`activeFilters\`: ActivePaletteFilter[] (currently active key:value selections)
- \`onFiltersChange\`: (filters: ActivePaletteFilter[]) => void

Each PaletteFilterDefinition has:
- \`key\`: string (e.g., "status")
- \`label\`: string (button text)
- \`aliases?\`: string[] (shorthand for keyword syntax)
- \`values\`: PaletteFilterValue[] (id, label, colorToken?, aliases?, icon?)

Features:
- Dropdown value picker rendered via portal (escapes overflow:hidden)
- Multi-select within a key (OR logic)
- Active count badge on key button
- "Clear" button when any filter is active
- Returns null when filters array is empty`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. KEYBOARD HINTS
// ═══════════════════════════════════════════════════════════════════════════════

export const KeyboardHints: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <div style={labelStyle}>All hints (default)</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <PaletteKeyboardHints />
      </div>

      <div style={labelStyle}>Navigate + select + close</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <PaletteKeyboardHints hints={['navigate', 'select', 'close']} />
      </div>

      <div style={labelStyle}>Navigate + select + back (flow screens)</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <PaletteKeyboardHints hints={['navigate', 'select', 'back']} />
      </div>

      <div style={labelStyle}>Navigate only</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <PaletteKeyboardHints hints={['navigate']} />
      </div>

      <div style={labelStyle}>Close only</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <PaletteKeyboardHints hints={['close']} />
      </div>

      <div style={labelStyle}>Individual KeyboardKey + KeyboardShortcutDisplay</div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <KeyboardKey size="sm">Esc</KeyboardKey>
          <KeyboardKey size="sm">Tab</KeyboardKey>
          <KeyboardKey size="md">Enter</KeyboardKey>
        </div>
        <KeyboardShortcutDisplay shortcut={{ modifiers: ['cmd', 'shift'], key: 'P' }} size="sm" />
        <KeyboardShortcutDisplay shortcut={{ modifiers: ['cmd'], key: 'N' }} size="md" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `**PaletteKeyboardHints** -- Footer bar showing available keyboard shortcuts.

Props:
- \`hints?\`: KeyboardHintType[] (default: ['navigate', 'select', 'tab', 'close'])

Available hint types:
- \`navigate\` -- up/down arrows, left-aligned
- \`select\` -- Enter key, left-aligned
- \`tab\` -- Tab key for switching tabs, left-aligned
- \`back\` -- Esc key for going back (flow screens), right-aligned
- \`close\` -- Esc key for closing palette, right-aligned

Sub-components:
- **KeyboardKey** (children: string, size: 'sm' | 'md') -- Styled kbd element
- **KeyboardShortcutDisplay** (shortcut: KeyboardShortcut, size?) -- Renders modifier symbols + key`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. ENTITY CHIP
// ═══════════════════════════════════════════════════════════════════════════════

export const EntityChip: StoryObj = {
  render: () => (
    <div style={wrapStyle}>
      <div style={labelStyle}>Default variant</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PaletteEntityChip
          label="Fix authentication bug"
          type="linear"
          icon={<EntityIcon type="linear" size={14} />}
          onClick={() => alert('Clicked chip')}
          onRemove={() => alert('Remove chip')}
        />
        <PaletteEntityChip
          label="Add dark mode support"
          type="github_pr"
          icon={<EntityIcon type="github_pr" size={14} />}
          onClick={() => alert('Clicked chip')}
          onRemove={() => alert('Remove chip')}
        />
        <PaletteEntityChip
          label="Meeting notes"
          type="gmail"
          icon={<EntityIcon type="gmail" size={14} />}
          onClick={() => alert('Clicked chip')}
          onRemove={() => alert('Remove chip')}
        />
      </div>

      <div style={labelStyle}>Brand variant</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PaletteEntityChip
          label="Feature request"
          variant="brand"
          icon={<EntityIcon type="linear" size={14} />}
          onClick={() => alert('Clicked chip')}
          onRemove={() => alert('Remove chip')}
        />
        <PaletteEntityChip
          label="High priority task"
          variant="brand"
          onClick={() => alert('Clicked chip')}
          onRemove={() => alert('Remove chip')}
        />
      </div>

      <div style={labelStyle}>Without remove button</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PaletteEntityChip
          label="README.md"
          type="local_file"
          icon={<EntityIcon type="local_file" size={14} />}
          removable={false}
          onClick={() => alert('Clicked chip')}
        />
        <PaletteEntityChip label="Non-removable chip" removable={false} />
      </div>

      <div style={labelStyle}>Without icon</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PaletteEntityChip
          label="Plain text chip"
          onClick={() => alert('Clicked chip')}
          onRemove={() => alert('Remove chip')}
        />
        <PaletteEntityChip
          label="Brand plain chip"
          variant="brand"
          onClick={() => alert('Clicked chip')}
          onRemove={() => alert('Remove chip')}
        />
      </div>

      <div style={labelStyle}>Long label (truncation)</div>
      <div style={{ maxWidth: 200 }}>
        <PaletteEntityChip
          label="This is a very long entity title that should be truncated with an ellipsis"
          type="linear"
          icon={<EntityIcon type="linear" size={14} />}
          onClick={() => alert('Clicked chip')}
          onRemove={() => alert('Remove chip')}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `**PaletteEntityChip** -- Clickable chip for entity references in chat input.

Props:
- \`label\`: string (human-readable text, truncates)
- \`type?\`: EntityType (data attribute, icon/color mapping)
- \`variant?\`: 'default' | 'brand' (CVA variant)
- \`icon?\`: ReactNode (left-side icon)
- \`onClick?\`: () => void (chip body click)
- \`onRemove?\`: () => void (X button click, only shown when removable)
- \`removable?\`: boolean (default true, controls X button visibility)

Features:
- Remove (X) button appears on hover via group-hover CSS
- Two variants: default (neutral) and brand (tinted)
- Automatic label truncation
- onClick and onRemove have separate event propagation control`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 10. ENTITY PALETTE DEMO
// ═══════════════════════════════════════════════════════════════════════════════

const mockEntityProvider: EntityPaletteDataProvider = {
  search: async (query, typeFilter) => {
    await new Promise((r) => setTimeout(r, 200));
    const entities: Entity[] = [
      {
        id: '1',
        type: 'linear',
        title: 'Fix authentication bug',
        subtitle: 'DRF-142',
        metadata: { status: 'In Progress', time: '2h ago' },
      },
      {
        id: '2',
        type: 'github_pr',
        title: 'Add dark mode support',
        subtitle: 'anthropics/vienna#42',
        metadata: { status: 'Open', number: '#42' },
      },
      {
        id: '3',
        type: 'gmail',
        title: 'Meeting notes from standup',
        subtitle: 'team@company.com',
        metadata: { time: '1h ago' },
      },
      {
        id: '4',
        type: 'local_file',
        title: 'README.md',
        subtitle: '/Users/will/project/README.md',
      },
      {
        id: '5',
        type: 'slack',
        title: '#development channel',
        subtitle: 'Latest: deployment update',
      },
      {
        id: '6',
        type: 'sentry_issue',
        title: 'TypeError: Cannot read property',
        subtitle: 'SENTRY-789',
        metadata: { status: 'Unresolved' },
      },
      {
        id: '7',
        type: 'linear',
        title: 'Implement SSO login flow',
        subtitle: 'DRF-201',
        metadata: { status: 'Todo', time: '1d ago' },
      },
      {
        id: '8',
        type: 'github_pr',
        title: 'Refactor database queries',
        subtitle: 'anthropics/vienna#58',
        metadata: { status: 'Merged', number: '#58' },
      },
    ];
    let filtered = entities;
    if (query) {
      filtered = filtered.filter((e) => e.title.toLowerCase().includes(query.toLowerCase()));
    }
    if (typeFilter) {
      filtered = filtered.filter((e) => e.type === typeFilter);
    }
    return filtered;
  },
  getRecents: async () => [
    {
      id: '1',
      type: 'linear',
      title: 'Fix authentication bug',
      subtitle: 'DRF-142',
      metadata: { status: 'In Progress' },
    },
    { id: '3', type: 'gmail', title: 'Meeting notes from standup', subtitle: 'team@company.com' },
  ],
  markAccessed: () => {},
  isSourceConnected: (type) => type !== 'calendar_event',
};

function EntityPaletteDemoInner() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>Search input</div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type @ to search entities..."
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--border-default)',
          background: 'var(--surface-page)',
          color: 'var(--text-primary)',
          fontSize: 14,
          outline: 'none',
        }}
      />

      <EntityPalette
        isOpen
        onClose={() => alert('Close palette')}
        onSelect={(entity) => setLastSelected(entity.title)}
        dataProvider={mockEntityProvider}
        query={query}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={demoTabs}
        onConnectIntegration={(type) => alert(`Connect: ${type}`)}
      />

      {lastSelected && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Last selected: <strong style={{ color: 'var(--text-primary)' }}>{lastSelected}</strong>
        </div>
      )}
    </div>
  );
}

export const EntityPaletteDemo: StoryObj = {
  render: () => <EntityPaletteDemoInner />,
  parameters: {
    docs: {
      description: {
        story: `**EntityPalette** -- Full entity search palette with mock data provider.

Props:
- \`isOpen\`: boolean
- \`onClose\`: () => void
- \`onSelect\`: (entity: Entity) => void
- \`dataProvider\`: EntityPaletteDataProvider (search, getRecents, markAccessed, isSourceConnected)
- \`query?\`: string (controlled search)
- \`activeTab?\`: string (controlled tab)
- \`onTabChange?\`: (tabId) => void
- \`tabs?\`: PaletteTab[]
- \`maxResults?\`: number (default 20)
- \`onConnectIntegration?\`: (type) => void

DataProvider interface:
- \`search(query, typeFilter?, filters?, signal?)\` -- Returns Entity[] or PaletteSection<Entity>[]
- \`getRecents(limit?)\` -- Returns recently accessed entities
- \`markAccessed(entity)\` -- Tracks entity access for recents
- \`isSourceConnected(type)\` -- Checks integration connection status
- \`getFiltersForType?(type)\` -- Returns filter definitions for a tab
- \`getInitialFilters?()\` -- Returns pre-populated filters

Type the search input to filter entities. Switch tabs to filter by type.
The "Calendar" tab would show a DisconnectedState (calendar_event is not connected in mock).`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 11. COMMAND PALETTE DEMO
// ═══════════════════════════════════════════════════════════════════════════════

const mockCommandProvider: CommandPaletteDataProvider = {
  getCommands: async () => sampleCommands,
  search: async (query) => {
    await new Promise((r) => setTimeout(r, 150));
    return sampleCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        (c.description?.toLowerCase().includes(query.toLowerCase()) ?? false)
    );
  },
  getRecents: async () => [
    { id: 'commit', category: 'claude', title: '/commit', description: 'Create a git commit' },
  ],
  execute: async (cmd) => action('Execute')(cmd.id),
  markRecent: () => {},
};

function CommandPaletteDemoInner() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>Search input</div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type / to search commands..."
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--border-default)',
          background: 'var(--surface-page)',
          color: 'var(--text-primary)',
          fontSize: 14,
          outline: 'none',
        }}
      />

      <CommandPalette
        isOpen
        onClose={() => alert('Close palette')}
        onExecute={(cmd) => {
          setLastExecuted(cmd.title);
          mockCommandProvider.execute(cmd);
        }}
        dataProvider={mockCommandProvider}
        query={query}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={commandTabs}
      />

      {lastExecuted && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Last executed: <strong style={{ color: 'var(--text-primary)' }}>{lastExecuted}</strong>
        </div>
      )}
    </div>
  );
}

export const CommandPaletteDemo: StoryObj = {
  render: () => <CommandPaletteDemoInner />,
  parameters: {
    docs: {
      description: {
        story: `**CommandPalette** -- Full command execution palette with mock data provider.

Props:
- \`isOpen\`: boolean
- \`onClose\`: () => void
- \`onExecute\`: (command: Command) => void
- \`dataProvider\`: CommandPaletteDataProvider
- \`query?\`: string (controlled search)
- \`activeTab?\`: string (controlled tab)
- \`onTabChange?\`: (tabId) => void
- \`tabs?\`: PaletteTab[]
- \`maxResults?\`: number (default 20)
- \`flowRegistry?\`: Record<string, FlowDefinition>

CommandPaletteDataProvider interface:
- \`getCommands(categoryFilter?)\` -- Returns all commands
- \`search(query, categoryFilter?, signal?)\` -- Returns matching commands
- \`getRecents(limit?)\` -- Returns recently used commands
- \`execute(command)\` -- Executes a command
- \`markRecent(command)\` -- Tracks command usage

Command interface:
- \`id\`, \`category\` (CommandCategory), \`title\`, \`description?\`
- \`shortcut?\` (KeyboardShortcut: modifiers + key)
- \`disabled?\`, \`disabledReason?\`
- \`icon?\`, \`keywords?\`, \`hasFlow?\`

Type the search input to filter commands. Switch tabs to filter by category.
Disabled commands show their disabledReason as subtitle and cannot be executed.`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 12. FLOW PRIMITIVES DEMO
// ═══════════════════════════════════════════════════════════════════════════════

function FlowPrimitivesDemoInner() {
  const [screenIndex, setScreenIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const projects: FlowListItemData[] = [
    {
      id: 'vienna',
      label: 'Vienna',
      description: 'Main product',
      icon: <EntityIcon type="workstream" size={16} />,
      onSelect: () => {
        setSelectedProject('Vienna');
        setScreenIndex(1);
      },
    },
    {
      id: 'vienna',
      label: 'Vienna',
      description: 'Design system',
      icon: <EntityIcon type="workstream" size={16} />,
      onSelect: () => {
        setSelectedProject('Vienna');
        setScreenIndex(1);
      },
    },
    {
      id: 'chat-ui',
      label: 'Chat UI',
      description: 'Component library',
      icon: <EntityIcon type="workstream" size={16} />,
      onSelect: () => {
        setSelectedProject('Chat UI');
        setScreenIndex(1);
      },
    },
  ];

  const issueTypes: FlowListItemData[] = [
    {
      id: 'bug',
      label: 'Bug',
      description: 'Something is broken',
      icon: <EntityIcon type="sentry_issue" size={16} />,
      onSelect: () => setScreenIndex(2),
    },
    {
      id: 'feature',
      label: 'Feature',
      description: 'New functionality',
      icon: <EntityIcon type="linear" size={16} />,
      onSelect: () => setScreenIndex(2),
    },
    {
      id: 'improvement',
      label: 'Improvement',
      description: 'Enhance existing feature',
      icon: <EntityIcon type="github_pr" size={16} />,
      onSelect: () => setScreenIndex(2),
    },
  ];

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>FlowHeader -- with back button and progress dots</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <FlowHeader
          title="Create Linear Issue"
          subtitle="Step 1: Select Project"
          onBack={screenIndex > 0 ? () => setScreenIndex((i) => i - 1) : undefined}
          screenIndex={screenIndex}
          totalScreens={3}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setScreenIndex(i)}
            style={{
              fontSize: 11,
              padding: '3px 8px',
              cursor: 'pointer',
              fontWeight: screenIndex === i ? 700 : 400,
              background: screenIndex === i ? 'var(--surface-elevated)' : 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              color: 'var(--text-primary)',
            }}
          >
            Step {i + 1}
          </button>
        ))}
      </div>

      <div style={labelStyle}>FlowHeader -- without back (first screen)</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <FlowHeader title="Select File" screenIndex={0} totalScreens={1} />
      </div>

      <div style={labelStyle}>FlowList -- keyboard-navigable list (arrow keys + Enter)</div>
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
          height: 200,
        }}
      >
        <FlowScreen>
          <FlowList items={screenIndex === 0 ? projects : issueTypes} />
        </FlowScreen>
      </div>

      <div style={labelStyle}>FlowConfirmation -- confirm/cancel dialog</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <FlowConfirmation
          title="Delete workstream?"
          message="This will permanently delete the workstream and all its messages. This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={() => alert('Confirmed!')}
          onCancel={() => alert('Cancelled!')}
        />
      </div>

      <div style={labelStyle}>FlowConfirmation -- default variant</div>
      <div
        style={{ border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}
      >
        <FlowConfirmation
          title="Create issue in Vienna?"
          message={selectedProject ? `Project: ${selectedProject}` : 'Select a project first'}
          confirmLabel="Create"
          cancelLabel="Back"
          onConfirm={() => alert('Created!')}
          onCancel={() => setScreenIndex(0)}
        />
      </div>
    </div>
  );
}

export const FlowPrimitivesDemo: StoryObj = {
  render: () => <FlowPrimitivesDemoInner />,
  parameters: {
    docs: {
      description: {
        story: `**Flow Primitives** -- Building blocks for multi-step command flows inside the palette.

**FlowScreen** (children, className?)
- Container with flex column layout, fills remaining space in PaletteContainer

**FlowHeader** (title, subtitle?, onBack?, screenIndex?, totalScreens?)
- Header bar with title, optional back arrow, and progress dots
- Progress dots: brand-colored for current screen, border-default for others
- Back button only shown when onBack is provided

**FlowList** (items: FlowListItemData[], initialIndex?)
- Keyboard-navigable list using PaletteResultItem for consistent styling
- Handles ArrowUp/ArrowDown/Enter via FlowKeyboardContext or document listener
- FlowListItemData: { id, label, description?, icon?, checked?, onSelect }

**FlowConfirmation** (title, message?, confirmLabel?, cancelLabel?, confirmVariant?, onConfirm, onCancel)
- Confirm/cancel dialog for destructive or important actions
- confirmVariant: 'default' (brand) or 'danger' (error red)
- Keyboard: Enter activates focused button, ArrowLeft/Right switches focus
- Default focus is on Confirm button`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 13. FLOW SEARCHABLE LIST DEMO
// ═══════════════════════════════════════════════════════════════════════════════

const allWorkstreams = [
  { id: 'ws-1', title: 'Build command palette', status: 'active', lastActivity: '2 min ago' },
  { id: 'ws-2', title: 'Fix login bug', status: 'waiting_permission', lastActivity: '5 min ago' },
  { id: 'ws-3', title: 'Design system tokens', status: 'active', lastActivity: '1 hour ago' },
  { id: 'ws-4', title: 'API rate limiting', status: 'completed_unviewed', lastActivity: '30 min ago' },
  { id: 'ws-5', title: 'Onboarding flow', status: 'active', lastActivity: '3 hours ago' },
  { id: 'ws-6', title: 'Database migration', status: 'active', lastActivity: '1 day ago' },
  { id: 'ws-7', title: 'Auth refactor', status: 'idle', lastActivity: '2 weeks ago', archivedAt: '2026-01-01' },
  { id: 'ws-8', title: 'Legacy cleanup', status: 'idle', lastActivity: '1 month ago', archivedAt: '2025-12-15' },
];

function FlowSearchableListDemoInner() {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? allWorkstreams.filter((ws) => ws.title.toLowerCase().includes(query.toLowerCase()))
    : allWorkstreams;

  const needsReview = filtered.filter((ws) =>
    ws.status === 'waiting_permission' || ws.status === 'completed_unviewed'
  );
  const active = filtered.filter((ws) => ws.status === 'active');
  const archived = filtered.filter((ws) => 'archivedAt' in ws && ws.archivedAt != null);

  const makeSections = (): FlowSearchableListSection[] => {
    if (query.trim()) {
      return filtered.length > 0
        ? [{ id: 'results', label: 'Results', items: filtered.map(toItem) }]
        : [];
    }
    const sections: FlowSearchableListSection[] = [];
    if (needsReview.length > 0) {
      sections.push({ id: 'needs_review', label: 'Needs Review', items: needsReview.map(toItem) });
    }
    if (active.length > 0) {
      sections.push({ id: 'recent', label: 'Recent', items: active.map(toItem) });
    }
    if (archived.length > 0) {
      sections.push({ id: 'archived', label: 'Archived', items: archived.map(toItem) });
    }
    return sections;
  };

  const toItem = (ws: typeof allWorkstreams[number]): FlowListItemData => ({
    id: ws.id,
    label: ws.title,
    icon: <EntityIcon type="workstream" size={16} />,
    metadata: (
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ws.lastActivity}</span>
    ),
    onSelect: () => action('workstream-selected')(ws.id),
  });

  return (
    <div style={wrapStyle}>
      <div style={labelStyle}>FlowSearchableList -- with sections (browse workstreams)</div>
      <PaletteContainer>
        <FlowHeader title="Browse Workstreams" onBack={() => action('back')()} />
        <FlowSearchableList
          sections={makeSections()}
          query={query}
          onQueryChange={setQuery}
          placeholder="Search workstreams..."
          emptyMessage="No workstreams match your search"
        />
        <PaletteKeyboardHints hints={['navigate', 'select', 'back']} />
      </PaletteContainer>

      <div style={labelStyle}>FlowSearchableList -- single section (no headers)</div>
      <PaletteContainer>
        <FlowHeader title="Select Project" />
        <FlowSearchableList
          sections={[{
            id: 'all',
            label: 'All',
            items: [
              { id: 'p1', label: 'Vienna', description: 'Main product', icon: <EntityIcon type="workstream" size={16} />, onSelect: () => action('select')('vienna') },
              { id: 'p2', label: 'Vienna', description: 'Desktop app', icon: <EntityIcon type="workstream" size={16} />, onSelect: () => action('select')('vienna') },
              { id: 'p3', label: 'Chat UI', description: 'Component library', icon: <EntityIcon type="workstream" size={16} />, onSelect: () => action('select')('chat-ui') },
            ],
          }]}
          query=""
          onQueryChange={() => {}}
          placeholder="Search projects..."
        />
        <PaletteKeyboardHints hints={['navigate', 'select', 'close']} />
      </PaletteContainer>

      <div style={labelStyle}>FlowSearchableList -- empty state</div>
      <PaletteContainer>
        <FlowHeader title="Browse Workstreams" onBack={() => action('back')()} />
        <FlowSearchableList
          sections={[]}
          query="nonexistent"
          onQueryChange={() => {}}
          placeholder="Search workstreams..."
          emptyMessage="No workstreams match your search"
        />
        <PaletteKeyboardHints hints={['navigate', 'select', 'back']} />
      </PaletteContainer>
    </div>
  );
}

export const FlowSearchableListDemo: StoryObj = {
  render: () => <FlowSearchableListDemoInner />,
  parameters: {
    docs: {
      description: {
        story: `**FlowSearchableList** -- Searchable, sectioned list for flow screens.

Combines a search input with a keyboard-navigable, sectioned results list.
Used for inline browsing within the command palette (e.g., browse workstreams).

**Props:**
- \`sections\`: Array of \`{ id, label, items: FlowListItemData[] }\`
- \`query\` / \`onQueryChange\`: Controlled search input
- \`placeholder\`: Search input placeholder text
- \`emptyMessage\`: Shown when no items across all sections

**Behavior:**
- Search input auto-focuses on mount
- ArrowUp/Down navigates across all sections as a flat list
- Enter selects the highlighted item
- Section headers are shown when multiple sections exist
- Single section: header is hidden for a cleaner look
- Integrates with FlowKeyboardContext for capture-phase event handling

**FlowListItemData** extended fields:
- \`metadata?\`: ReactNode rendered on the right (timestamps, badges)
- \`className?\`: Extra CSS class on the item row`,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 14. ALL PALETTES GALLERY
// ═══════════════════════════════════════════════════════════════════════════════

function AllPalettesGalleryInner() {
  const [entityQuery, setEntityQuery] = useState('');
  const [commandQuery, setCommandQuery] = useState('');
  const [flowStep, setFlowStep] = useState(0);

  const flowItems: FlowListItemData[] = [
    {
      id: 'vienna-main',
      label: 'Vienna',
      description: 'Main product',
      icon: <EntityIcon type="workstream" size={16} />,
      onSelect: () => setFlowStep(1),
    },
    {
      id: 'vienna',
      label: 'Vienna',
      description: 'Design system',
      icon: <EntityIcon type="workstream" size={16} />,
      onSelect: () => setFlowStep(1),
    },
    {
      id: 'chat-ui',
      label: 'Chat UI',
      description: 'Component library',
      icon: <EntityIcon type="workstream" size={16} />,
      onSelect: () => setFlowStep(1),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={labelStyle}>Side-by-side: EntityPalette + CommandPalette + Flow Screen</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Entity Palette */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 480 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
            Entity Palette (@)
          </div>
          <input
            type="text"
            value={entityQuery}
            onChange={(e) => setEntityQuery(e.target.value)}
            placeholder="Search entities..."
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border-default)',
              background: 'var(--surface-page)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <EntityPalette
            isOpen
            onClose={() => {}}
            onSelect={action('Entity selected')}
            dataProvider={mockEntityProvider}
            query={entityQuery}
            tabs={demoTabs}
          />
        </div>

        {/* Command Palette */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 480 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
            Command Palette (/)
          </div>
          <input
            type="text"
            value={commandQuery}
            onChange={(e) => setCommandQuery(e.target.value)}
            placeholder="Search commands..."
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border-default)',
              background: 'var(--surface-page)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <CommandPalette
            isOpen
            onClose={() => {}}
            onExecute={action('Command executed')}
            dataProvider={mockCommandProvider}
            query={commandQuery}
            tabs={commandTabs}
          />
        </div>

        {/* Flow Screen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 480 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
            Flow Screen (multi-step)
          </div>
          <div style={{ height: 30 }} />
          <PaletteContainer>
            <FlowHeader
              title={flowStep === 0 ? 'Select Project' : 'Confirm'}
              subtitle={flowStep === 0 ? 'Create Linear issue' : 'Review and create'}
              onBack={flowStep > 0 ? () => setFlowStep(0) : undefined}
              screenIndex={flowStep}
              totalScreens={2}
            />
            <FlowScreen>
              {flowStep === 0 ? (
                <FlowList items={flowItems} />
              ) : (
                <FlowConfirmation
                  title="Create issue?"
                  message="This will create a new Linear issue in the selected project."
                  confirmLabel="Create"
                  cancelLabel="Back"
                  onConfirm={() => {
                    alert('Created!');
                    setFlowStep(0);
                  }}
                  onCancel={() => setFlowStep(0)}
                />
              )}
            </FlowScreen>
            <PaletteKeyboardHints
              hints={flowStep === 0 ? ['navigate', 'select', 'close'] : ['back']}
            />
          </PaletteContainer>
        </div>
      </div>
    </div>
  );
}

export const AllPalettesGallery: StoryObj = {
  render: () => <AllPalettesGalleryInner />,
  parameters: {
    docs: {
      description: {
        story: `**AllPalettesGallery** -- Side-by-side comparison of EntityPalette, CommandPalette,
and a Flow Screen, all rendered at the same width to demonstrate visual consistency.

All three use the same PaletteContainer (388px height, rounded-2xl) and shared primitives
(PaletteTabBar, PaletteResultsList, PaletteResultItem, PaletteKeyboardHints), ensuring a
cohesive visual language across the palette system.

This gallery view is the best way to verify that the three palette modes look and feel unified.`,
      },
    },
  },
};
