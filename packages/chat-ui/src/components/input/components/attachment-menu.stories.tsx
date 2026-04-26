// AttachmentMenu Stories — Dropdown menu for file attach & skill selection

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AttachmentMenu } from './attachment-menu';
import type { SkillMenuItem } from './attachment-menu';

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const sampleSkills: SkillMenuItem[] = [
  {
    id: 'sk-summarize',
    name: 'summarize',
    description: 'Summarize text or documents',
    pinned: true,
  },
  {
    id: 'sk-translate',
    name: 'translate',
    description: 'Translate between languages',
    pinned: true,
  },
  {
    id: 'sk-code-review',
    name: 'code-review',
    description: 'Review code for bugs and style issues',
  },
  { id: 'sk-explain', name: 'explain', description: 'Explain complex topics in simple terms' },
  { id: 'sk-refactor', name: 'refactor', description: 'Refactor code for clarity and performance' },
];

const manySkills: SkillMenuItem[] = [
  ...sampleSkills,
  { id: 'sk-test', name: 'test', description: 'Generate unit tests for code' },
  { id: 'sk-debug', name: 'debug', description: 'Help debug errors and exceptions' },
  { id: 'sk-docs', name: 'docs', description: 'Generate documentation from code' },
  { id: 'sk-deploy', name: 'deploy', description: 'Create deployment configurations' },
  { id: 'sk-migrate', name: 'migrate', description: 'Help with database or API migrations' },
];

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof AttachmentMenu> = {
  title: 'Input/attachment-menu',
  component: AttachmentMenu,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: 24, paddingTop: 320, display: 'flex', alignItems: 'flex-end' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onAttachFile: fn(),
    onSelectSkill: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AttachmentMenu>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default menu with attach file action. Click the + button to open. */
export const Default: Story = {
  args: {
    skills: [],
  },
};

/** Menu with skills available in the submenu. Click + then "Use skill". */
export const WithSkills: Story = {
  args: {
    skills: sampleSkills,
  },
};

/** Disabled state -- button is non-interactive. */
export const Disabled: Story = {
  args: {
    disabled: true,
    skills: sampleSkills,
  },
};

/**
 * Full-featured menu: skills list (exceeding the 8-item display limit),
 * a "Browse all skills..." action, and file attach.
 */
export const AllFeatures: Story = {
  args: {
    skills: manySkills,
    onBrowseSkills: fn(),
  },
};

/** Menu with no skills, but the browse skills action is available. */
export const NoSkillsWithBrowse: Story = {
  args: {
    skills: [],
    onBrowseSkills: fn(),
  },
};

/** Menu with only pinned skills. */
export const PinnedSkillsOnly: Story = {
  args: {
    skills: sampleSkills.filter((s) => s.pinned),
  },
};
