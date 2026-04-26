/**
 * Workstream Settings Helpers — Pure formatting functions for the settings drawer.
 *
 * @ai-context
 * - All functions are pure (no side effects, no imports from React/context)
 * - formatRelativeTime converts ISO date strings to human-readable relative time
 * - formatStatusLabel converts GraphQL WorkstreamStatus enums to display labels
 * - Extracted from drift-v2 monolith for independent testability
 */

/**
 * Formats a date string as a human-readable relative time.
 *
 * @example
 * formatRelativeTime('2026-03-02T12:00:00Z') // "Just now" (if within 60s)
 * formatRelativeTime('2026-03-02T11:55:00Z') // "5m ago"
 * formatRelativeTime('2026-03-02T09:00:00Z') // "3h ago"
 * formatRelativeTime('2026-03-01T12:00:00Z') // "Yesterday"
 * formatRelativeTime('2026-02-25T12:00:00Z') // "5d ago"
 * formatRelativeTime('2025-12-01T12:00:00Z') // "Dec 1, 2025"
 */
export function formatRelativeTime(dateStr: string | number): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 30) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Formats a workstream status enum to a human-readable label.
 */
export function formatStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'processing':
      return 'Processing';
    case 'completed_unviewed':
      return 'Completed';
    case 'waiting_permission':
      return 'Needs Review';
    case 'idle':
      return 'Idle';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  }
}

/**
 * Truncates a string to a max length, appending ellipsis if needed.
 */
export function truncateId(id: string, maxLength = 8): string {
  if (id.length <= maxLength) return id;
  return id.slice(0, maxLength) + '...';
}
