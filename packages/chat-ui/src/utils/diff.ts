/**
 * Diff Utilities
 *
 * Line-based diff using Myers diff algorithm.
 * Used by EditTool, ChangeItem, and DiffView for visualizing file changes.
 *
 * @ai-context
 * - Myers algorithm: O((m+n)*d) where d = edit distance — fast for small changes in large files
 * - Returns DiffLine[] with line numbers for old and new content
 *
 * @module chat-ui/utils/diff
 */

export interface DiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  /** Line number in old file (undefined for 'added' lines) */
  oldLineNumber?: number;
  /** Line number in new file (undefined for 'removed' lines) */
  newLineNumber?: number;
}

/**
 * Compute line-based diff using Myers algorithm.
 * Efficient for large files with small changes — O((m+n)*d) time.
 */
export function computeLineDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const result = myersDiff(oldLines, newLines);

  // Assign line numbers in a forward pass
  let oldLine = 1;
  let newLine = 1;
  for (const line of result) {
    if (line.type === 'context') {
      line.oldLineNumber = oldLine++;
      line.newLineNumber = newLine++;
    } else if (line.type === 'removed') {
      line.oldLineNumber = oldLine++;
    } else {
      line.newLineNumber = newLine++;
    }
  }

  return result;
}

/**
 * Maximum edit distance before falling back to simple diff.
 * Prevents excessive memory usage when diffing completely unrelated files.
 * At MAX_EDIT_DEPTH d, trace storage is ~d arrays × 2*(n+m) entries × 4 bytes.
 * 1500 keeps memory under ~50 MB for typical file sizes.
 */
const MAX_EDIT_DEPTH = 1500;

/**
 * Myers diff algorithm — finds shortest edit script.
 *
 * Based on "An O(ND) Difference Algorithm" by Eugene W. Myers.
 * Stores a trace of V arrays for backtracking (O(d²) space).
 * Falls back to all-removed + all-added when edit distance exceeds MAX_EDIT_DEPTH.
 */
function myersDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const n = oldLines.length;
  const m = newLines.length;
  const max = n + m;

  // Fast path: one side is empty
  if (n === 0) {
    return newLines.map((content): DiffLine => ({ type: 'added', content }));
  }
  if (m === 0) {
    return oldLines.map((content): DiffLine => ({ type: 'removed', content }));
  }

  const depthLimit = Math.min(max, MAX_EDIT_DEPTH);

  // V array indexed from -max to +max; we use offset to map to 0-based
  const offset = max;
  const size = 2 * max + 1;

  // Store the trace of V arrays for backtracking
  const trace: Int32Array[] = [];

  const v = new Int32Array(size);
  v[offset + 1] = 0;

  let found = false;
  outer:
  for (let d = 0; d <= depthLimit; d++) {
    // Save a copy of V for backtracking
    trace.push(v.slice());

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!)) {
        x = v[offset + k + 1]!; // move down (insertion)
      } else {
        x = v[offset + k - 1]! + 1; // move right (deletion)
      }
      let y = x - k;

      // Follow diagonal (matching lines)
      while (x < n && y < m && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }

      v[offset + k] = x;

      if (x >= n && y >= m) {
        found = true;
        break outer;
      }
    }
  }

  // If edit distance exceeded the limit, fall back to all-removed + all-added
  if (!found) {
    return [
      ...oldLines.map((content): DiffLine => ({ type: 'removed', content })),
      ...newLines.map((content): DiffLine => ({ type: 'added', content })),
    ];
  }

  // Backtrack through trace to build the edit script
  const edits: DiffLine[] = [];
  let x = n;
  let y = m;

  for (let d = trace.length - 1; d >= 0; d--) {
    const vPrev = trace[d]!;
    const k = x - y;

    let prevK: number;
    if (k === -d || (k !== d && vPrev[offset + k - 1]! < vPrev[offset + k + 1]!)) {
      prevK = k + 1; // came from above (insertion)
    } else {
      prevK = k - 1; // came from the left (deletion)
    }

    const prevX = vPrev[offset + prevK]!;
    const prevY = prevX - prevK;

    // Diagonal moves (context lines) — walk backwards
    while (x > prevX && y > prevY) {
      x--;
      y--;
      edits.push({ type: 'context', content: oldLines[x]! });
    }

    if (d > 0) {
      if (x === prevX) {
        // Insertion
        y--;
        edits.push({ type: 'added', content: newLines[y]! });
      } else {
        // Deletion
        x--;
        edits.push({ type: 'removed', content: oldLines[x]! });
      }
    }
  }

  edits.reverse();
  return edits;
}
