// ActionFormBar Stories
//
// Quick Form system — declarative multi-step forms that replace the chat input.
// Uses defineActionForm to create form definitions, then ActionFormBar to render.
//
// Step types:
//   text         — free-text input with placeholder
//   select       — single-select with numbered hotkeys, auto-advance
//   multi-select — multi-select with toggle, Continue button
//   confirm      — yes/no with optional preview text
//
// Features:
//   - Async option resolution via resolve() handlers
//   - Edit pencil icon to customize which steps are enabled/disabled
//   - Review screen before submission
//   - Full keyboard navigation (arrows, numbers, Enter, Escape)
//   - Derived context between steps (e.g. branch name from workstream name)
//   - Same container shape as ChatInput for seamless AnimatePresence morph
//
// Keyboard shortcuts:
//   Step screen:
//     Up/Down        — navigate options
//     1-9            — select option by number
//     Enter          — select focused / continue / submit text
//     Left/Backspace — previous step
//     Right          — next step (if answered)
//     Escape         — dismiss form
//   Review screen:
//     Up/Down        — navigate answers
//     Enter          — edit focused answer OR submit
//     Escape         — dismiss form

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { within, userEvent } from '@storybook/test';
import { ActionFormBar } from './action-form-bar';
import { defineActionForm } from './define-action-form';
import { newWorkstreamForm, quickNoteForm, projectSetupForm, linearTicketForm, slackMessageForm } from './examples';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof ActionFormBar> = {
  title: 'Input/ActionFormBar',
  component: ActionFormBar,
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
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ActionFormBar>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * New Workstream — the primary use case.
 *
 * Multi-step form: Name (text) → Model (select, async) → Project (select, async) → Worktree (confirm).
 *
 * - Step 1 "Name" is required and always enabled
 * - Steps 2-4 are skippable (can be toggled via the edit pencil icon)
 * - Model and Project options load asynchronously (400ms / 300ms delay)
 * - Worktree step shows a derived branch name preview based on the name answer
 * - Single-select steps auto-advance on selection
 *
 * Press CMD+N to trigger in production (shortcut: 'mod+n').
 */
export const NewWorkstream: Story = {
  args: {
    definition: newWorkstreamForm,
  },
};

/**
 * Quick Note — simplest possible form.
 *
 * Single text step, required. Type and press Enter.
 * No customize overlay since there are no skippable steps.
 */
export const QuickNote: Story = {
  args: {
    definition: quickNoteForm,
  },
};

/**
 * Project Setup — complex form with static options and multi-select.
 *
 * Steps: Name (text) → Framework (select) → Features (multi-select) → Deploy (select, disabled by default).
 *
 * - Framework defaults to React
 * - Features allows selecting multiple items
 * - Deploy is disabled by default — click the edit pencil to enable it
 * - Demonstrates defaultEnabled: false for optional steps
 */
export const ProjectSetup: Story = {
  args: {
    definition: projectSetupForm,
  },
};

/**
 * With pre-disabled steps.
 *
 * Same as New Workstream but with "model" step overridden to disabled.
 * Worktree is already defaultEnabled: false so it stays off.
 * The form only shows Name → Project → Review.
 * Click the edit pencil to re-enable disabled steps.
 */
export const PreDisabledSteps: Story = {
  args: {
    definition: newWorkstreamForm,
    disabledStepIds: ['model'],
  },
};

/**
 * Auto-filled to review via play function.
 *
 * Automatically fills in the New Workstream form and advances to the review screen.
 * Shows: Name = "Fix auth bug", Model = "Sonnet", Project = "vienna-v2", Worktree = "Yes".
 */
export const ReviewScreen: Story = {
  args: {
    definition: newWorkstreamForm,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1: Type workstream name
    const nameInput = await canvas.findByPlaceholderText('e.g. Fix auth bug, Add dark mode');
    await userEvent.type(nameInput, 'Fix auth bug');
    await userEvent.keyboard('{Enter}');

    // Wait for model options to resolve (async + animation)
    await new Promise((r) => setTimeout(r, 800));

    // Step 2: Select Sonnet (first option)
    const sonnetOption = await canvas.findByText('Sonnet');
    await userEvent.click(sonnetOption);
    await new Promise((r) => setTimeout(r, 400));

    // Step 3: Select vienna-v2 (first project)
    const viennaOption = await canvas.findByText('vienna-v2');
    await userEvent.click(viennaOption);
    await new Promise((r) => setTimeout(r, 400));

    // Step 4: Select "Yes, create worktree"
    const yesOption = await canvas.findByText('Yes, create worktree');
    await userEvent.click(yesOption);
  },
};

/**
 * Inline form — a minimal select-only form.
 *
 * Two select steps with static options, no text input.
 * Demonstrates that forms can be very quick (just hotkey taps).
 */
export const InlineSelectForm: Story = {
  args: {
    definition: defineActionForm({
      id: 'switch-model',
      title: 'Switch Model',
      icon: 'cpu',
      steps: [
        {
          id: 'model',
          header: 'Model',
          question: 'Switch to which model?',
          type: 'select',
          required: true,
          options: [
            { value: 'sonnet', label: 'Sonnet', description: 'Balanced performance', color: 'var(--color-violet-500)' },
            { value: 'opus', label: 'Opus', description: 'Most capable', color: 'var(--color-amber-500)' },
            { value: 'haiku', label: 'Haiku', description: 'Fast and efficient', color: 'var(--color-emerald-500)' },
          ],
        },
      ],
      onSubmit: async (answers) => {
        console.log('Switched to:', answers.model);
      },
    }),
  },
  parameters: {
    docs: {
      description: {
        story: `Minimal select-only form. User presses 1, 2, or 3 to select a model.
        Auto-advances to review (since it's the last step) then submits.
        Perfect for quick "switch X" actions triggered by keyboard shortcuts.`,
      },
    },
  },
};

/**
 * Customize overlay demo.
 *
 * Same as Project Setup. Click the pencil icon (top-right of the form header)
 * to open the customize overlay. Toggle steps on/off, then click "Done".
 *
 * - "Project" is required (cannot be toggled off)
 * - "Framework", "Features", "Deploy" are skippable
 * - "Deploy" starts disabled by default
 */
export const CustomizeSteps: Story = {
  args: {
    definition: projectSetupForm,
    onPreferencesChange: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: `Click the pencil icon to customize which steps appear in the form.

        Required steps show "Required" label and cannot be toggled.
        Skippable steps have a checkbox toggle.
        Changes are reported via onPreferencesChange callback for persistence.`,
      },
    },
  },
};

/**
 * Create Linear Issue — integration form for filing tickets.
 *
 * Steps: Team (select, async) → Title (text) → Priority (select) → Assignee (select, async) → Labels (multi-select, async) → Description (text, disabled by default).
 *
 * Demonstrates a realistic integration scenario:
 * - Team is required — the issue must belong to a team
 * - Title is required — every issue needs a name
 * - Priority defaults to "Medium" with color-coded urgency levels
 * - Assignee resolves team members asynchronously, defaults to "Unassigned"
 * - Labels use multi-select with colored dots for visual categorization
 * - Description is disabled by default (quick filing) — enable via edit pencil
 *
 * All select/multi-select steps with `resolve` simulate API latency (250-350ms)
 * to demonstrate the loading state and async option population.
 */
export const LinearTicket: Story = {
  args: {
    definition: linearTicketForm,
  },
  parameters: {
    docs: {
      description: {
        story: `Integration form for creating Linear issues directly from the chat input.

        Flow: Team → Title → Priority → Assignee → Labels → (Description)

        Key features demonstrated:
        - Multiple async resolvers (teams, members, labels) with staggered load times
        - Color-coded priority options (Urgent=red, High=amber, Medium=blue, Low=gray)
        - Color-coded labels via the \`color\` option property
        - Multi-select for labels with toggle behavior
        - Description step disabled by default for quick filing — power users enable it
        - Keyboard: press 1-5 to select priority instantly, arrows for team/assignee`,
      },
    },
  },
};

/**
 * Linear Ticket — auto-filled to review via play function.
 *
 * Walks through creating a ticket: Engineering team, bug title,
 * High priority, assigned to Alice, labeled as Bug + Security.
 */
export const LinearTicketReview: Story = {
  args: {
    definition: linearTicketForm,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1: Wait for teams to load, select Engineering
    await new Promise((r) => setTimeout(r, 600));
    const engOption = await canvas.findByText('Engineering');
    await userEvent.click(engOption);
    await new Promise((r) => setTimeout(r, 350));

    // Step 2: Type issue title
    const titleInput = await canvas.findByPlaceholderText('e.g. API returns 500 on /users endpoint');
    await userEvent.type(titleInput, 'Auth token refresh fails silently on mobile');
    await userEvent.keyboard('{Enter}');
    await new Promise((r) => setTimeout(r, 200));

    // Step 3: Select High priority
    const highOption = await canvas.findByText('High');
    await userEvent.click(highOption);
    await new Promise((r) => setTimeout(r, 500));

    // Step 4: Wait for members to load, select Alice
    const aliceOption = await canvas.findByText('Alice Chen');
    await userEvent.click(aliceOption);
    await new Promise((r) => setTimeout(r, 500));

    // Step 5: Wait for labels to load, select Bug and Security
    const bugLabel = await canvas.findByText('Bug');
    await userEvent.click(bugLabel);
    await new Promise((r) => setTimeout(r, 100));
    const secLabel = await canvas.findByText('Security');
    await userEvent.click(secLabel);
  },
};

/**
 * Send Slack Message — integration form for messaging channels.
 *
 * Steps: Channel (select, async) → Message (text) → Mention (multi-select, async) → Thread (confirm, disabled by default).
 *
 * Demonstrates a communication integration:
 * - Channel list resolves from Slack API with descriptions
 * - Incident channel highlighted with red color indicator
 * - Message is a required free-text input
 * - Mention step lets you tag @here, @channel, or specific people
 * - Thread option is disabled by default — most messages go to main channel
 * - Enable threading via the edit pencil for reply-in-thread workflows
 *
 * This form shows how Quick Forms can be used for cross-app actions,
 * not just Vienna-internal operations.
 */
export const SlackMessage: Story = {
  args: {
    definition: slackMessageForm,
  },
  parameters: {
    docs: {
      description: {
        story: `Integration form for sending Slack messages from the chat input.

        Flow: Channel → Message → Mentions → (Thread)

        Key features demonstrated:
        - Channel selector with colored indicators (#incidents = red, #deploys = green)
        - Free-text message input as the core content step
        - Multi-select mentions with @here/@channel special options + individual users
        - Thread step disabled by default — enable via edit pencil for thread replies
        - Keyboard: select channel by number, type message, Enter to advance`,
      },
    },
  },
};

/**
 * Slack Message — auto-filled to review via play function.
 *
 * Sends to #engineering, mentions @here + Alice, posts a deployment message.
 */
export const SlackMessageReview: Story = {
  args: {
    definition: slackMessageForm,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1: Wait for channels to load, select #engineering
    await new Promise((r) => setTimeout(r, 600));
    const engChannel = await canvas.findByText('#engineering');
    await userEvent.click(engChannel);
    await new Promise((r) => setTimeout(r, 350));

    // Step 2: Type message
    const msgInput = await canvas.findByPlaceholderText('Type your message...');
    await userEvent.type(msgInput, 'Deploying v2.4.0 to production — includes auth token fix and new Quick Forms feature. ETA 15 min.');
    await userEvent.keyboard('{Enter}');
    await new Promise((r) => setTimeout(r, 500));

    // Step 3: Wait for members to load, select @here and Alice
    const hereOption = await canvas.findByText('@here');
    await userEvent.click(hereOption);
    await new Promise((r) => setTimeout(r, 100));
    const aliceOption = await canvas.findByText('Alice Chen');
    await userEvent.click(aliceOption);
  },
};
