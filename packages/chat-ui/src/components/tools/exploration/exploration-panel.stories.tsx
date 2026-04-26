// ExplorationPanel Stories — Grouped read-only tool calls
//
// ExplorationPanel aggregates consecutive exploration tools (Read, Glob, Grep,
// safe Bash) into a single collapsible panel. It auto-collapses when all
// items complete and shows a summary header with item count.

import type { Meta, StoryObj } from '@storybook/react';
import type { ToolUse, ToolStatus } from '../../../types/messages';
import { ExplorationPanel } from './exploration-panel';

// ─── Helper ─────────────────────────────────────────────────────────────────

let nextId = 1;

function makeToolUse(
  overrides: Partial<ToolUse> & { name: string; input: Record<string, unknown> }
): ToolUse {
  return {
    id: `tool-explore-${nextId++}`,
    status: 'complete' as ToolStatus,
    ...overrides,
  };
}

function resetIds() {
  nextId = 1;
}

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta: Meta<typeof ExplorationPanel> = {
  title: 'Tools/Exploration/exploration-panel',
  component: ExplorationPanel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Groups consecutive read-only tool calls (Read, Glob, Grep, safe Bash) into a collapsible panel with summary header, status dots, and expandable output.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ExplorationPanel>;

// ─── Stories ────────────────────────────────────────────────────────────────

/** Mixed exploration tools, all completed successfully */
export const Default: Story = {
  render: () => {
    resetIds();
    const tools: ToolUse[] = [
      makeToolUse({
        name: 'Read',
        input: { file_path: '/src/components/message.tsx' },
        result: { success: true, output: 'import { memo } from "react";\n\nexport const Message = memo(...)' },
      }),
      makeToolUse({
        name: 'Glob',
        input: { pattern: '**/*.stories.tsx', path: 'src/components' },
        result: { success: true, output: 'src/components/tools/bash-tool.stories.tsx\nsrc/components/tools/read-tool.stories.tsx' },
      }),
      makeToolUse({
        name: 'Grep',
        input: { pattern: 'isExplorationTool' },
        result: { success: true, output: 'exploration-utils.ts:77: export function isExplorationTool(...)' },
      }),
      makeToolUse({
        name: 'Bash',
        input: { command: 'ls -la packages/chat-ui/src/' },
        result: { success: true, output: 'total 48\ndrwxr-xr-x  10 user  staff  320 Jan 15 10:00 .\n-rw-r--r--   1 user  staff  1234 Jan 15 10:00 index.ts' },
      }),
      makeToolUse({
        name: 'Read',
        input: { file_path: '/src/types/messages.ts' },
        result: { success: true, output: 'export interface ToolUse {\n  id: string;\n  name: string;\n  ...\n}' },
      }),
    ];
    return <ExplorationPanel tools={tools} />;
  },
};

/** Tools currently running with animated status indicators */
export const Running: Story = {
  render: () => {
    resetIds();
    const tools: ToolUse[] = [
      makeToolUse({
        name: 'Read',
        input: { file_path: '/src/main.ts' },
        status: 'complete',
        result: { success: true, output: 'import { app } from "electron";' },
      }),
      makeToolUse({
        name: 'Grep',
        input: { pattern: 'createWindow' },
        status: 'running',
        isStreaming: true,
      }),
      makeToolUse({
        name: 'Read',
        input: { file_path: '/src/preload.ts' },
        status: 'pending',
      }),
    ];
    return <ExplorationPanel tools={tools} />;
  },
};

/** Mix of all status types */
export const MixedStatuses: Story = {
  render: () => {
    resetIds();
    const tools: ToolUse[] = [
      makeToolUse({
        name: 'Read',
        input: { file_path: '/src/index.ts' },
        status: 'complete',
        result: { success: true, output: 'export * from "./components";' },
      }),
      makeToolUse({
        name: 'Glob',
        input: { pattern: '*.test.ts' },
        status: 'running',
      }),
      makeToolUse({
        name: 'Bash',
        input: { command: 'git status' },
        status: 'error',
        result: { success: false, error: 'fatal: not a git repository' },
      }),
      makeToolUse({
        name: 'Grep',
        input: { pattern: 'TODO' },
        status: 'pending',
      }),
      makeToolUse({
        name: 'Read',
        input: { file_path: '/package.json' },
        status: 'pending_permission',
        requestId: 'req-001',
      }),
    ];
    return <ExplorationPanel tools={tools} />;
  },
};

/** Tools that encountered errors */
export const WithErrors: Story = {
  render: () => {
    resetIds();
    const tools: ToolUse[] = [
      makeToolUse({
        name: 'Read',
        input: { file_path: '/src/nonexistent.ts' },
        status: 'error',
        result: { success: false, error: 'ENOENT: no such file or directory' },
      }),
      makeToolUse({
        name: 'Bash',
        input: { command: 'git log --oneline -5' },
        status: 'error',
        result: { success: false, error: 'fatal: not a git repository (or any parent up to mount point /)' },
      }),
    ];
    return <ExplorationPanel tools={tools} />;
  },
};

/** Single tool — tests the panel with minimal content */
export const SingleTool: Story = {
  render: () => {
    resetIds();
    const tools: ToolUse[] = [
      makeToolUse({
        name: 'Read',
        input: { file_path: '/src/components/message.tsx' },
        result: { success: true, output: 'export const ChatMessage = memo(function ChatMessage(props) { ... })' },
      }),
    ];
    return <ExplorationPanel tools={tools} />;
  },
};

/** Many items to test scrollable content area (max-height 320px) */
export const ManyItems: Story = {
  render: () => {
    resetIds();
    const tools: ToolUse[] = Array.from({ length: 18 }, (_, i) => {
      const variants = [
        { name: 'Read' as const, input: { file_path: `/src/components/Component${i}.tsx` } },
        { name: 'Grep' as const, input: { pattern: `pattern_${i}` } },
        { name: 'Glob' as const, input: { pattern: `**/*${i}*.ts`, path: 'src' } },
        { name: 'Bash' as const, input: { command: `git show HEAD~${i} --stat` } },
      ];
      const variant = variants[i % variants.length]!;
      return makeToolUse({
        ...variant,
        result: { success: true, output: `Output for item ${i}` },
      });
    });
    return <ExplorationPanel tools={tools} />;
  },
};

/** Tools with rich output content that can be expanded per-row */
export const WithExpandableContent: Story = {
  render: () => {
    resetIds();
    const tools: ToolUse[] = [
      makeToolUse({
        name: 'Read',
        input: { file_path: '/src/components/tools/exploration/types.ts' },
        result: {
          success: true,
          output: `export interface ExplorationItem {
  id: string;
  toolName: 'Read' | 'Glob' | 'Grep' | 'Bash';
  description: string;
  status: ToolStatus;
  content?: string;
  isStreaming?: boolean;
  meta?: {
    filePath?: string;
    pattern?: string;
    matchCount?: number;
    command?: string;
  };
}`,
        },
      }),
      makeToolUse({
        name: 'Grep',
        input: { pattern: 'ExplorationPanel' },
        result: {
          success: true,
          output: `exploration-panel.tsx:108: export const ExplorationPanel = memo(function ExplorationPanel({ tools })
exploration-panel.stories.tsx:1: // ExplorationPanel Stories
index.ts:9: export { ExplorationPanel } from './exploration-panel';
message.tsx:20: import { ExplorationPanel, isExplorationTool } from './tools/exploration';`,
        },
      }),
      makeToolUse({
        name: 'Bash',
        input: { command: 'git log --oneline -10' },
        result: {
          success: true,
          output: `a1b2c3d feat: add exploration panel grouping
e4f5g6h fix: auto-collapse on completion
i7j8k9l refactor: extract segmentContentBlocks
m0n1o2p docs: add storybook stories for exploration
q3r4s5t test: add unit tests for groupExplorationTools`,
        },
      }),
      makeToolUse({
        name: 'Read',
        input: { file_path: '/tsconfig.json' },
        // No result — simulates a tool without output
      }),
    ];
    return <ExplorationPanel tools={tools} />;
  },
};
