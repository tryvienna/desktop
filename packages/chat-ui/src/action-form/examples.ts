/**
 * Example action form definitions for Storybook and testing
 *
 * @ai-context
 * - Demonstrates the defineActionForm API with realistic examples
 * - newWorkstreamForm: Multi-step form for creating a new workstream
 * - quickNoteForm: Simple single-step text form
 * - projectSetupForm: Complex form with async resolvers and derived context
 * - linearTicketForm: Integration form — create a Linear issue with team, priority, labels
 * - slackMessageForm: Integration form — send a Slack message with channel, thread, mentions
 */

import { defineActionForm } from './define-action-form';
import type { ActionFormOption } from './define-action-form';

// ─── Helpers ────────────────────────────────────────────────────────────────

function sanitizeForBranch(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/** Simulates an async API call to fetch models */
async function resolveModels(): Promise<ActionFormOption[]> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 400));
  return [
    {
      value: 'sonnet',
      label: 'Sonnet',
      description: 'Balanced performance',
      color: 'var(--color-violet-500)',
    },
    {
      value: 'opus',
      label: 'Opus',
      description: 'Most capable',
      color: 'var(--color-amber-500)',
    },
    {
      value: 'haiku',
      label: 'Haiku',
      description: 'Fast and efficient',
      color: 'var(--color-emerald-500)',
    },
  ];
}

/** Simulates fetching projects */
async function resolveProjects(): Promise<ActionFormOption[]> {
  await new Promise((r) => setTimeout(r, 300));
  return [
    { value: 'vienna-v2', label: 'vienna-v2', description: 'Main Vienna application' },
    { value: 'vienna', label: 'vienna', description: 'Component library & agent UI' },
    { value: 'sdk', label: 'sdk', description: 'Entity definition framework' },
    { value: 'plugin-runtime', label: 'plugin-runtime', description: 'Plugin execution engine' },
  ];
}

// ─── New Workstream Form ────────────────────────────────────────────────────

export const newWorkstreamForm = defineActionForm({
  id: 'new-workstream',
  title: 'New Workstream',
  icon: 'plus',
  shortcut: 'mod+n',
  steps: [
    {
      id: 'name',
      header: 'Name',
      question: 'What should we call this workstream?',
      type: 'text',
      placeholder: 'e.g. Fix auth bug, Add dark mode',
      required: true,
    },
    {
      id: 'model',
      header: 'Model',
      question: 'Which model should power this workstream?',
      type: 'select',
      resolve: resolveModels,
      defaultValue: 'sonnet',
      skippable: true,
    },
    {
      id: 'project',
      header: 'Project',
      question: 'Which project is this for?',
      type: 'select',
      resolve: resolveProjects,
      skippable: true,
    },
    {
      id: 'worktree',
      header: 'Worktree',
      question: 'Create a git worktree for this workstream?',
      type: 'select',
      options: [
        { value: '__no__', label: 'No' },
        { value: '__yes__', label: 'Yes' },
      ],
      defaultValue: (context) =>
        context.name ? sanitizeForBranch(context.name) : '__no__',
      freeformOption: {
        optionValue: '__yes__',
        defaultText: (context) => (context.name ? sanitizeForBranch(context.name) : ''),
        placeholder: 'e.g. fix-auth-bug',
      },
      skippable: true,
    },
  ],
  onSubmit: async (answers) => {
    console.log('Creating workstream:', answers);
  },
});

// ─── Quick Note Form ────────────────────────────────────────────────────────

export const quickNoteForm = defineActionForm({
  id: 'quick-note',
  title: 'Quick Note',
  icon: 'pencil',
  steps: [
    {
      id: 'content',
      header: 'Note',
      question: 'What would you like to note?',
      type: 'text',
      placeholder: 'Type your note...',
      required: true,
    },
  ],
  onSubmit: async (answers) => {
    console.log('Note saved:', answers.content);
  },
});

// ─── Project Setup Form ─────────────────────────────────────────────────────

export const projectSetupForm = defineActionForm({
  id: 'project-setup',
  title: 'Set Up Project',
  icon: 'folder-plus',
  steps: [
    {
      id: 'name',
      header: 'Project',
      question: 'What is the project name?',
      type: 'text',
      placeholder: 'e.g. my-cool-app',
      required: true,
    },
    {
      id: 'framework',
      header: 'Framework',
      question: 'Which framework should we use?',
      type: 'select',
      options: [
        { value: 'react', label: 'React', description: 'Component-based UI library' },
        { value: 'vue', label: 'Vue', description: 'Progressive framework' },
        { value: 'svelte', label: 'Svelte', description: 'Compile-time framework' },
        { value: 'solid', label: 'SolidJS', description: 'Fine-grained reactivity' },
      ],
      defaultValue: 'react',
      skippable: true,
    },
    {
      id: 'features',
      header: 'Features',
      question: 'Which features should we include?',
      type: 'multi-select',
      options: [
        { value: 'auth', label: 'Authentication', description: 'User login & registration' },
        { value: 'db', label: 'Database', description: 'PostgreSQL with Drizzle ORM' },
        { value: 'api', label: 'REST API', description: 'Express or Hono server' },
        { value: 'testing', label: 'Testing', description: 'Vitest + Playwright' },
        { value: 'ci', label: 'CI/CD', description: 'GitHub Actions pipeline' },
      ],
      skippable: true,
    },
    {
      id: 'deploy',
      header: 'Deploy',
      question: 'Where should we deploy?',
      type: 'select',
      options: [
        { value: 'vercel', label: 'Vercel', description: 'Edge-first platform' },
        { value: 'aws', label: 'AWS', description: 'Amazon infrastructure' },
        { value: 'cloudflare', label: 'Cloudflare', description: 'Workers + Pages' },
        { value: 'self-hosted', label: 'Self-hosted', description: 'Docker + VPS' },
      ],
      skippable: true,
      defaultEnabled: false, // Disabled by default, user can enable via customize
    },
  ],
  onSubmit: async (answers) => {
    console.log('Setting up project:', answers);
  },
});

// ─── Linear Ticket Form ─────────────────────────────────────────────────────

/** Simulates fetching Linear teams from the API */
async function resolveLinearTeams(): Promise<ActionFormOption[]> {
  await new Promise((r) => setTimeout(r, 350));
  return [
    { value: 'eng', label: 'Engineering', description: '12 members', icon: 'code' },
    { value: 'design', label: 'Design', description: '5 members', icon: 'palette' },
    { value: 'infra', label: 'Infrastructure', description: '4 members', icon: 'server' },
    { value: 'mobile', label: 'Mobile', description: '6 members', icon: 'smartphone' },
  ];
}

/** Simulates fetching team members for assignee selection */
async function resolveLinearMembers(): Promise<ActionFormOption[]> {
  await new Promise((r) => setTimeout(r, 300));
  return [
    { value: 'unassigned', label: 'Unassigned', description: 'No assignee' },
    { value: 'alice', label: 'Alice Chen', description: 'alice@company.com' },
    { value: 'bob', label: 'Bob Martinez', description: 'bob@company.com' },
    { value: 'carol', label: 'Carol Kim', description: 'carol@company.com' },
    { value: 'dave', label: 'Dave Patel', description: 'dave@company.com' },
    { value: 'eve', label: 'Eve Johnson', description: 'eve@company.com' },
  ];
}

/** Simulates fetching labels from Linear */
async function resolveLinearLabels(): Promise<ActionFormOption[]> {
  await new Promise((r) => setTimeout(r, 250));
  return [
    { value: 'bug', label: 'Bug', color: 'var(--color-red-500)' },
    { value: 'feature', label: 'Feature', color: 'var(--color-violet-500)' },
    { value: 'improvement', label: 'Improvement', color: 'var(--color-blue-500)' },
    { value: 'tech-debt', label: 'Tech Debt', color: 'var(--color-amber-500)' },
    { value: 'documentation', label: 'Documentation', color: 'var(--color-emerald-500)' },
    { value: 'security', label: 'Security', color: 'var(--color-red-400)' },
    { value: 'performance', label: 'Performance', color: 'var(--color-cyan-500)' },
  ];
}

export const linearTicketForm = defineActionForm({
  id: 'linear-ticket',
  title: 'Create Linear Issue',
  icon: 'ticket',
  shortcut: 'mod+shift+l',
  steps: [
    {
      id: 'team',
      header: 'Team',
      question: 'Which team should own this issue?',
      type: 'select',
      resolve: resolveLinearTeams,
      required: true,
    },
    {
      id: 'title',
      header: 'Title',
      question: 'What is the issue title?',
      type: 'text',
      placeholder: 'e.g. API returns 500 on /users endpoint',
      required: true,
    },
    {
      id: 'priority',
      header: 'Priority',
      question: 'How urgent is this?',
      type: 'select',
      options: [
        { value: 'urgent', label: 'Urgent', description: 'Drop everything', color: 'var(--color-red-500)' },
        { value: 'high', label: 'High', description: 'Current cycle', color: 'var(--color-amber-500)' },
        { value: 'medium', label: 'Medium', description: 'Next cycle', color: 'var(--color-blue-500)' },
        { value: 'low', label: 'Low', description: 'When there is time', color: 'var(--color-gray-400)' },
        { value: 'none', label: 'No Priority', description: 'Unprioritized' },
      ],
      defaultValue: 'medium',
      skippable: true,
    },
    {
      id: 'assignee',
      header: 'Assignee',
      question: 'Who should work on this?',
      type: 'select',
      resolve: resolveLinearMembers,
      defaultValue: 'unassigned',
      skippable: true,
    },
    {
      id: 'labels',
      header: 'Labels',
      question: 'Add labels to categorize this issue',
      type: 'multi-select',
      resolve: resolveLinearLabels,
      skippable: true,
    },
    {
      id: 'description',
      header: 'Description',
      question: 'Add a description (optional)',
      type: 'text',
      placeholder: 'Describe the issue, steps to reproduce, expected behavior...',
      skippable: true,
      defaultEnabled: false, // Most quick tickets skip the description
    },
  ],
  onSubmit: async (answers) => {
    console.log('Creating Linear issue:', answers);
  },
});

// ─── Slack Message Form ─────────────────────────────────────────────────────

/** Simulates fetching Slack channels */
async function resolveSlackChannels(): Promise<ActionFormOption[]> {
  await new Promise((r) => setTimeout(r, 400));
  return [
    { value: 'C01-general', label: '#general', description: 'Company-wide announcements' },
    { value: 'C02-engineering', label: '#engineering', description: 'Engineering discussions' },
    { value: 'C03-design', label: '#design', description: 'Design team' },
    { value: 'C04-incidents', label: '#incidents', description: 'Production incidents', color: 'var(--color-red-500)' },
    { value: 'C05-deploys', label: '#deploys', description: 'Deployment notifications', color: 'var(--color-emerald-500)' },
    { value: 'C06-random', label: '#random', description: 'Water cooler' },
    { value: 'C07-standup', label: '#standup', description: 'Daily standup updates' },
    { value: 'C08-product', label: '#product', description: 'Product discussions' },
  ];
}

/** Simulates fetching Slack users for mentions */
async function resolveSlackMembers(): Promise<ActionFormOption[]> {
  await new Promise((r) => setTimeout(r, 300));
  return [
    { value: '@here', label: '@here', description: 'Notify active members in channel' },
    { value: '@channel', label: '@channel', description: 'Notify everyone in channel' },
    { value: 'U01-alice', label: 'Alice Chen', description: 'Engineering' },
    { value: 'U02-bob', label: 'Bob Martinez', description: 'Engineering' },
    { value: 'U03-carol', label: 'Carol Kim', description: 'Design' },
    { value: 'U04-dave', label: 'Dave Patel', description: 'Product' },
    { value: 'U05-eve', label: 'Eve Johnson', description: 'Infrastructure' },
  ];
}

export const slackMessageForm = defineActionForm({
  id: 'slack-message',
  title: 'Send Slack Message',
  icon: 'message-square',
  shortcut: 'mod+shift+s',
  steps: [
    {
      id: 'channel',
      header: 'Channel',
      question: 'Which channel should receive this message?',
      type: 'select',
      resolve: resolveSlackChannels,
      required: true,
    },
    {
      id: 'message',
      header: 'Message',
      question: 'What do you want to say?',
      type: 'text',
      placeholder: 'Type your message...',
      required: true,
    },
    {
      id: 'mentions',
      header: 'Mention',
      question: 'Tag anyone in this message?',
      type: 'multi-select',
      resolve: resolveSlackMembers,
      skippable: true,
    },
    {
      id: 'thread',
      header: 'Thread',
      question: 'Send as a thread reply?',
      type: 'confirm',
      confirmLabel: 'Yes, reply in thread',
      denyLabel: 'No, post to channel',
      defaultValue: false,
      skippable: true,
      defaultEnabled: false, // Most quick messages don't need threading
    },
  ],
  onSubmit: async (answers) => {
    console.log('Sending Slack message:', answers);
  },
});
