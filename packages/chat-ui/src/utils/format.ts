/**
 * Format Utilities
 *
 * Text and number formatting functions.
 *
 * @module chat-ui/utils/format
 */

/** Format milliseconds to human-readable duration. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  const seconds = ms / 1000;
  if (seconds < 60) return seconds.toFixed(1) + 's';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return minutes + 'm ' + secs + 's';
}

/** Truncate text to a maximum length with ellipsis. */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Clean CLI output by removing line number prefixes and system reminders.
 */
export function cleanCliOutput(content: string): string {
  let cleaned = content.replace(/\n*<system-reminder>[\s\S]*?<\/system-reminder>/g, '');
  cleaned = cleaned.replace(/^\s*\d+→/gm, '');
  return cleaned.trim();
}
