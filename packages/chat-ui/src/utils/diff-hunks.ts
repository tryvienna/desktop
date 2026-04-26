/**
 * Diff Hunk Utilities
 *
 * Splits flat DiffLine[] into semantic hunks with context, and computes
 * word-level inline diffs for paired removed/added lines.
 *
 * @ai-context
 * - splitIntoHunks: groups changes with N context lines, merges overlapping
 * - computeWordDiff: O(n) prefix/suffix matching for inline emphasis
 * - pairChangedLines: greedily pairs consecutive removed→added lines
 *
 * @module chat-ui/utils/diff-hunks
 */

import type { DiffLine } from './diff';

/** A contiguous group of diff lines with surrounding context */
export interface DiffHunk {
  /** Starting old line number */
  oldStart: number;
  /** Number of old lines in this hunk */
  oldCount: number;
  /** Starting new line number */
  newStart: number;
  /** Number of new lines in this hunk */
  newCount: number;
  /** Lines in this hunk (context + changes) */
  lines: DiffLine[];
}

/** A segment within a line — changed or unchanged text */
export interface InlineSegment {
  text: string;
  changed: boolean;
}

/** Word-level diff result for a removed/added line pair */
export interface WordDiffPair {
  removed: InlineSegment[];
  added: InlineSegment[];
}

/**
 * Split DiffLine[] into hunks with context lines around each change.
 * Merges hunks whose context regions overlap or are adjacent.
 */
export function splitIntoHunks(lines: DiffLine[], contextLines = 3): DiffHunk[] {
  if (lines.length === 0) return [];

  // Find indices of all changed lines
  const changeIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.type !== 'context') changeIndices.push(i);
  }

  if (changeIndices.length === 0) return [];

  // Build raw ranges (start, end) for each contiguous run of changes + context
  const ranges: Array<[number, number]> = [];
  let rangeStart = Math.max(0, changeIndices[0]! - contextLines);
  let rangeEnd = Math.min(lines.length - 1, changeIndices[0]! + contextLines);

  for (let i = 1; i < changeIndices.length; i++) {
    const changeStart = changeIndices[i]! - contextLines;
    const changeEnd = changeIndices[i]! + contextLines;

    if (changeStart <= rangeEnd + 1) {
      // Overlapping or adjacent — merge
      rangeEnd = Math.min(lines.length - 1, Math.max(rangeEnd, changeEnd));
    } else {
      // Gap — finalize previous range
      ranges.push([rangeStart, rangeEnd]);
      rangeStart = Math.max(0, changeStart);
      rangeEnd = Math.min(lines.length - 1, changeEnd);
    }
  }
  ranges.push([rangeStart, rangeEnd]);

  // Convert ranges to DiffHunk objects
  return ranges.map(([start, end]) => {
    const hunkLines = lines.slice(start, end + 1);
    let oldStart = 1;
    let newStart = 1;

    // Find the first line with a known line number
    for (const line of hunkLines) {
      if (line.oldLineNumber != null) {
        oldStart = line.oldLineNumber;
        break;
      }
      if (line.newLineNumber != null) {
        newStart = line.newLineNumber;
        break;
      }
    }
    // Also find newStart from first line that has it
    for (const line of hunkLines) {
      if (line.newLineNumber != null) {
        newStart = line.newLineNumber;
        break;
      }
    }

    const oldCount = hunkLines.filter((l) => l.type !== 'added').length;
    const newCount = hunkLines.filter((l) => l.type !== 'removed').length;

    return { oldStart, oldCount, newStart, newCount, lines: hunkLines };
  });
}

/**
 * Compute word-level diff between two lines using prefix/suffix matching.
 * O(n) where n = min(removed.length, added.length).
 */
export function computeWordDiff(removed: string, added: string): WordDiffPair {
  // Find common prefix
  let prefixLen = 0;
  const minLen = Math.min(removed.length, added.length);
  while (prefixLen < minLen && removed[prefixLen] === added[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix (not overlapping with prefix)
  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    removed[removed.length - 1 - suffixLen] === added[added.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const prefix = removed.slice(0, prefixLen);
  const removedMiddle = removed.slice(prefixLen, removed.length - suffixLen);
  const addedMiddle = added.slice(prefixLen, added.length - suffixLen);
  const suffix = removed.slice(removed.length - suffixLen);

  function buildSegments(middle: string): InlineSegment[] {
    const segments: InlineSegment[] = [];
    if (prefix) segments.push({ text: prefix, changed: false });
    if (middle) segments.push({ text: middle, changed: true });
    if (suffix) segments.push({ text: suffix, changed: false });
    // If nothing, return the whole line as unchanged
    if (segments.length === 0) segments.push({ text: '', changed: false });
    return segments;
  }

  return {
    removed: buildSegments(removedMiddle),
    added: buildSegments(addedMiddle),
  };
}

/**
 * Pair consecutive removed→added lines within a hunk for word-level diffing.
 * Returns a map from line index to its WordDiffPair.
 * Unpaired lines (e.g., 3 removed followed by 1 added) only pair 1:1.
 */
export function pairChangedLines(
  hunkLines: DiffLine[]
): Map<number, { pairIndex: number; segments: InlineSegment[] }> {
  const result = new Map<number, { pairIndex: number; segments: InlineSegment[] }>();

  let i = 0;
  while (i < hunkLines.length) {
    // Find a run of removed lines
    const removedStart = i;
    while (i < hunkLines.length && hunkLines[i]!.type === 'removed') i++;
    const removedEnd = i;

    // Find the immediately following run of added lines
    const addedStart = i;
    while (i < hunkLines.length && hunkLines[i]!.type === 'added') i++;
    const addedEnd = i;

    const removedCount = removedEnd - removedStart;
    const addedCount = addedEnd - addedStart;

    // Pair 1:1 up to the shorter count
    const pairCount = Math.min(removedCount, addedCount);
    for (let p = 0; p < pairCount; p++) {
      const ri = removedStart + p;
      const ai = addedStart + p;
      const diff = computeWordDiff(hunkLines[ri]!.content, hunkLines[ai]!.content);
      result.set(ri, { pairIndex: ai, segments: diff.removed });
      result.set(ai, { pairIndex: ri, segments: diff.added });
    }

    // Skip context lines
    if (removedCount === 0 && addedCount === 0) i++;
  }

  return result;
}
