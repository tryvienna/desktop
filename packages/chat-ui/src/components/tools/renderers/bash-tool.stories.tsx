// BashTool Stories — Command execution renderer
//
// BashTool renders shell command executions. Lifecycle:
// 1. Provider emits tool_start with input: { command, description }
// 2. If command needs permission -> tool_permission_needed
// 3. After execution -> tool_result with { output, error, success }
//
// Bash is the highest-risk tool. PermissionEngine typically requires
// explicit approval unless a session/permanent rule exists.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { BashTool } from './bash-tool';

const meta: Meta<typeof BashTool> = {
  title: 'Tools/Renderers/bash-tool',
  component: BashTool,
  tags: ['autodocs'],
  args: {
    messageId: 'msg-1',
    onApprove: fn(),
    onDeny: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BashTool>;

/** Simple command that completed successfully */
export const SimpleCommand: Story = {
  args: {
    toolUse: {
      id: 'tool-bash-1',
      name: 'Bash',
      input: { command: 'ls -la src/', description: 'List source files' },
      status: 'complete',
      result: {
        success: true,
        output:
          'total 48\ndrwxr-xr-x  10 user  staff   320 Jan 15 10:00 .\n-rw-r--r--   1 user  staff  1234 Jan 15 10:00 index.ts\n-rw-r--r--   1 user  staff   567 Jan 15 10:00 types.ts',
      },
    },
  },
};

/** Command currently executing with no output yet */
export const Running: Story = {
  args: {
    toolUse: {
      id: 'tool-bash-2',
      name: 'Bash',
      input: { command: 'npm test', description: 'Run unit tests' },
      status: 'running',
    },
  },
};

/** Command that failed with an error */
export const Failed: Story = {
  args: {
    toolUse: {
      id: 'tool-bash-3',
      name: 'Bash',
      input: { command: 'npm run build', description: 'Build project' },
      status: 'error',
      result: {
        success: false,
        error: 'TypeScript compilation failed: src/index.ts(15,3): error TS2345',
        output: "src/index.ts(15,3): error TS2345: Argument of type 'string' is not assignable",
      },
    },
  },
};

/**
 * Command waiting for user permission.
 * This shows the approval UI with Allow/Deny buttons.
 * Note the requestId — it links to the provider's permission request.
 */
export const NeedsPermission: Story = {
  args: {
    toolUse: {
      id: 'tool-bash-4',
      name: 'Bash',
      input: { command: 'git push origin main', description: 'Push to remote' },
      status: 'pending_permission',
      requestId: 'req-perm-001',
    },
  },
  parameters: {
    docs: {
      description: {
        story: `Shows the permission approval flow. The requestId connects
        this UI to the provider's permission system. When the user clicks
        "Allow for session", the PermissionEngine creates a rule:
        { tool: 'Bash', behavior: 'allow', scope: 'session' }`,
      },
    },
  },
};

/** Command with long output (scrollable) */
export const LongOutput: Story = {
  args: {
    toolUse: {
      id: 'tool-bash-5',
      name: 'Bash',
      input: { command: 'find . -name "*.ts" -type f', description: 'Find TypeScript files' },
      status: 'complete',
      result: {
        success: true,
        output: Array.from({ length: 50 }, (_, i) => `./src/components/Component${i}.tsx`).join(
          '\n'
        ),
      },
    },
  },
};

/** Auto-approved command showing the approval method badge */
export const AutoApproved: Story = {
  args: {
    toolUse: {
      id: 'tool-bash-6',
      name: 'Bash',
      input: { command: 'cat package.json', description: 'Read package.json' },
      status: 'complete',
      approvalMethod: 'trusted_tool',
      result: {
        success: true,
        output: '{ "name": "@vienna/chat-ui", "version": "0.0.1" }',
      },
    },
  },
};
