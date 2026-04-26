/**
 * Core types for the file analyzer.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Diff types (output of diff parser)
// ─────────────────────────────────────────────────────────────────────────────

export interface DiffLine {
  /** Whether this line was added, removed, or is context. */
  readonly type: 'add' | 'remove' | 'context';
  /** Line content (without leading +/-/space). */
  readonly content: string;
  /** Line number in the new file (null for removed lines). */
  readonly newLineNumber: number | null;
  /** Line number in the old file (null for added lines). */
  readonly oldLineNumber: number | null;
}

export interface DiffHunk {
  readonly oldStart: number;
  readonly oldCount: number;
  readonly newStart: number;
  readonly newCount: number;
  readonly header: string;
  readonly lines: readonly DiffLine[];
}

export interface FileDiff {
  /** File path (relative to repo root). */
  readonly path: string;
  /** Structured diff hunks. */
  readonly hunks: readonly DiffHunk[];
  /** Raw unified diff text. */
  readonly rawDiff: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detection types (output of detectors)
// ─────────────────────────────────────────────────────────────────────────────

export interface Detection<T = unknown> {
  /** Event name (e.g., 'todo.added'). */
  readonly event: string;
  /** Detector-specific payload. */
  readonly payload: T;
  /** File path (relative to repo root). */
  readonly file: string;
  /** Line number in the new file (for navigation). Null if not line-specific. */
  readonly line: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detector interface
// ─────────────────────────────────────────────────────────────────────────────

export interface Detector {
  /** Human-readable name for logging. */
  readonly name: string;
  /** File extensions this detector applies to. Null = all files. */
  readonly fileExtensions: readonly string[] | null;
  /** Analyze a file diff and return detections. */
  detect(fileDiff: FileDiff, repoRoot: string): Detection[] | Promise<Detection[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analyzer options
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzeOptions {
  /** Absolute path to the git repo root. */
  repoRoot: string;
  /** File paths (relative to repoRoot) to analyze. */
  files: readonly string[];
  /** Detectors to run. */
  detectors: readonly Detector[];
  /** Called when a detector throws. Default: silently skip. */
  onError?: (detector: string, file: string, error: unknown) => void;
}
