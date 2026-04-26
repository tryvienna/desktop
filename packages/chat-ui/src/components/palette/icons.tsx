/**
 * Palette Icons — Entity and Command icons with semantic colors
 *
 * @ai-context
 * - Maps entity types and command categories to Lucide icons and colors
 * - Integration brand colors are fixed (not themed); local types use CSS variables
 * - Resolution chain: static map -> lucideByName[iconHint] -> FileIcon fallback
 * - EntityIcon and CommandIcon are memoized leaf components
 */

import { memo } from 'react';

import {
  FileIcon,
  FolderIcon,
  MessageSquareIcon,
  CalendarIcon,
  MailIcon,
  ZapIcon,
  GlobeIcon,
  DatabaseIcon,
  BoxIcon,
  StarIcon,
  ShieldIcon,
  BookOpenIcon,
  TagIcon,
  UserIcon,
  GitMergeIcon,
  GitPullRequestIcon,
  BugIcon,
  type LucideIcon,
} from 'lucide-react';

import type { CommandCategory } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION BRAND COLORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Integration brand colors - these are third-party brand identities.
 * Do not theme these colors - they should be consistent across themes.
 */
export const INTEGRATION_COLORS = {
  linear: '#5E6AD2', // Linear brand purple
  gmail: '#EF4444', // Gmail brand red
  slack: '#8B5CF6', // Slack brand violet
  github: '#10B981', // GitHub brand emerald
  drive: '#3B82F6', // Google Drive brand blue
  calendar: '#14B8A6', // Google Calendar brand teal
  sentry: '#362D59', // Sentry brand purple
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const entityIconMap: Record<string, LucideIcon> = {
  // Integrations (lucide equivalents for brand icons)
  linear: GitMergeIcon,
  github_pr: GitPullRequestIcon,
  github_issue: GitPullRequestIcon,
  gmail: MailIcon,
  calendar_event: CalendarIcon,
  drive_file: FolderIcon,
  slack: MessageSquareIcon,
  sentry_issue: BugIcon,
  // Local
  local_file: FileIcon,
  workstream: MessageSquareIcon,
  skill: ZapIcon,
  // Generic
  contact: MessageSquareIcon,
  note: FileIcon,
  bookmark: FolderIcon,
};

const entityColorMap: Record<string, string> = {
  // Integrations - use brand colors
  linear: INTEGRATION_COLORS.linear,
  github_pr: INTEGRATION_COLORS.github,
  github_issue: INTEGRATION_COLORS.github,
  gmail: INTEGRATION_COLORS.gmail,
  calendar_event: INTEGRATION_COLORS.calendar,
  drive_file: INTEGRATION_COLORS.drive,
  slack: INTEGRATION_COLORS.slack,
  sentry_issue: INTEGRATION_COLORS.sentry,
  // Local - use semantic tokens (will theme)
  local_file: 'var(--text-brand)',
  workstream: 'var(--text-brand)',
  skill: 'var(--text-warning)', // Skills use warning/amber color (like lightning)
  // Generic - use semantic tokens
  contact: 'var(--text-secondary)',
  note: 'var(--text-secondary)',
  bookmark: 'var(--text-secondary)',
};

/**
 * Curated Lucide icon lookup by name.
 * Used for dynamic icon resolution when an entity type
 * registers with an icon hint (e.g., 'zap', 'globe', 'database').
 */
const lucideByName: Record<string, LucideIcon> = {
  zap: ZapIcon,
  'message-square': MessageSquareIcon,
  file: FileIcon,
  folder: FolderIcon,
  globe: GlobeIcon,
  database: DatabaseIcon,
  box: BoxIcon,
  star: StarIcon,
  shield: ShieldIcon,
  'book-open': BookOpenIcon,
  tag: TagIcon,
  user: UserIcon,
  calendar: CalendarIcon,
  mail: MailIcon,
};

export interface EntityIconProps {
  type: string;
  size?: number;
  className?: string;
  /** Icon name hint from entity registry (e.g., 'zap', 'globe') */
  iconHint?: string;
}

/**
 * EntityIcon - Renders the appropriate icon for an entity type.
 *
 * @example
 * ```tsx
 * <EntityIcon type="linear" size={16} />
 * <EntityIcon type="local_file" size={20} className="text-brand" />
 * ```
 */
export const EntityIcon = memo(function EntityIcon({
  type,
  size = 16,
  className,
  iconHint,
}: EntityIconProps) {
  // Resolution chain: static map → lucideByName[iconHint] → FileIcon fallback
  const IconComponent =
    entityIconMap[type] || (iconHint ? lucideByName[iconHint] : undefined) || FileIcon;
  const color = entityColorMap[type] || 'var(--text-secondary)';

  return <IconComponent size={size} style={{ color }} className={className} aria-hidden="true" />;
});

/**
 * Get icon component and color for an entity type.
 * Useful for custom rendering.
 *
 * @param type - Entity type string
 * @param iconHint - Optional Lucide icon name hint from entity registry
 */
export function getEntityIconInfo(
  type: string,
  iconHint?: string
): {
  Icon: LucideIcon;
  color: string;
} {
  return {
    Icon: entityIconMap[type] || (iconHint ? lucideByName[iconHint] : undefined) || FileIcon,
    color: entityColorMap[type] || 'var(--text-secondary)',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const commandIconMap: Record<CommandCategory, LucideIcon> = {
  claude: MessageSquareIcon,
  navigation: FolderIcon,
  workstream: BoxIcon,
  skill: ZapIcon,
  file: FileIcon,
  edit: FileIcon,
  view: FileIcon,
  ai: MessageSquareIcon,
  integrations: MessageSquareIcon,
  settings: MessageSquareIcon,
  developer: MessageSquareIcon,
  help: BookOpenIcon,
};

const commandColorMap: Record<CommandCategory, string> = {
  claude: 'var(--text-ai)',
  navigation: 'var(--text-brand)',
  workstream: 'var(--text-brand)',
  skill: 'var(--text-warning)',
  file: 'var(--text-success)',
  edit: 'var(--text-brand)',
  view: 'var(--text-secondary)',
  ai: 'var(--text-ai)',
  integrations: 'var(--text-secondary)',
  settings: 'var(--text-secondary)',
  developer: 'var(--text-warning)',
  help: 'var(--text-info)',
};

export interface CommandIconProps {
  category: CommandCategory;
  size?: number;
  className?: string;
}

/**
 * CommandIcon - Renders the appropriate icon for a command category.
 *
 * @example
 * ```tsx
 * <CommandIcon category="claude" size={16} />
 * <CommandIcon category="file" size={20} />
 * ```
 */
export const CommandIcon = memo(function CommandIcon({
  category,
  size = 16,
  className,
}: CommandIconProps) {
  const IconComponent = commandIconMap[category] || MessageSquareIcon;
  const color = commandColorMap[category] || 'var(--text-secondary)';

  return <IconComponent size={size} style={{ color }} className={className} aria-hidden="true" />;
});

/**
 * Get icon component and color for a command category.
 * Useful for custom rendering.
 */
export function getCommandIconInfo(category: CommandCategory): {
  Icon: LucideIcon;
  color: string;
} {
  return {
    Icon: commandIconMap[category] || MessageSquareIcon,
    color: commandColorMap[category] || 'var(--text-secondary)',
  };
}
