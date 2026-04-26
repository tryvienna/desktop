import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import {
  WorkstreamStatusIndicator,
  WorkstreamStatusDot,
  WorkstreamChip,
  WorkstreamSection,
  type LinkedWorkstream,
  type ActiveWorkstream,
  type WorkstreamLinkStatus,
} from './workstream-linker';

const meta = {
  title: 'Domain/WorkstreamLinker',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ALL_STATUSES: WorkstreamLinkStatus[] = [
  'created',
  'active',
  'ai_working',
  'has_updates',
  'waiting_review',
  'paused',
  'completed',
  'archived',
];

export const StatusIndicators: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      {ALL_STATUSES.map((status) => (
        <div key={status} className="flex items-center gap-2">
          <WorkstreamStatusIndicator status={status} />
          <span className="text-xs text-muted-foreground">{status}</span>
        </div>
      ))}
    </div>
  ),
};

export const StatusDots: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      {ALL_STATUSES.map((status) => (
        <div key={status} className="flex items-center gap-2">
          <WorkstreamStatusDot status={status} />
          <span className="text-xs text-muted-foreground">{status}</span>
        </div>
      ))}
    </div>
  ),
};

const sampleWorkstreams: LinkedWorkstream[] = [
  { id: '1', title: 'UI Migration', status: 'active', relationship: 'source' },
  { id: '2', title: 'Backend Refactor', status: 'ai_working', relationship: 'linked' },
  { id: '3', title: 'Bug Fix Sprint', status: 'has_updates', relationship: 'created' },
];

export const Chips: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {sampleWorkstreams.map((ws) => (
        <WorkstreamChip
          key={ws.id}
          workstream={ws}
          onClick={fn('click')}
          onRemove={fn('remove')}
        />
      ))}
    </div>
  ),
};

const activeWorkstreams: ActiveWorkstream[] = [
  { id: '4', title: 'Feature Development', status: 'active' },
  { id: '5', title: 'Code Review', status: 'active' },
  { id: '6', title: 'Testing', status: 'paused' },
];

export const Section: Story = {
  render: () => (
    <div className="w-80">
      <WorkstreamSection
        workstreams={sampleWorkstreams}
        entityId="entity-1"
        entityTitle="Test Entity"
        activeWorkstreams={activeWorkstreams}
        onRemove={fn('remove')}
        onClick={fn('click')}
        onStartWorkstream={fn('start')}
        onAddToWorkstream={fn('add to')}
      />
    </div>
  ),
};

export const EmptySection: Story = {
  render: () => (
    <div className="w-80">
      <WorkstreamSection
        workstreams={[]}
        entityId="entity-2"
        entityTitle="Empty Entity"
        activeWorkstreams={activeWorkstreams}
        onStartWorkstream={fn('start')}
        onAddToWorkstream={fn('add to')}
      />
    </div>
  ),
};
