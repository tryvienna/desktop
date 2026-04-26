// GrepTool Stories — Content search renderer
//
// GrepTool renders code search results. The agent uses Grep to search
// file contents by regex pattern. Input: { pattern, glob?, path?, output_mode? }.
// Output: matched lines with file:line prefix. Grep is read-only, typically auto-approved.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { GrepTool } from './grep-tool';

const meta: Meta<typeof GrepTool> = {
  title: 'Tools/Renderers/grep-tool',
  component: GrepTool,
  tags: ['autodocs'],
  args: { messageId: 'msg-1', onApprove: fn(), onDeny: fn() },
};

export default meta;
type Story = StoryObj<typeof GrepTool>;

/** Typical search with a few matches */
export const FewMatches: Story = {
  args: {
    toolUse: {
      id: 'tool-1',
      name: 'Grep',
      input: { pattern: 'createChatStore', glob: '*.ts' },
      status: 'complete',
      result: {
        success: true,
        output:
          "src/store/chat-store.ts:128:export function createChatStore() {\nsrc/store/index.ts:1:export { createChatStore } from './chat-store';\nsrc/context/chat-context.tsx:4:import { createChatStore } from '../store/chat-store';",
      },
    },
  },
};

/** Search with many matches — truncated */
export const ManyMatches: Story = {
  args: {
    toolUse: {
      id: 'tool-2',
      name: 'Grep',
      input: { pattern: 'import.*from', path: '/src' },
      status: 'complete',
      result: {
        success: true,
        output: Array.from(
          { length: 15 },
          (_, i) => `src/file${i}.ts:1:import { something } from './module${i}';`
        ).join('\n'),
      },
    },
  },
};

/** No matches found */
export const NoMatches: Story = {
  args: {
    toolUse: {
      id: 'tool-3',
      name: 'Grep',
      input: { pattern: 'DEPRECATED_FUNCTION' },
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
      name: 'Grep',
      input: { pattern: 'TODO|FIXME|HACK', glob: '*.{ts,tsx}' },
      status: 'running',
    },
  },
};
