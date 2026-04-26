// EnterWorktreeTool Stories — Git worktree isolation renderer
//
// EnterWorktree creates an isolated git worktree for safe changes.
// Input: { name? }.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { EnterWorktreeTool } from './enter-worktree-tool';

const meta: Meta<typeof EnterWorktreeTool> = {
  title: 'Tools/Renderers/enter-worktree-tool',
  component: EnterWorktreeTool,
  tags: ['autodocs'],
  args: { messageId: 'msg-1', onApprove: fn(), onDeny: fn() },
};

export default meta;
type Story = StoryObj<typeof EnterWorktreeTool>;

/** Worktree created with name */
export const WithName: Story = {
  args: {
    toolUse: {
      id: 'tool-1',
      name: 'EnterWorktree',
      input: { name: 'fix-auth-bug' },
      status: 'complete',
      result: { success: true, output: '/repo/.claude/worktrees/fix-auth-bug' },
    },
  },
};

/** Worktree with auto-generated name */
export const AutoName: Story = {
  args: {
    toolUse: {
      id: 'tool-2',
      name: 'EnterWorktree',
      input: {},
      status: 'complete',
      result: { success: true, output: '/repo/.claude/worktrees/claude-worktree-a1b2c3' },
    },
  },
};

/** Currently creating */
export const Running: Story = {
  args: {
    toolUse: {
      id: 'tool-3',
      name: 'EnterWorktree',
      input: { name: 'refactor-api' },
      status: 'running',
    },
  },
};

/** Failed — not a git repo */
export const Error: Story = {
  args: {
    toolUse: {
      id: 'tool-4',
      name: 'EnterWorktree',
      input: {},
      status: 'error',
      result: { success: false, error: 'Not inside a git repository' },
    },
  },
};
