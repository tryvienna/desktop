// SkillTool Stories — Skill invocation renderer
//
// Skill invokes user-defined or built-in skills (e.g. /commit, /test).
// Input: { skill_name, arguments? }.

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SkillTool } from './skill-tool';

const meta: Meta<typeof SkillTool> = {
  title: 'Tools/Renderers/skill-tool',
  component: SkillTool,
  tags: ['autodocs'],
  args: { messageId: 'msg-1', onApprove: fn(), onDeny: fn() },
};

export default meta;
type Story = StoryObj<typeof SkillTool>;

/** Skill completed successfully */
export const Complete: Story = {
  args: {
    toolUse: {
      id: 'tool-1',
      name: 'Skill',
      input: { skill_name: 'commit' },
      status: 'complete',
      result: { success: true, output: '' },
    },
  },
};

/** Skill with output */
export const WithOutput: Story = {
  args: {
    toolUse: {
      id: 'tool-2',
      name: 'Skill',
      input: { skill_name: 'test' },
      status: 'complete',
      result: { success: true, output: 'All 42 tests passed.' },
    },
  },
};

/** Skill currently running */
export const Running: Story = {
  args: {
    toolUse: {
      id: 'tool-3',
      name: 'Skill',
      input: { skill_name: 'deploy' },
      status: 'running',
    },
  },
};

/** Skill failed */
export const Error: Story = {
  args: {
    toolUse: {
      id: 'tool-4',
      name: 'Skill',
      input: { skill_name: 'lint' },
      status: 'error',
      result: { success: false, error: 'Skill "lint" not found in registry' },
    },
  },
};
