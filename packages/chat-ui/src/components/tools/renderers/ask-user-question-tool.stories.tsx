// AskUserQuestionTool Stories — User question/input renderer

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AskUserQuestionTool } from './ask-user-question-tool';

const meta: Meta<typeof AskUserQuestionTool> = {
  title: 'Tools/Renderers/ask-user-question-tool',
  component: AskUserQuestionTool,
  tags: ['autodocs'],
  args: {
    messageId: 'msg-1',
    onApprove: fn(),
    onDeny: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AskUserQuestionTool>;

/** Single question with options */
export const SingleQuestion: Story = {
  args: {
    toolUse: {
      id: 'tool-ask-1',
      name: 'AskUserQuestion',
      input: {
        questions: [
          {
            question: 'Which database should we use for this project?',
            header: 'Database',
            options: [
              {
                label: 'PostgreSQL (Recommended)',
                description: 'Mature, full-featured relational database',
              },
              { label: 'SQLite', description: 'Lightweight, file-based, great for development' },
              { label: 'MongoDB', description: 'Document-oriented, flexible schema' },
            ],
          },
        ],
      },
      status: 'running',
    },
  },
};

/** Multiple questions */
export const MultipleQuestions: Story = {
  args: {
    toolUse: {
      id: 'tool-ask-2',
      name: 'AskUserQuestion',
      input: {
        questions: [
          {
            question: 'Which authentication method should we use?',
            header: 'Auth',
            options: [
              { label: 'JWT', description: 'Stateless token-based authentication' },
              { label: 'Session cookies', description: 'Traditional server-side sessions' },
            ],
          },
          {
            question: 'Should we add rate limiting?',
            header: 'Rate limit',
            options: [
              { label: 'Yes', description: 'Add rate limiting middleware' },
              { label: 'No', description: 'Skip for now' },
            ],
          },
        ],
      },
      status: 'running',
    },
  },
};

/** Multi-select question */
export const MultiSelect: Story = {
  args: {
    toolUse: {
      id: 'tool-ask-3',
      name: 'AskUserQuestion',
      input: {
        questions: [
          {
            question: 'Which features do you want to enable?',
            header: 'Features',
            multiSelect: true,
            options: [
              { label: 'Dark mode', description: 'Theme switching support' },
              { label: 'Notifications', description: 'Push notification system' },
              { label: 'Analytics', description: 'Usage tracking dashboard' },
              { label: 'Export', description: 'Data export to CSV/JSON' },
            ],
          },
        ],
      },
      status: 'running',
    },
  },
};

/** Question answered */
export const Answered: Story = {
  args: {
    toolUse: {
      id: 'tool-ask-4',
      name: 'AskUserQuestion',
      input: {
        questions: [
          {
            question: 'Which framework should we use?',
            header: 'Framework',
            options: [
              { label: 'Next.js', description: 'Full-stack React framework' },
              { label: 'Remix', description: 'Web standards-based framework' },
            ],
          },
        ],
      },
      status: 'complete',
      result: {
        success: true,
        output: 'User selected: Next.js',
      },
    },
  },
};

/** Question with no options (free text) */
export const FreeText: Story = {
  args: {
    toolUse: {
      id: 'tool-ask-5',
      name: 'AskUserQuestion',
      input: {
        questions: [
          {
            question: 'What should the component be named?',
            header: 'Name',
          },
        ],
      },
      status: 'running',
    },
  },
};
