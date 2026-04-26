// PlanModeTool Stories — Plan mode entry/exit renderer

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PlanModeTool } from './plan-mode-tool';

const meta: Meta<typeof PlanModeTool> = {
  title: 'Tools/Renderers/plan-mode-tool',
  component: PlanModeTool,
  tags: ['autodocs'],
  args: {
    messageId: 'msg-1',
    onApprove: fn(),
    onDeny: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PlanModeTool>;

/** Entering plan mode */
export const EnterPlanRunning: Story = {
  args: {
    toolUse: {
      id: 'tool-plan-1',
      name: 'EnterPlanMode',
      input: {},
      status: 'running',
    },
  },
};

/** Plan mode entered */
export const EnterPlanComplete: Story = {
  args: {
    toolUse: {
      id: 'tool-plan-2',
      name: 'EnterPlanMode',
      input: {},
      status: 'complete',
      result: { success: true },
    },
  },
};

/** Plan mode entry failed */
export const EnterPlanFailed: Story = {
  args: {
    toolUse: {
      id: 'tool-plan-3',
      name: 'EnterPlanMode',
      input: {},
      status: 'error',
      result: {
        success: false,
        error: 'Plan mode not available in current context',
      },
    },
  },
};

/** Submitting plan for review */
export const ExitPlanRunning: Story = {
  args: {
    toolUse: {
      id: 'tool-plan-4',
      name: 'ExitPlanMode',
      input: {},
      status: 'running',
    },
  },
};

/** Plan submitted */
export const ExitPlanComplete: Story = {
  args: {
    toolUse: {
      id: 'tool-plan-5',
      name: 'ExitPlanMode',
      input: {},
      status: 'complete',
      result: { success: true },
    },
  },
};
