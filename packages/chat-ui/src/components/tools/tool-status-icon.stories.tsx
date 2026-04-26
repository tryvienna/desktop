// ToolStatusIcon Stories — Animated SVG status indicators
//
// Each status has a distinct micro-animation:
// - Pending: 3 fading dots
// - PendingPermission: Pulsing shield
// - Running: Spinning arc
// - Success: Checkmark draw + sparkle burst
// - Error: X draw + shake

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ToolStatusIcon } from './tool-status-icon';
import type { ToolStatus } from '../../types/messages';

const meta: Meta<typeof ToolStatusIcon> = {
  title: 'Tools/tool-status-icon',
  component: ToolStatusIcon,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ToolStatusIcon>;

/** Pending — 3 sequential fading dots */
export const Pending: Story = { args: { status: 'pending', size: 24 } };

/** Permission needed — pulsing shield */
export const PendingPermission: Story = { args: { status: 'pending_permission', size: 24 } };

/** Running — spinning arc */
export const Running: Story = { args: { status: 'running', size: 24 } };

/** Complete — checkmark with sparkle burst */
export const Complete: Story = { args: { status: 'complete', size: 24 } };

/** Error — X with shake */
export const Error: Story = { args: { status: 'error', size: 24 } };

/** All states side by side */
export const AllStates: Story = {
  render: () => {
    const statuses: ToolStatus[] = [
      'pending',
      'pending_permission',
      'running',
      'complete',
      'error',
    ];
    return (
      <div className="flex gap-8 items-center p-6">
        {statuses.map((status) => (
          <div key={status} className="flex flex-col items-center gap-2">
            <ToolStatusIcon status={status} size={24} />
            <span className="text-[10px] text-muted-foreground">{status}</span>
          </div>
        ))}
      </div>
    );
  },
  name: 'All States',
};

/** Size comparison */
export const Sizes: Story = {
  render: () => (
    <div className="flex gap-6 items-center p-6">
      {[12, 16, 18, 24, 32].map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <ToolStatusIcon status="complete" size={size} />
          <span className="text-[10px] text-muted-foreground">{size}px</span>
        </div>
      ))}
    </div>
  ),
};

/** Interactive — click to cycle through states */
export const Interactive: Story = {
  render: function InteractiveRender() {
    const statuses: ToolStatus[] = [
      'pending',
      'pending_permission',
      'running',
      'complete',
      'error',
    ];
    const [index, setIndex] = useState(0);
    const status = statuses[index % statuses.length];

    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <ToolStatusIcon status={status} size={32} />
        <div className="text-xs text-muted-foreground">{status}</div>
        <button
          onClick={() => setIndex((i) => i + 1)}
          className="px-3 py-1 text-[11px] text-foreground rounded-md border border-border-default cursor-pointer bg-surface-hover"
        >
          Next state
        </button>
      </div>
    );
  },
};
