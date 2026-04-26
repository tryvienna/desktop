import { describe, it, expect } from 'vitest';
import { parseUnifiedDiff, getAddedLineNumbers } from '../diff-parser';

const SIMPLE_DIFF = `@@ -1,3 +1,4 @@
 line one
+line two (new)
 line three
 line four`;

const MULTI_HUNK_DIFF = `@@ -1,3 +1,3 @@
 context
-old line
+new line
 context
@@ -10,2 +10,3 @@
 more context
+added at line 11
 end`;

const REMOVAL_ONLY = `@@ -5,3 +5,2 @@
 keep
-removed line
 keep`;

describe('parseUnifiedDiff', () => {
  it('parses a simple addition', () => {
    const hunks = parseUnifiedDiff(SIMPLE_DIFF);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]!.oldStart).toBe(1);
    expect(hunks[0]!.newStart).toBe(1);
    expect(hunks[0]!.lines).toHaveLength(4);

    const added = hunks[0]!.lines.find((l) => l.type === 'add');
    expect(added).toBeDefined();
    expect(added!.content).toBe('line two (new)');
    expect(added!.newLineNumber).toBe(2);
    expect(added!.oldLineNumber).toBeNull();
  });

  it('parses multiple hunks', () => {
    const hunks = parseUnifiedDiff(MULTI_HUNK_DIFF);
    expect(hunks).toHaveLength(2);
    expect(hunks[0]!.oldStart).toBe(1);
    expect(hunks[1]!.oldStart).toBe(10);
  });

  it('tracks line numbers correctly for removals', () => {
    const hunks = parseUnifiedDiff(REMOVAL_ONLY);
    const removed = hunks[0]!.lines.find((l) => l.type === 'remove');
    expect(removed).toBeDefined();
    expect(removed!.oldLineNumber).toBe(6);
    expect(removed!.newLineNumber).toBeNull();
  });

  it('tracks line numbers correctly for mixed changes', () => {
    const hunks = parseUnifiedDiff(MULTI_HUNK_DIFF);
    // First hunk: context(1), remove(2), add(2), context(3)
    const lines = hunks[0]!.lines;
    expect(lines[0]!.type).toBe('context');
    expect(lines[0]!.oldLineNumber).toBe(1);
    expect(lines[0]!.newLineNumber).toBe(1);

    expect(lines[1]!.type).toBe('remove');
    expect(lines[1]!.oldLineNumber).toBe(2);

    expect(lines[2]!.type).toBe('add');
    expect(lines[2]!.newLineNumber).toBe(2);
  });

  it('returns empty for empty input', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
  });

  it('returns empty for non-diff text', () => {
    expect(parseUnifiedDiff('just some random text\nno hunks here')).toEqual([]);
  });

  it('handles "No newline at end of file" markers', () => {
    const diff = `@@ -1,2 +1,2 @@
-old
+new
\\ No newline at end of file`;
    const hunks = parseUnifiedDiff(diff);
    expect(hunks).toHaveLength(1);
    // The "\" line should be skipped
    expect(hunks[0]!.lines).toHaveLength(2);
  });

  it('handles hunk with count=1 (omitted in header)', () => {
    const diff = `@@ -5 +5 @@
-single old
+single new`;
    const hunks = parseUnifiedDiff(diff);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]!.oldCount).toBe(1);
    expect(hunks[0]!.newCount).toBe(1);
  });
});

describe('getAddedLineNumbers', () => {
  it('extracts added line numbers from hunks', () => {
    const hunks = parseUnifiedDiff(MULTI_HUNK_DIFF);
    const added = getAddedLineNumbers(hunks);
    expect(added.has(2)).toBe(true); // "new line" in first hunk
    expect(added.has(11)).toBe(true); // "added at line 11" in second hunk
    expect(added.size).toBe(2);
  });

  it('returns empty set for removal-only diffs', () => {
    const hunks = parseUnifiedDiff(REMOVAL_ONLY);
    const added = getAddedLineNumbers(hunks);
    expect(added.size).toBe(0);
  });
});
