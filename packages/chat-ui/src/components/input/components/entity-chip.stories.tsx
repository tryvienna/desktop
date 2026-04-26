// EntityChip Stories — Inline entity reference chip with hover expansion

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { EntityChip } from './entity-chip';
import type { Entity } from '../../../types/input';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'ent-1',
  type: 'workstream',
  label: 'Product Launch',
  uri: 'vienna://workstream/ent-1',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof EntityChip> = {
  title: 'Input/entity-chip',
  component: EntityChip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof EntityChip>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Default workstream entity chip. */
export const Default: Story = {
  args: {
    entity: makeEntity(),
  },
};

/** GitHub pull request chip with green accent. */
export const GitHubPR: Story = {
  args: {
    entity: makeEntity({
      id: 'gh-pr-42',
      type: 'github_pr',
      label: 'feat: add dark mode toggle #42',
      uri: 'vienna://github_pr/owner/repo/42',
    }),
  },
};

/** Linear issue chip with indigo accent. */
export const LinearIssue: Story = {
  args: {
    entity: makeEntity({
      id: 'lin-123',
      type: 'linear',
      label: 'ENG-123 Fix auth token refresh',
      uri: 'vienna://linear/lin-123',
    }),
  },
};

/** Skill entity chip with amber accent. */
export const Skill: Story = {
  args: {
    entity: makeEntity({
      id: 'sk-summarize',
      type: 'skill',
      label: 'summarize',
      uri: 'vienna://skill/sk-summarize',
    }),
  },
};

/** Slack channel entity chip. */
export const SlackChannel: Story = {
  args: {
    entity: makeEntity({
      id: 'slack-eng',
      type: 'slack',
      label: '#engineering-general',
      uri: 'vienna://slack/slack-eng',
    }),
  },
};

/** Gmail message entity chip. */
export const GmailMessage: Story = {
  args: {
    entity: makeEntity({
      id: 'gmail-1',
      type: 'gmail',
      label: 'Re: Q4 Planning Meeting',
      uri: 'vienna://gmail/gmail-1',
    }),
  },
};

/** Sentry issue entity chip. */
export const SentryIssue: Story = {
  args: {
    entity: makeEntity({
      id: 'sentry-456',
      type: 'sentry_issue',
      label: 'TypeError: Cannot read properties of undefined',
      uri: 'vienna://sentry_issue/sentry-456',
    }),
  },
};

/**
 * Long label that exceeds the 25-character truncation threshold.
 * Hover to see the full label via overlay expansion.
 */
export const LongLabel: Story = {
  args: {
    entity: makeEntity({
      id: 'ent-long',
      type: 'github_pr',
      label: 'refactor(auth): migrate OAuth2 flow to PKCE with session rotation and token refresh',
      uri: 'vienna://github_pr/owner/repo/99',
    }),
  },
};

/** Clickable chip -- click handler fires and is logged in Actions panel. */
export const WithClick: Story = {
  args: {
    entity: makeEntity({
      id: 'ent-click',
      type: 'workstream',
      label: 'Click Me',
      uri: 'vienna://workstream/ent-click',
    }),
    clickable: true,
    onClick: fn(),
  },
};

/** Non-clickable chip -- no pointer cursor, click is a no-op. */
export const NotClickable: Story = {
  args: {
    entity: makeEntity({
      id: 'ent-static',
      type: 'linear',
      label: 'ENG-500 Static display',
      uri: 'vienna://linear/ent-static',
    }),
    clickable: false,
  },
};

/** Selected/focused chip with stronger border. */
export const Selected: Story = {
  args: {
    entity: makeEntity({
      id: 'ent-sel',
      type: 'skill',
      label: 'code-review',
      uri: 'vienna://skill/ent-sel',
    }),
    selected: true,
  },
};

/** Small (sm) size variant. */
export const SmallSize: Story = {
  args: {
    entity: makeEntity({
      id: 'ent-sm',
      type: 'workstream',
      label: 'Sprint Planning',
      uri: 'vienna://workstream/ent-sm',
    }),
    size: 'sm',
  },
};

/** Multiple entity types displayed side by side. */
export const MultipleChips: Story = {
  render: (args) => (
    <>
      <EntityChip
        {...args}
        entity={makeEntity({
          id: 'ws-1',
          type: 'workstream',
          label: 'Backend API',
          uri: 'vienna://workstream/ws-1',
        })}
      />
      <EntityChip
        {...args}
        entity={makeEntity({
          id: 'gh-1',
          type: 'github_pr',
          label: 'Fix memory leak #88',
          uri: 'vienna://github_pr/gh-1',
        })}
      />
      <EntityChip
        {...args}
        entity={makeEntity({
          id: 'lin-1',
          type: 'linear',
          label: 'ENG-200 Auth bug',
          uri: 'vienna://linear/lin-1',
        })}
      />
      <EntityChip
        {...args}
        entity={makeEntity({
          id: 'sk-1',
          type: 'skill',
          label: 'translate',
          uri: 'vienna://skill/sk-1',
        })}
      />
      <EntityChip
        {...args}
        entity={makeEntity({
          id: 'sl-1',
          type: 'slack',
          label: '#design',
          uri: 'vienna://slack/sl-1',
        })}
      />
      <EntityChip
        {...args}
        entity={makeEntity({
          id: 'se-1',
          type: 'sentry_issue',
          label: 'CORS error',
          uri: 'vienna://sentry_issue/se-1',
        })}
      />
    </>
  ),
};

/** Entity with a custom hex color override. */
export const CustomColor: Story = {
  args: {
    entity: makeEntity({
      id: 'ent-custom',
      type: 'workstream',
      label: 'Custom Magenta',
      uri: 'vienna://workstream/ent-custom',
      color: '#d946ef',
    }),
  },
};
