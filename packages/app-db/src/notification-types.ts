/**
 * Notification Type Catalog
 *
 * Declarative metadata for every inbox notification type Vienna knows about.
 * The catalog drives the granular mute UI: each type has a stable id (used as
 * the key in `mutedTypes` settings), a source label (used as the key in
 * `mutedSources`), and a human-readable label.
 *
 * IMPORTANT: keep `id` strings stable across releases — they are persisted
 * in user settings as mute keys.
 *
 * Plugin-pushed items via the GraphQL `pushInboxItem` mutation are not in
 * this catalog; they get an auto-derived id (`${pluginId}.default`) and are
 * filterable at the source level only.
 */

export interface NotificationType {
  /** Stable id, used as the key in `mutedTypes` settings. */
  readonly id: string;
  /** Source label, used as the key in `mutedSources` settings and as the grouping header in the UI. */
  readonly source: string;
  /** Human-readable type label shown in the settings UI. */
  readonly label: string;
  /** Optional one-line description shown under the label in the settings UI. */
  readonly description?: string;
  /** Whether the type is enabled by default. */
  readonly defaultEnabled: boolean;
}

export const BUILTIN_NOTIFICATION_TYPES: readonly NotificationType[] = [
  {
    id: 'core.src.todo.added',
    source: 'Claude Code',
    label: 'TODO/FIXME added',
    description: 'A TODO, FIXME, or HACK comment was added to a file Claude is editing.',
    defaultEnabled: true,
  },
  {
    id: 'core.src.todo.removed',
    source: 'Claude Code',
    label: 'TODO/FIXME removed',
    description: 'A TODO, FIXME, or HACK comment was removed.',
    defaultEnabled: true,
  },
  {
    id: 'core.claude-code.turn.completed',
    source: 'Claude Code',
    label: 'Turn complete',
    description: 'A Claude Code turn finished. Suppressed for sessions launched inside a Vienna workstream.',
    defaultEnabled: true,
  },
  {
    id: 'github_cli.pr.created',
    source: 'GitHub',
    label: 'Pull request opened',
    defaultEnabled: true,
  },
  {
    id: 'github_cli.commit.created',
    source: 'GitHub',
    label: 'Commit created',
    defaultEnabled: true,
  },
  {
    id: 'github_cli.pr.merged',
    source: 'GitHub',
    label: 'Pull request merged',
    defaultEnabled: true,
  },
  {
    id: 'vercel_cli.route.analysis.complete',
    source: 'Next.js',
    label: 'Route impact analysis',
    description: 'Vercel CLI analyzed which routes are impacted by a change.',
    defaultEnabled: true,
  },
];

/** Distinct source labels in catalog order. */
export function listNotificationSources(catalog: readonly NotificationType[] = BUILTIN_NOTIFICATION_TYPES): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of catalog) {
    if (!seen.has(t.source)) {
      seen.add(t.source);
      out.push(t.source);
    }
  }
  return out;
}
