/**
 * analyze() — High-level entry points for running detectors against file changes.
 *
 * Two strategies (documented, used in sequence):
 *
 * 1. **Git-based** (primary): `analyze()` runs `git diff` for each file to get
 *    a real unified diff, parses it, and runs detectors. Most accurate — shows
 *    exactly which lines were added/removed relative to HEAD.
 *
 * 2. **Synthetic diff** (fallback): `analyzeFileDiffs()` accepts pre-built
 *    FileDiff objects. Used when files aren't in a git repo — the caller
 *    constructs a synthetic diff from tool inputs (e.g., Edit's old_string/new_string).
 *
 * For even lower-level control, use parseUnifiedDiff() and detectors directly.
 */

import { execFile } from 'node:child_process';
import { extname } from 'node:path';
import { parseUnifiedDiff } from './diff-parser';
import type { AnalyzeOptions, Detection, FileDiff, Detector } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Git-based analysis (primary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run detectors against a set of changed files using `git diff`.
 * Gets diffs from git, parses them, and runs all matching detectors.
 */
export async function analyze(options: AnalyzeOptions): Promise<Detection[]> {
  const { repoRoot, files, detectors, onError } = options;
  const allDetections: Detection[] = [];

  for (const file of files) {
    let rawDiff: string;
    try {
      rawDiff = await getFileDiff(repoRoot, file);
    } catch {
      continue;
    }

    if (!rawDiff.trim()) continue;

    const hunks = parseUnifiedDiff(rawDiff);
    if (hunks.length === 0) continue;

    const fileDiff: FileDiff = { path: file, hunks, rawDiff };
    const detections = await runDetectors(fileDiff, repoRoot, detectors, onError);
    allDetections.push(...detections);
  }

  return allDetections;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built FileDiff analysis (fallback for non-git files)
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzeFileDiffsOptions {
  /** Pre-built file diffs (e.g., synthesized from tool inputs). */
  fileDiffs: readonly FileDiff[];
  /** Directory containing the files (for AST detectors to read from disk). */
  baseDir: string;
  /** Detectors to run. */
  detectors: readonly Detector[];
  /** Called when a detector throws. */
  onError?: (detector: string, file: string, error: unknown) => void;
}

/**
 * Run detectors against pre-built FileDiff objects.
 * Used when files aren't in a git repo — the caller synthesizes diffs
 * from tool inputs (e.g., Edit's old_string/new_string).
 */
export async function analyzeFileDiffs(options: AnalyzeFileDiffsOptions): Promise<Detection[]> {
  const { fileDiffs, baseDir, detectors, onError } = options;
  const allDetections: Detection[] = [];

  for (const fileDiff of fileDiffs) {
    const detections = await runDetectors(fileDiff, baseDir, detectors, onError);
    allDetections.push(...detections);
  }

  return allDetections;
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic diff construction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a synthetic FileDiff from an Edit tool's old_string/new_string.
 * Produces a unified-diff-like structure where old_string lines are removals
 * and new_string lines are additions.
 */
export function synthesizeEditDiff(
  filePath: string,
  oldString: string,
  newString: string,
): FileDiff {
  const oldLines = oldString.split('\n');
  const newLines = newString.split('\n');

  // Build a synthetic unified diff
  const diffLines: string[] = [];
  diffLines.push(`@@ -1,${oldLines.length} +1,${newLines.length} @@`);
  for (const line of oldLines) {
    diffLines.push(`-${line}`);
  }
  for (const line of newLines) {
    diffLines.push(`+${line}`);
  }

  const rawDiff = diffLines.join('\n');
  const hunks = parseUnifiedDiff(rawDiff);

  return { path: filePath, hunks, rawDiff };
}

/**
 * Build a synthetic FileDiff from a Write tool's content.
 * Treats the entire file as newly added (all lines are additions).
 */
export function synthesizeWriteDiff(filePath: string, content: string): FileDiff {
  const lines = content.split('\n');
  const diffLines: string[] = [];
  diffLines.push(`@@ -0,0 +1,${lines.length} @@`);
  for (const line of lines) {
    diffLines.push(`+${line}`);
  }

  const rawDiff = diffLines.join('\n');
  const hunks = parseUnifiedDiff(rawDiff);

  return { path: filePath, hunks, rawDiff };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared detector runner
// ─────────────────────────────────────────────────────────────────────────────

async function runDetectors(
  fileDiff: FileDiff,
  baseDir: string,
  detectors: readonly Detector[],
  onError?: (detector: string, file: string, error: unknown) => void,
): Promise<Detection[]> {
  const ext = extname(fileDiff.path);
  const results: Detection[] = [];

  for (const detector of detectors) {
    if (detector.fileExtensions !== null && !detector.fileExtensions.includes(ext)) {
      continue;
    }

    try {
      const detections = await detector.detect(fileDiff, baseDir);
      results.push(...detections);
    } catch (err) {
      onError?.(detector.name, fileDiff.path, err);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Git helpers
// ─────────────────────────────────────────────────────────────────────────────

function getFileDiff(repoRoot: string, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      ['diff', '--unified=3', '--no-color', '--', filePath],
      { cwd: repoRoot, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stdout);
      },
    );
  });
}
