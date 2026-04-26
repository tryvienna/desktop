// MCPTool Stories — Generic MCP tool fallback renderer
//
// MCP tools are extensions provided by external servers.
// Naming convention: mcp__<server>__<method> (e.g. mcp__vienna-entities__entity_search).
// MCPTool is a fallback renderer (priority 10) that catches any tool whose name
// starts with "mcp__" that doesn't have a more specific renderer.
// It extracts the server name from the tool name for a meaningful badge.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MCPTool } from './mcp-tool';

const meta: Meta<typeof MCPTool> = {
  title: 'Tools/Renderers/mcp-tool',
  component: MCPTool,
  tags: ['autodocs'],
  args: {
    messageId: 'msg-1',
    onApprove: fn(),
    onDeny: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MCPTool>;

/** Vienna entity search — shows server badge + formatted params */
export const ViennaEntitySearch: Story = {
  args: {
    toolUse: {
      id: 'tool-mcp-1',
      name: 'mcp__vienna-entities__entity_search',
      input: { query: 'authentication', types: ['skill', 'workstream'] },
      status: 'complete',
      result: {
        success: true,
        output: JSON.stringify(
          {
            results: [
              { uri: '@vienna//skill/auth', name: 'Authentication Skill' },
              { uri: '@vienna//workstream/auth-ws', name: 'Auth Workstream' },
            ],
          },
          null,
          2
        ),
      },
    },
  },
};

/** MCP tool currently executing */
export const Running: Story = {
  args: {
    toolUse: {
      id: 'tool-mcp-2',
      name: 'mcp__vienna-entities__entity_list',
      input: { type: 'workstream', limit: 20 },
      status: 'running',
    },
  },
};

/** MCP tool needing permission (external tool = usually requires approval) */
export const NeedsPermission: Story = {
  args: {
    toolUse: {
      id: 'tool-mcp-3',
      name: 'mcp__github__create_issue',
      input: { repo: 'org/repo', title: 'Bug report', body: 'Description...' },
      status: 'pending_permission',
      requestId: 'req-mcp-001',
    },
  },
};

/** MCP tool that failed */
export const Failed: Story = {
  args: {
    toolUse: {
      id: 'tool-mcp-4',
      name: 'mcp__vienna-entities__graphql_execute',
      input: { query: 'mutation { createIssue(input: { title: "Test" }) { id } }' },
      status: 'error',
      result: {
        success: false,
        error: 'Integration not configured: Linear API key missing',
      },
    },
  },
};

/** Non-MCP-prefixed tool (fallback for any unrecognized tool name) */
export const GenericTool: Story = {
  args: {
    toolUse: {
      id: 'tool-mcp-5',
      name: 'custom_tool',
      input: { param1: 'value1', nested: { key: 'val' } },
      status: 'complete',
      result: {
        success: true,
        output: 'Operation completed',
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story: `MCPTool also serves as the ultimate fallback for any tool
        that doesn't match a registered renderer. Even non-MCP tools
        get a reasonable rendering with parameter display.`,
      },
    },
  },
};
