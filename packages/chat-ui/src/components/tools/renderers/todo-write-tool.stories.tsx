// TodoWriteTool Stories — Task list management renderer
//
// TodoWriteTool renders the AI agent's task tracking. Always auto-approved.
// Input: { todos: [{ content, status, activeForm }] }
// Status values: "completed", "in_progress", "pending"
// UI: progress bar, activeForm shown for in_progress item, strikethrough for completed.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TodoWriteTool } from './todo-write-tool';

const meta: Meta<typeof TodoWriteTool> = {
  title: 'Tools/Renderers/todo-write-tool',
  component: TodoWriteTool,
  tags: ['autodocs'],
  args: {
    messageId: 'msg-1',
    onApprove: fn(),
    onDeny: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TodoWriteTool>;

/** Task list with mixed states — the most common appearance */
export const MixedStates: Story = {
  args: {
    toolUse: {
      id: 'tool-todo-1',
      name: 'TodoWrite',
      input: {
        todos: [
          {
            content: 'Create agent-core package',
            status: 'completed',
            activeForm: 'Creating agent-core',
          },
          {
            content: 'Build provider system',
            status: 'completed',
            activeForm: 'Building providers',
          },
          {
            content: 'Implement permission engine',
            status: 'in_progress',
            activeForm: 'Implementing permissions',
          },
          { content: 'Set up IPC handlers', status: 'pending', activeForm: 'Setting up IPC' },
          {
            content: 'Build chat UI components',
            status: 'pending',
            activeForm: 'Building chat UI',
          },
        ],
      },
      status: 'complete',
      result: { success: true },
    },
  },
};

/** All tasks completed — 100% progress */
export const AllComplete: Story = {
  args: {
    toolUse: {
      id: 'tool-todo-2',
      name: 'TodoWrite',
      input: {
        todos: [
          { content: 'Fix TypeScript errors', status: 'completed', activeForm: 'Fixing errors' },
          { content: 'Run tests', status: 'completed', activeForm: 'Running tests' },
          { content: 'Verify build', status: 'completed', activeForm: 'Verifying build' },
        ],
      },
      status: 'complete',
      result: { success: true },
    },
  },
};

/** All tasks pending — just started planning */
export const AllPending: Story = {
  args: {
    toolUse: {
      id: 'tool-todo-3',
      name: 'TodoWrite',
      input: {
        todos: [
          { content: 'Research existing code', status: 'pending', activeForm: 'Researching code' },
          {
            content: 'Plan implementation',
            status: 'pending',
            activeForm: 'Planning implementation',
          },
          { content: 'Write code', status: 'pending', activeForm: 'Writing code' },
          { content: 'Write tests', status: 'pending', activeForm: 'Writing tests' },
        ],
      },
      status: 'complete',
      result: { success: true },
    },
  },
};

/** Loading state — input not yet available */
export const Loading: Story = {
  args: {
    toolUse: {
      id: 'tool-todo-loading',
      name: 'TodoWrite',
      input: {},
      status: 'running',
    },
  },
};

/** Empty todo list (edge case) */
export const EmptyList: Story = {
  args: {
    toolUse: {
      id: 'tool-todo-4',
      name: 'TodoWrite',
      input: { todos: [] },
      status: 'complete',
      result: { success: true },
    },
  },
};
