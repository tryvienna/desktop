import { describe, it, expect } from 'vitest';
import { computeLineDiff } from '../diff';

describe('computeLineDiff', () => {
  it('handles identical content', () => {
    const content = 'line1\nline2\nline3';
    const result = computeLineDiff(content, content);
    expect(result.every((l) => l.type === 'context')).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('handles empty old content (all additions)', () => {
    const result = computeLineDiff('', 'a\nb');
    expect(result.filter((l) => l.type === 'added')).toHaveLength(2);
  });

  it('handles empty new content (all removals)', () => {
    const result = computeLineDiff('a\nb', '');
    expect(result.filter((l) => l.type === 'removed')).toHaveLength(2);
  });

  it('detects a single insertion in small file', () => {
    const old = 'a\nb\nc';
    const new_ = 'a\nb\nINSERTED\nc';
    const result = computeLineDiff(old, new_);
    const added = result.filter((l) => l.type === 'added');
    const removed = result.filter((l) => l.type === 'removed');
    const context = result.filter((l) => l.type === 'context');
    expect(added).toHaveLength(1);
    expect(added[0]!.content).toBe('INSERTED');
    expect(removed).toHaveLength(0);
    expect(context).toHaveLength(3);
  });

  it('detects a single deletion in small file', () => {
    const old = 'a\nb\nc';
    const new_ = 'a\nc';
    const result = computeLineDiff(old, new_);
    const removed = result.filter((l) => l.type === 'removed');
    expect(removed).toHaveLength(1);
    expect(removed[0]!.content).toBe('b');
  });

  it('assigns correct line numbers', () => {
    const old = 'a\nb\nc';
    const new_ = 'a\nX\nc';
    const result = computeLineDiff(old, new_);
    // Should have: context(a), removed(b), added(X), context(c)
    expect(result).toHaveLength(4);
    expect(result[0]).toMatchObject({ type: 'context', content: 'a', oldLineNumber: 1, newLineNumber: 1 });
    expect(result[1]).toMatchObject({ type: 'removed', content: 'b', oldLineNumber: 2 });
    expect(result[2]).toMatchObject({ type: 'added', content: 'X', newLineNumber: 2 });
    expect(result[3]).toMatchObject({ type: 'context', content: 'c', oldLineNumber: 3, newLineNumber: 3 });
  });

  it('handles large files with small changes efficiently', () => {
    // Simulate a 1500-line file with a few insertions — the old LCS algorithm
    // would fall back to all-removed + all-added for this size
    const lines = Array.from({ length: 1500 }, (_, i) => `line ${i}`);
    const oldContent = lines.join('\n');
    const newLines = [...lines];
    newLines.splice(750, 0, 'INSERTED_1', 'INSERTED_2');
    newLines[100] = 'MODIFIED_LINE';
    const newContent = newLines.join('\n');

    const result = computeLineDiff(oldContent, newContent);

    const added = result.filter((l) => l.type === 'added');
    const removed = result.filter((l) => l.type === 'removed');
    const context = result.filter((l) => l.type === 'context');

    // Should detect the actual changes, NOT show entire file as changed
    expect(added.length).toBeLessThan(10);
    expect(removed.length).toBeLessThan(10);
    expect(context.length).toBeGreaterThan(1490);
  });
});
