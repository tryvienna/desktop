// WebSearchTool Stories — Web search results renderer

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WebSearchTool } from './web-search-tool';

const meta: Meta<typeof WebSearchTool> = {
  title: 'Tools/Renderers/web-search-tool',
  component: WebSearchTool,
  tags: ['autodocs'],
  args: {
    messageId: 'msg-1',
    onApprove: fn(),
    onDeny: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof WebSearchTool>;

/** Search with results */
export const WithResults: Story = {
  args: {
    toolUse: {
      id: 'tool-search-1',
      name: 'WebSearch',
      input: { query: 'React 19 new features 2025' },
      status: 'complete',
      result: {
        success: true,
        output:
          "React 19 Release Notes — Official Blog\nWhat's New in React 19 — Dev.to\nReact 19 Migration Guide — GitHub\nReact Server Components Deep Dive\nReact 19 Performance Improvements",
      },
    },
  },
};

/** Many results (truncated) */
export const ManyResults: Story = {
  args: {
    toolUse: {
      id: 'tool-search-2',
      name: 'WebSearch',
      input: { query: 'best typescript practices' },
      status: 'complete',
      result: {
        success: true,
        output: Array.from(
          { length: 12 },
          (_, i) => `Result ${i + 1}: TypeScript Best Practices — Source ${i + 1}`
        ).join('\n'),
      },
    },
  },
};

/** Currently searching */
export const Searching: Story = {
  args: {
    toolUse: {
      id: 'tool-search-3',
      name: 'WebSearch',
      input: { query: 'zustand vs jotai comparison' },
      status: 'running',
    },
  },
};

/** No results */
export const NoResults: Story = {
  args: {
    toolUse: {
      id: 'tool-search-4',
      name: 'WebSearch',
      input: { query: 'very obscure search term xyzzy' },
      status: 'complete',
      result: { success: true, output: '' },
    },
  },
};

/** Search failed */
export const Failed: Story = {
  args: {
    toolUse: {
      id: 'tool-search-5',
      name: 'WebSearch',
      input: { query: 'test query' },
      status: 'error',
      result: {
        success: false,
        error: 'Network error: unable to reach search API',
      },
    },
  },
};
