// GlobTool Stories — File pattern matching renderer
//
// GlobTool renders file search results. The agent uses Glob to find files
// by pattern. Input: { pattern, path? }. Output: newline-separated file paths.
// Glob is read-only and typically auto-approved.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { GlobTool } from './glob-tool';

const meta: Meta<typeof GlobTool> = {
  title: 'Tools/Renderers/glob-tool',
  component: GlobTool,
  tags: ['autodocs'],
  args: { messageId: 'msg-1', onApprove: fn(), onDeny: fn() },
};

export default meta;
type Story = StoryObj<typeof GlobTool>;

/** Few results */
export const FewResults: Story = {
  args: {
    toolUse: {
      id: 'tool-1',
      name: 'Glob',
      input: { pattern: 'src/**/*.test.ts' },
      status: 'complete',
      result: {
        success: true,
        output:
          'src/store/chat-store.test.ts\nsrc/adapters/ipc-event-source.test.ts\nsrc/components/Message.test.tsx',
      },
    },
  },
};

/** Many results — truncated to 10 with overflow count */
export const ManyResults: Story = {
  args: {
    toolUse: {
      id: 'tool-2',
      name: 'Glob',
      input: { pattern: '**/*.tsx', path: '/src' },
      status: 'complete',
      result: {
        success: true,
        output: Array.from({ length: 25 }, (_, i) => `src/components/Component${i}.tsx`).join('\n'),
      },
    },
  },
};

/** No results */
export const NoResults: Story = {
  args: {
    toolUse: {
      id: 'tool-3',
      name: 'Glob',
      input: { pattern: '**/*.rs' },
      status: 'complete',
      result: { success: true, output: '' },
    },
  },
};

/** Running state */
export const Running: Story = {
  args: {
    toolUse: {
      id: 'tool-4',
      name: 'Glob',
      input: { pattern: 'packages/*/src/index.ts' },
      status: 'running',
    },
  },
};
