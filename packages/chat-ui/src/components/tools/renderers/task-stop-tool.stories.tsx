// TaskStopTool Stories — Background task termination renderer
//
// TaskStop terminates a running background agent task.
// Input: { task_id }.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TaskStopTool } from './task-stop-tool';

const meta: Meta<typeof TaskStopTool> = {
  title: 'Tools/Renderers/task-stop-tool',
  component: TaskStopTool,
  tags: ['autodocs'],
  args: { messageId: 'msg-1', onApprove: fn(), onDeny: fn() },
};

export default meta;
type Story = StoryObj<typeof TaskStopTool>;

/** Task stopped successfully */
export const Complete: Story = {
  args: {
    toolUse: {
      id: 'tool-1',
      name: 'TaskStop',
      input: { task_id: 'task-abc123def456' },
      status: 'complete',
      result: { success: true, output: '' },
    },
  },
};

/** Currently stopping */
export const Running: Story = {
  args: {
    toolUse: {
      id: 'tool-2',
      name: 'TaskStop',
      input: { task_id: 'task-789xyz' },
      status: 'running',
    },
  },
};

/** Stop failed */
export const Error: Story = {
  args: {
    toolUse: {
      id: 'tool-3',
      name: 'TaskStop',
      input: { task_id: 'task-unknown' },
      status: 'error',
      result: { success: false, error: 'Task not found or already completed' },
    },
  },
};
