// SkillPreviewList Stories — Skill cards shown above the chat input

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SkillPreviewList } from './skill-preview-list';
import type { SkillPreviewItem } from './skill-preview-list';

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const sampleSkills: SkillPreviewItem[] = [
  {
    id: 'sk-summarize',
    name: 'summarize',
    description:
      'Condense documents, articles, and conversations into clear, actionable summaries. Supports adjustable length (brief, standard, detailed) and focus areas.',
  },
  {
    id: 'sk-code-review',
    name: 'code-review',
    description:
      'Analyze code for bugs, security issues, performance bottlenecks, and style violations. Provides inline suggestions with severity ratings.',
  },
  {
    id: 'sk-translate',
    name: 'translate',
    description: 'Translate text between languages with context-aware phrasing.',
  },
];

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof SkillPreviewList> = {
  title: 'Input/skill-preview-list',
  component: SkillPreviewList,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480, padding: 24 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onRemove: fn(),
    onEdit: fn(),
    onClearAll: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SkillPreviewList>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Single skill card. Click the header to expand and see the full description. */
export const SingleSkill: Story = {
  args: {
    skills: [sampleSkills[0]],
  },
};

/** Multiple skill cards with different descriptions. "Clear all" button appears with 2+ skills. */
export const MultipleSkills: Story = {
  args: {
    skills: sampleSkills,
  },
};

/** All action handlers wired up (visible in Actions panel). */
export const WithActions: Story = {
  args: {
    skills: sampleSkills.slice(0, 2),
    onRemove: fn(),
    onEdit: fn(),
    onClearAll: fn(),
  },
};

/** Empty skills array -- component renders nothing. */
export const Empty: Story = {
  args: {
    skills: [],
  },
};

/** Skill with a very long description to test truncation and expand behavior. */
export const LongDescription: Story = {
  args: {
    skills: [
      {
        id: 'sk-long',
        name: 'comprehensive-analysis',
        description:
          'Perform a thorough multi-dimensional analysis of the provided content including sentiment analysis, entity extraction, topic classification, key phrase identification, readability scoring, and structural recommendations. ' +
          'The output includes a structured JSON report with confidence scores for each dimension, cross-referenced citations, and actionable next steps organized by priority.',
      },
    ],
  },
};

/** Two skills -- verifies the "Clear all" button appears at two items. */
export const TwoSkillsWithClearAll: Story = {
  args: {
    skills: sampleSkills.slice(0, 2),
  },
};
