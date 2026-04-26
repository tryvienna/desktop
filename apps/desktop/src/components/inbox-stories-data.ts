/**
 * Mock data for inbox Storybook stories.
 *
 * Provides realistic inbox items spanning various states: read/unread,
 * icons (SVG, emoji, none), action CTAs, entity links, long descriptions.
 * Items use the `actions: InboxAction[]` format for multi-action support.
 */

import type { InboxItem } from './inbox-utils';

const now = Date.now();
const min = 60_000;
const hr = 60 * min;
const day = 24 * hr;

// Sample SVG icon (GitHub-style)
const githubSvg = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;

// Slack-style icon
const slackSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`;

export const mockItems: InboxItem[] = [
  {
    id: '1',
    title: 'PR #483 merged to main',
    description: 'feat: Inbox system — database, GraphQL, UI, notifications. 12 files changed.',
    icon: githubSvg,
    source: 'github-cli',
    actions: [],
    entityUri: '@vienna//github_pr/483',
    read: false,
    archived: false,
    createdAt: new Date(now - 2 * min).toISOString(),
    updatedAt: new Date(now - 2 * min).toISOString(),
  },
  {
    id: '2',
    title: 'CI build failed on plugins-inbox',
    description: 'TypeScript error in packages/graphql/src/domains/inbox/mutations.ts — Property "inbox" does not exist on type "GraphQLContext".',
    icon: '🔴',
    source: 'github-cli',
    actions: [
      { id: 'view-ci-logs', label: 'View CI Logs', payload: { runId: '12345', repo: 'vienna' } },
      { id: 'retry-build', label: 'Retry Build', payload: { runId: '12345' } },
    ],
    entityUri: null,
    read: false,
    archived: false,
    createdAt: new Date(now - 15 * min).toISOString(),
    updatedAt: new Date(now - 15 * min).toISOString(),
  },
  {
    id: '3',
    title: 'New comment on your PR review',
    description: 'Alex: "The DOMPurify allowlist looks good but consider adding aria-* attributes for better accessibility support."',
    icon: githubSvg,
    source: 'github-cli',
    actions: [
      { id: 'view-comment', label: 'View Comment' },
      { id: 'reply', label: 'Reply' },
      { id: 'resolve', label: 'Resolve Thread' },
    ],
    entityUri: '@vienna//github_pr/484',
    read: false,
    archived: false,
    createdAt: new Date(now - 45 * min).toISOString(),
    updatedAt: new Date(now - 45 * min).toISOString(),
  },
  {
    id: '4',
    title: 'Standup reminder',
    description: 'Daily standup starts in 15 minutes. Join the #engineering channel.',
    icon: slackSvg,
    source: 'slack',
    actions: [
      { id: 'open-standup', label: 'Join Standup', payload: { channel: 'engineering' } },
    ],
    entityUri: null,
    read: false,
    archived: false,
    createdAt: new Date(now - 1 * hr).toISOString(),
    updatedAt: new Date(now - 1 * hr).toISOString(),
  },
  {
    id: '5',
    title: 'Task "Design inbox panel UI" completed',
    description: null,
    icon: '✅',
    source: 'tasks',
    actions: [],
    entityUri: '@vienna//task/task-123',
    read: true,
    archived: false,
    createdAt: new Date(now - 3 * hr).toISOString(),
    updatedAt: new Date(now - 3 * hr).toISOString(),
  },
  {
    id: '6',
    title: 'Weekly metrics report ready',
    description: 'Your team shipped 23 PRs this week. Active plugin count is up 12% from last week. View the full report.',
    icon: '📊',
    source: 'core',
    actions: [],
    entityUri: null,
    read: true,
    archived: false,
    createdAt: new Date(now - 6 * hr).toISOString(),
    updatedAt: new Date(now - 6 * hr).toISOString(),
  },
  {
    id: '7',
    title: 'Plugin "github" updated to v2.1.0',
    description: 'New entity handlers and bug fixes. Review the changelog before upgrading.',
    icon: null,
    source: 'registry',
    actions: [
      { id: 'upgrade-plugin', label: 'Upgrade Now', payload: { pluginId: 'github', version: '2.1.0' } },
      { id: 'view-changelog', label: 'View Changelog' },
      { id: 'dismiss-update', label: 'Dismiss' },
    ],
    entityUri: null,
    read: true,
    archived: false,
    createdAt: new Date(now - 1 * day).toISOString(),
    updatedAt: new Date(now - 1 * day).toISOString(),
  },
  {
    id: '8',
    title: 'Deployment to production succeeded',
    description: 'vienna-web v3.14.2 deployed to production. All health checks passing.',
    icon: '🚀',
    source: 'core',
    actions: [],
    entityUri: null,
    read: true,
    archived: false,
    createdAt: new Date(now - 2 * day).toISOString(),
    updatedAt: new Date(now - 2 * day).toISOString(),
  },
];

/** First 4 items — all unread */
export const unreadOnlyItems = mockItems.filter((i) => !i.read);

/** All items marked as read */
export const allReadItems = mockItems.map((i) => ({ ...i, read: true }));

/** Single unread item */
export const singleUnreadItem = [mockItems[0]!];

/** Large list for scroll testing */
export const manyItems: InboxItem[] = Array.from({ length: 30 }, (_, i) => ({
  id: `many-${i}`,
  title: `Notification #${i + 1} — ${['PR merged', 'Build failed', 'New comment', 'Task completed', 'Deploy succeeded'][i % 5]}`,
  description: i % 3 === 0 ? 'This is a longer description that provides additional context about the notification and what action might be needed.' : i % 3 === 1 ? 'Short description.' : null,
  icon: [githubSvg, '🔴', '✅', null, '🚀'][i % 5]!,
  source: ['github-cli', 'core', 'tasks', 'slack', 'registry'][i % 5]!,
  actions: i % 4 === 0 ? [{ id: 'view-details', label: 'View Details', payload: { id: i } }] : [],
  entityUri: i % 3 === 0 ? `@vienna//github_pr/${100 + i}` : null,
  read: i >= 5,
  archived: false,
  createdAt: new Date(now - i * 30 * min).toISOString(),
  updatedAt: new Date(now - i * 30 * min).toISOString(),
}));
