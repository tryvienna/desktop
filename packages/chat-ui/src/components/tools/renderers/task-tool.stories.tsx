// TaskTool Stories — Subagent task execution renderer

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TaskTool } from './task-tool';

const meta: Meta<typeof TaskTool> = {
  title: 'Tools/Renderers/task-tool',
  component: TaskTool,
  tags: ['autodocs'],
  args: {
    messageId: 'msg-1',
    onApprove: fn(),
    onDeny: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TaskTool>;

/** Explore agent completed successfully */
export const ExploreComplete: Story = {
  args: {
    toolUse: {
      id: 'tool-task-1',
      name: 'Task',
      input: {
        description: 'Search codebase',
        prompt: 'Find all files related to authentication in the project',
        subagent_type: 'Explore',
      },
      status: 'complete',
      result: {
        success: true,
        output:
          'Found 12 files related to authentication:\n\n- src/auth/AuthProvider.tsx\n- src/auth/useAuth.ts\n- src/auth/types.ts\n- src/api/auth.ts\n- ...',
        durationMs: 4200,
      },
    },
  },
};

/** Plan agent running */
export const PlanRunning: Story = {
  args: {
    toolUse: {
      id: 'tool-task-2',
      name: 'Task',
      input: {
        description: 'Design implementation plan',
        prompt: 'Create a plan for adding dark mode support to the application',
        subagent_type: 'Plan',
      },
      status: 'running',
    },
  },
};

/** General-purpose agent with streaming result */
export const GeneralPurposeStreaming: Story = {
  args: {
    toolUse: {
      id: 'tool-task-3',
      name: 'Task',
      input: {
        description: 'Research React patterns',
        prompt: 'Research best practices for React state management in 2025',
        subagent_type: 'general-purpose',
      },
      status: 'running',
      result: {
        success: true,
        output:
          'Based on my research, the current best practices for state management include:\n\n1. **Zustand** for simple global state...',
      },
    },
  },
};

/** Task that failed */
export const Failed: Story = {
  args: {
    toolUse: {
      id: 'tool-task-4',
      name: 'Task',
      input: {
        description: 'Run integration tests',
        prompt: 'Execute the full integration test suite',
        subagent_type: 'general-purpose',
      },
      status: 'error',
      result: {
        success: false,
        error: 'Agent exceeded maximum turns (15)',
        durationMs: 45000,
      },
    },
  },
};

/** Code reviewer agent */
export const CodeReviewer: Story = {
  args: {
    toolUse: {
      id: 'tool-task-5',
      name: 'Task',
      input: {
        description: 'Review PR changes',
        prompt: 'Review the changes in src/components/Chat.tsx for potential issues',
        subagent_type: 'code-reviewer',
      },
      status: 'complete',
      result: {
        success: true,
        output:
          '## Code Review Summary\n\nOverall the changes look good. A few suggestions:\n\n1. Consider using `useMemo` for the message list computation\n2. The event handler should be wrapped in `useCallback`',
        durationMs: 8100,
      },
    },
  },
};
