// ToolSearchTool Stories — Deferred tool discovery renderer
//
// ToolSearch loads deferred tools by keyword search or exact name selection.
// Input: { query, max_results? }. Output: typically empty (tools loaded as side effect).
// ToolSearch is always auto-approved and runs quickly.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ToolSearchTool } from './tool-search-tool';

const meta: Meta<typeof ToolSearchTool> = {
  title: 'Tools/Renderers/tool-search-tool',
  component: ToolSearchTool,
  tags: ['autodocs'],
  args: { messageId: 'msg-1', onApprove: fn(), onDeny: fn() },
};

export default meta;
type Story = StoryObj<typeof ToolSearchTool>;

/** Keyword search — completed successfully */
export const KeywordSearch: Story = {
  args: {
    toolUse: {
      id: 'tool-1',
      name: 'ToolSearch',
      input: { query: 'slack message', max_results: 5 },
      status: 'complete',
      result: { success: true, output: '' },
    },
  },
};

/** Direct selection — loading specific tools by name */
export const DirectSelect: Story = {
  args: {
    toolUse: {
      id: 'tool-2',
      name: 'ToolSearch',
      input: { query: 'select:Read,Edit,Grep', max_results: 3 },
      status: 'complete',
      result: { success: true, output: '' },
    },
  },
};

/** Currently searching for tools */
export const Running: Story = {
  args: {
    toolUse: {
      id: 'tool-3',
      name: 'ToolSearch',
      input: { query: 'notebook jupyter', max_results: 5 },
      status: 'running',
    },
  },
};

/** Search failed */
export const Error: Story = {
  args: {
    toolUse: {
      id: 'tool-4',
      name: 'ToolSearch',
      input: { query: 'nonexistent tool', max_results: 5 },
      status: 'error',
      result: { success: false, error: 'No matching tools found' },
    },
  },
};
