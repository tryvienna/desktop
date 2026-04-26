/**
 * formatFeedback — Formats inline review comments into structured feedback text
 * for the deny-with-message pipeline.
 *
 * @ai-context
 * - Pure functions, no React — safe to unit test without DOM
 * - `formatAllComments` batches all non-submitted comments into one feedback string
 * - Each comment is quoted with `> selected text` then the user's feedback text
 * - `truncateQuote` strips markdown heading prefixes and caps at 120 chars
 * - Output is sent as the `message` field in the deny permission response,
 *   which flows: formatFeedback → denyPermission → GraphQL → SessionManager → agent-core
 * - Tested in: formatFeedback.unit.test.ts
 */

import type { PlanComment } from './usePlanComments';

/**
 * Format all pending (non-submitted) comments into a single feedback message.
 */
export function formatAllComments(comments: Map<string, PlanComment>): string {
  const lines: string[] = ['Plan feedback:'];
  for (const comment of comments.values()) {
    if (comment.submitted) continue;
    const preview = truncateQuote(comment.selectedText);
    lines.push('');
    lines.push(`> ${preview}`);
    lines.push(comment.text);
  }
  return lines.join('\n');
}

function truncateQuote(text: string): string {
  // Use first line, truncated
  const firstLine = text.split('\n')[0] ?? '';
  const cleaned = firstLine.replace(/^#+\s*/, '').trim();
  return cleaned.length > 120 ? cleaned.slice(0, 117) + '...' : cleaned;
}
