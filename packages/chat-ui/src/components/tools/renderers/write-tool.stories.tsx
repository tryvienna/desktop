// WriteTool Stories — File write/edit operation renderer

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WriteTool } from './write-tool';

const meta: Meta<typeof WriteTool> = {
  title: 'Tools/Renderers/write-tool',
  component: WriteTool,
  tags: ['autodocs'],
  args: {
    messageId: 'msg-1',
    onApprove: fn(),
    onDeny: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof WriteTool>;

/** Write completed successfully */
export const Complete: Story = {
  args: {
    toolUse: {
      id: 'tool-write-1',
      name: 'Write',
      input: { file_path: '/Users/will/project/src/new-component.tsx', content: '...' },
      status: 'complete',
      result: { success: true },
    },
  },
};

/** Edit completed successfully */
export const EditComplete: Story = {
  args: {
    toolUse: {
      id: 'tool-write-2',
      name: 'Edit',
      input: {
        file_path: '/Users/will/project/src/store.ts',
        old_string: 'foo',
        new_string: 'bar',
      },
      status: 'complete',
      result: { success: true },
    },
  },
};

/** Write running */
export const Running: Story = {
  args: {
    toolUse: {
      id: 'tool-write-3',
      name: 'Write',
      input: { file_path: '/Users/will/project/src/output.ts' },
      status: 'running',
    },
  },
};

/** Needs permission */
export const NeedsPermission: Story = {
  args: {
    toolUse: {
      id: 'tool-write-4',
      name: 'Write',
      input: { file_path: '/Users/will/project/package.json' },
      status: 'pending_permission',
      requestId: 'req-write-001',
    },
  },
};

/** Write failed */
export const Failed: Story = {
  args: {
    toolUse: {
      id: 'tool-write-5',
      name: 'Write',
      input: { file_path: '/etc/read-only-file' },
      status: 'error',
      result: {
        success: false,
        error: 'EACCES: permission denied',
      },
    },
  },
};

/** Session rule auto-approved */
export const SessionApproved: Story = {
  args: {
    toolUse: {
      id: 'tool-write-6',
      name: 'Write',
      input: { file_path: '/Users/will/project/src/types.ts' },
      status: 'complete',
      approvalMethod: 'session_rule',
      result: { success: true },
    },
  },
};
