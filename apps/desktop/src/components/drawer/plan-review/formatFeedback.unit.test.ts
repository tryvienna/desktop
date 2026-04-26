import { describe, it, expect } from 'vitest';
import { formatAllComments } from './formatFeedback';
import type { PlanComment } from './usePlanComments';

function makeComment(overrides: Partial<PlanComment> & { id: string }): PlanComment {
  return { selectedText: 'some text', text: 'my feedback', submitted: false, ...overrides };
}

describe('formatAllComments', () => {
  it('formats a single pending comment with quoted context', () => {
    const comments = new Map<string, PlanComment>();
    comments.set('c1', makeComment({ id: 'c1', selectedText: 'Step 1: Do X', text: 'This should be Y instead' }));

    const result = formatAllComments(comments);
    expect(result).toBe('Plan feedback:\n\n> Step 1: Do X\nThis should be Y instead');
  });

  it('batches multiple pending comments', () => {
    const comments = new Map<string, PlanComment>();
    comments.set('c1', makeComment({ id: 'c1', selectedText: 'Step 1', text: 'Fix A' }));
    comments.set('c2', makeComment({ id: 'c2', selectedText: 'Step 2', text: 'Fix B' }));

    const result = formatAllComments(comments);
    expect(result).toBe('Plan feedback:\n\n> Step 1\nFix A\n\n> Step 2\nFix B');
  });

  it('skips already-submitted comments', () => {
    const comments = new Map<string, PlanComment>();
    comments.set('c1', makeComment({ id: 'c1', selectedText: 'Old', text: 'Old feedback', submitted: true }));
    comments.set('c2', makeComment({ id: 'c2', selectedText: 'New', text: 'New feedback' }));

    const result = formatAllComments(comments);
    expect(result).toBe('Plan feedback:\n\n> New\nNew feedback');
  });

  it('returns header only when all comments are submitted', () => {
    const comments = new Map<string, PlanComment>();
    comments.set('c1', makeComment({ id: 'c1', submitted: true }));

    expect(formatAllComments(comments)).toBe('Plan feedback:');
  });

  it('returns header only for empty map', () => {
    expect(formatAllComments(new Map())).toBe('Plan feedback:');
  });

  it('truncates long selected text to 120 chars', () => {
    const longText = 'A'.repeat(200);
    const comments = new Map<string, PlanComment>();
    comments.set('c1', makeComment({ id: 'c1', selectedText: longText, text: 'too long' }));

    const result = formatAllComments(comments);
    const quotedLine = result.split('\n').find((l) => l.startsWith('>'));
    // 117 chars + '...' = 120 total after '> '
    expect(quotedLine!.length).toBeLessThanOrEqual(2 + 120); // '> ' prefix + truncated
    expect(quotedLine).toContain('...');
  });

  it('strips markdown heading prefixes from quoted text', () => {
    const comments = new Map<string, PlanComment>();
    comments.set('c1', makeComment({ id: 'c1', selectedText: '## My Heading', text: 'feedback' }));

    const result = formatAllComments(comments);
    expect(result).toContain('> My Heading');
    expect(result).not.toContain('> ##');
  });

  it('uses only first line of multi-line selected text', () => {
    const comments = new Map<string, PlanComment>();
    comments.set('c1', makeComment({ id: 'c1', selectedText: 'Line 1\nLine 2\nLine 3', text: 'feedback' }));

    const result = formatAllComments(comments);
    expect(result).toContain('> Line 1');
    expect(result).not.toContain('Line 2');
  });
});
