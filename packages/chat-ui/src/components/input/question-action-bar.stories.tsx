// QuestionActionBar Stories
//
// Replaces the chat input when an AskUserQuestion tool is waiting for answers.
// Multi-step question wizard with single/multi-select options, an auto-generated
// "Other" free-text option, review screen, and submit.
//
// Props:
//   toolId: string                        — unique tool invocation ID (resets state on change)
//   questions: AskUserQuestionItem[]      — array of questions to step through
//   onSubmit(answers: Record<string,string>) — called when user submits from review screen
//
// AskUserQuestionItem shape:
//   { question: string; header: string; options: Array<{ label, description }>; multiSelect?: boolean }
//
// Flow:
//   1. Show question with numbered options + auto-generated "Other"
//   2. Single-select auto-advances; multi-select / "Other" shows Continue button
//   3. After last question, show review screen with all answers
//   4. Submit sends Record<header, answer> to onSubmit
//
// Keyboard shortcuts:
//   Question screen:
//     Up/Down        — navigate options
//     1-N            — select option by number
//     Enter          — select focused / continue (multi-select)
//     Left/Backspace — previous question
//     Right          — next question (if answered)
//   Review screen:
//     Up/Down        — navigate answers
//     Enter          — edit focused answer OR submit (if no focus)

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { within, userEvent } from '@storybook/test';
import { QuestionActionBar } from './question-action-bar';
import type { AskUserQuestionItem } from './question-action-bar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const frameworkQuestion: AskUserQuestionItem = {
  header: 'Framework',
  question: 'Which frontend framework should we use for the new dashboard?',
  options: [
    { label: 'React', description: 'Component-based UI library' },
    { label: 'Vue', description: 'Progressive framework' },
    { label: 'Svelte', description: 'Compile-time framework' },
  ],
};

const stylingQuestion: AskUserQuestionItem = {
  header: 'Styling',
  question: 'How should we handle styling?',
  options: [
    { label: 'Tailwind CSS', description: 'Utility-first CSS framework' },
    { label: 'CSS Modules', description: 'Scoped CSS with module imports' },
    { label: 'Styled Components', description: 'CSS-in-JS with tagged templates' },
    { label: 'Vanilla Extract', description: 'Type-safe CSS-in-TypeScript' },
  ],
};

const deploymentQuestion: AskUserQuestionItem = {
  header: 'Deployment',
  question: 'Where should we deploy the application?',
  options: [
    { label: 'Vercel', description: 'Edge-first serverless platform' },
    { label: 'AWS', description: 'Amazon Web Services infrastructure' },
    { label: 'Cloudflare', description: 'Edge compute with Workers' },
  ],
};

const featuresQuestion: AskUserQuestionItem = {
  header: 'Features',
  question: 'Which features should we include in the MVP? (select all that apply)',
  multiSelect: true,
  options: [
    { label: 'Authentication', description: 'User login and registration' },
    { label: 'Dark Mode', description: 'Theme toggle support' },
    { label: 'Notifications', description: 'Push and in-app notifications' },
    { label: 'Analytics', description: 'Usage tracking and dashboards' },
    { label: 'i18n', description: 'Internationalization support' },
  ],
};

const longOptionsQuestion: AskUserQuestionItem = {
  header: 'Architecture',
  question: 'Which architectural pattern best fits our requirements?',
  options: [
    {
      label: 'Monolith',
      description:
        'Single deployable unit — simpler ops but harder to scale individual components independently',
    },
    {
      label: 'Microservices',
      description:
        'Independently deployable services — enables team autonomy and granular scaling at the cost of distributed system complexity',
    },
    {
      label: 'Modular Monolith',
      description:
        'Logical modules inside a single deployable — balances simplicity with clear boundaries for future extraction',
    },
  ],
};

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof QuestionActionBar> = {
  title: 'Input/question-action-bar',
  component: QuestionActionBar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-6 bg-surface-sunken">
        <Story />
      </div>
    ),
  ],
  args: {
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof QuestionActionBar>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Single question with 3 options.
 *
 * This is the simplest case: one question, single-select.
 * Clicking an option auto-advances to the review screen since
 * there are no more questions. An auto-generated "Other" option
 * is always appended at the end for free-text input.
 *
 * Progress bar shows 100% (1/1).
 */
export const SingleQuestion: Story = {
  args: {
    toolId: 'ask-single',
    questions: [frameworkQuestion],
  },
};

/**
 * Three questions to step through.
 *
 * Demonstrates the multi-step wizard flow:
 * 1. Framework selection (single-select, auto-advances)
 * 2. Styling selection (single-select, auto-advances)
 * 3. Deployment selection (single-select, auto-advances to review)
 *
 * Progress bar advances from 33% -> 66% -> 100%.
 * Use arrow keys Left/Right or Backspace to navigate between questions.
 */
export const MultipleQuestions: Story = {
  args: {
    toolId: 'ask-multi-step',
    questions: [frameworkQuestion, stylingQuestion, deploymentQuestion],
  },
  parameters: {
    docs: {
      description: {
        story: `Multi-step question flow. Each question has a header badge and a
        step counter (e.g. "1/3"). Single-select options auto-advance on click.
        The progress bar fills proportionally.

        Navigation:
        - Click or number keys to select
        - Left arrow / Backspace to go back
        - Right arrow to go forward (if answered)`,
      },
    },
  },
};

/**
 * Multi-select question.
 *
 * When multiSelect is true, clicking options toggles them on/off
 * (no auto-advance). A "Continue" or "Review" pill appears at the
 * bottom-right once at least one option is selected.
 *
 * Selected options show a blue check icon instead of the number badge.
 * The answer is stored as a comma-separated string of labels.
 */
export const MultiSelect: Story = {
  args: {
    toolId: 'ask-multi-select',
    questions: [featuresQuestion],
  },
  parameters: {
    docs: {
      description: {
        story: `Multi-select mode: click options to toggle selection.
        The "Continue" / "Review" button appears when at least one option is selected.
        Selected items show a checkmark instead of the number badge.
        The answer is serialized as comma-separated labels (e.g. "Authentication, Dark Mode").`,
      },
    },
  },
};

/**
 * Demonstrating the "Other" free-text option.
 *
 * Every question automatically includes an "Other" option at the end.
 * When selected, a text input expands below the option list.
 * The user types a custom answer and presses Enter or clicks Continue.
 *
 * Click "Other" (the last option) to see the text input appear.
 */
export const WithOther: Story = {
  args: {
    toolId: 'ask-with-other',
    questions: [
      {
        header: 'Database',
        question: 'Which database should we use for the user data store?',
        options: [
          { label: 'PostgreSQL', description: 'Relational SQL database' },
          { label: 'MongoDB', description: 'Document-oriented NoSQL' },
        ],
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: `The "Other" option is auto-generated for every question.
        Selecting it:
        1. Expands a text input with slide animation
        2. Auto-focuses the input
        3. Typing updates the answer in real time
        4. Enter in the input advances to the next question / review
        5. Selecting a predefined option clears "Other" selection`,
      },
    },
  },
};

/**
 * Options with long descriptions.
 *
 * Verifies that the layout handles long description text gracefully.
 * Descriptions wrap naturally within each option button.
 */
export const LongOptions: Story = {
  args: {
    toolId: 'ask-long-options',
    questions: [longOptionsQuestion],
  },
};

/**
 * Review screen via play function.
 *
 * Automatically selects answers for each question and advances to
 * the review screen. The review shows all headers with their answers,
 * and each row is clickable to edit that answer.
 *
 * Bottom row shows "Send answers" button and keyboard hints.
 */
export const ReviewScreen: Story = {
  args: {
    toolId: 'ask-review',
    questions: [frameworkQuestion, stylingQuestion, deploymentQuestion],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1: Select "React" (first option)
    const reactOption = await canvas.findByText('React');
    await userEvent.click(reactOption);

    // Wait for auto-advance animation
    await new Promise((r) => setTimeout(r, 350));

    // Step 2: Select "Tailwind CSS" (first option)
    const tailwindOption = await canvas.findByText('Tailwind CSS');
    await userEvent.click(tailwindOption);

    // Wait for auto-advance animation
    await new Promise((r) => setTimeout(r, 350));

    // Step 3: Select "Vercel" (first option) — auto-advances to review
    const vercelOption = await canvas.findByText('Vercel');
    await userEvent.click(vercelOption);
  },
  parameters: {
    docs: {
      description: {
        story: `Uses a play function to auto-select answers and advance to the review screen.

        Review screen features:
        - Green check icon header with "Review your answers"
        - Each answer row shows: header badge, answer text, "Edit" label
        - Hovering highlights the row; clicking navigates back to that question
        - "Send answers" pill at the bottom submits all answers
        - Keyboard: Up/Down to navigate, Enter to edit or submit`,
      },
    },
  },
};
