/**
 * parseUnifiedDiff — Parse a unified diff string into structured hunks.
 *
 * Handles the standard `git diff` unified format:
 * ```
 * @@ -oldStart,oldCount +newStart,newCount @@ optional header
 *  context line
 * +added line
 * -removed line
 * ```
 *
 * Pure function, no I/O. Skips malformed hunk headers gracefully.
 */

import type { DiffHunk, DiffLine } from './types';

const HUNK_HEADER_REGEX = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

export function parseUnifiedDiff(diffText: string): DiffHunk[] {
  const lines = diffText.split('\n');
  const hunks: DiffHunk[] = [];
  let currentHunk: {
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
    header: string;
    lines: DiffLine[];
  } | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const raw of lines) {
    const hunkMatch = HUNK_HEADER_REGEX.exec(raw);
    if (hunkMatch) {
      // Finalize previous hunk
      if (currentHunk) {
        hunks.push({
          oldStart: currentHunk.oldStart,
          oldCount: currentHunk.oldCount,
          newStart: currentHunk.newStart,
          newCount: currentHunk.newCount,
          header: currentHunk.header,
          lines: currentHunk.lines,
        });
      }

      const oldStart = parseInt(hunkMatch[1]!, 10);
      const oldCount = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1;
      const newStart = parseInt(hunkMatch[3]!, 10);
      const newCount = hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1;

      currentHunk = {
        oldStart,
        oldCount,
        newStart,
        newCount,
        header: hunkMatch[5]?.trim() ?? '',
        lines: [],
      };
      oldLine = oldStart;
      newLine = newStart;
      continue;
    }

    if (!currentHunk) continue;

    if (raw.startsWith('+')) {
      currentHunk.lines.push({
        type: 'add',
        content: raw.slice(1),
        newLineNumber: newLine,
        oldLineNumber: null,
      });
      newLine++;
    } else if (raw.startsWith('-')) {
      currentHunk.lines.push({
        type: 'remove',
        content: raw.slice(1),
        newLineNumber: null,
        oldLineNumber: oldLine,
      });
      oldLine++;
    } else if (raw.startsWith(' ')) {
      currentHunk.lines.push({
        type: 'context',
        content: raw.slice(1),
        newLineNumber: newLine,
        oldLineNumber: oldLine,
      });
      oldLine++;
      newLine++;
    }
    // Lines that don't start with +/-/space (e.g., "\ No newline at end of file") are skipped
  }

  // Finalize last hunk
  if (currentHunk) {
    hunks.push({
      oldStart: currentHunk.oldStart,
      oldCount: currentHunk.oldCount,
      newStart: currentHunk.newStart,
      newCount: currentHunk.newCount,
      header: currentHunk.header,
      lines: currentHunk.lines,
    });
  }

  return hunks;
}

/**
 * Extract the set of added line numbers from a list of hunks.
 * Useful for AST detectors that only care about new code.
 */
export function getAddedLineNumbers(hunks: readonly DiffHunk[]): Set<number> {
  const added = new Set<number>();
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add' && line.newLineNumber !== null) {
        added.add(line.newLineNumber);
      }
    }
  }
  return added;
}
