// ReadTool Stories — File read operation renderer

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ReadTool } from './read-tool';

const meta: Meta<typeof ReadTool> = {
  title: 'Tools/Renderers/read-tool',
  component: ReadTool,
  tags: ['autodocs'],
  args: {
    messageId: 'msg-1',
    onApprove: fn(),
    onDeny: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ReadTool>;

/** Full file read */
export const FullFile: Story = {
  args: {
    toolUse: {
      id: 'tool-read-1',
      name: 'Read',
      input: { file_path: '/Users/will/Documents/dev/vienna/packages/chat-ui/src/index.ts' },
      status: 'complete',
      result: {
        success: true,
        output: `     1\texport { Chat } from './components/chat';\n     2\texport { ChatInput } from './components/chat-input';\n     3\texport { MessageList } from './components/message-list';\n     4\texport { TypewriterText } from './components/streaming/typewriter-text';`,
        durationMs: 12,
      },
    },
  },
};

/** Read with line range */
export const WithLineRange: Story = {
  args: {
    toolUse: {
      id: 'tool-read-2',
      name: 'Read',
      input: { file_path: '/Users/will/project/src/store.ts', offset: 42, limit: 20 },
      status: 'complete',
      result: {
        success: true,
        output: `    42\tfunction applyEvent(state, event) {\n    43\t  switch (event.type) {\n    44\t    case 'text_delta':\n    45\t      return { ...state, text: state.text + event.text };\n    46\t    default:\n    47\t      return state;\n    48\t  }\n    49\t}`,
        durationMs: 8,
      },
    },
  },
};

/** Currently reading */
export const Running: Story = {
  args: {
    toolUse: {
      id: 'tool-read-3',
      name: 'Read',
      input: { file_path: '/Users/will/project/src/large-file.ts' },
      status: 'running',
    },
  },
};

/** File not found */
export const FileNotFound: Story = {
  args: {
    toolUse: {
      id: 'tool-read-4',
      name: 'Read',
      input: { file_path: '/Users/will/project/src/missing.ts' },
      status: 'error',
      result: {
        success: false,
        error: 'ENOENT: no such file or directory',
      },
    },
  },
};

/** Auto-approved trusted read */
export const AutoApproved: Story = {
  args: {
    toolUse: {
      id: 'tool-read-5',
      name: 'Read',
      input: { file_path: '/Users/will/project/README.md' },
      status: 'complete',
      approvalMethod: 'trusted_tool',
      result: {
        success: true,
        output: '# Project\n\nThis is a sample project.',
        durationMs: 5,
      },
    },
  },
};
