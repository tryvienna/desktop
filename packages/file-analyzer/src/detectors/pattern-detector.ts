/**
 * PatternDetector — Regex-based detection on diff lines.
 *
 * Simple, fast, synchronous. Operates on the diff content (not the full file).
 * Good for detecting text patterns like TODO comments, console.log statements, etc.
 */

import type { Detector, Detection, FileDiff, DiffLine } from '../types';

export interface PatternRule<T = unknown> {
  /** Event name to emit (e.g., 'todo.added'). */
  event: string;
  /** Regex pattern to match against line content. */
  pattern: RegExp;
  /** Which diff line types to check. Default: 'add'. */
  lineType?: 'add' | 'remove' | 'any';
  /** Extract a typed payload from the regex match. */
  toPayload: (match: RegExpMatchArray, line: DiffLine, filePath: string) => T;
}

export class PatternDetector implements Detector {
  readonly name: string;
  readonly fileExtensions: readonly string[] | null;
  private readonly rules: readonly PatternRule[];

  constructor(
    name: string,
    rules: readonly PatternRule[],
    fileExtensions: readonly string[] | null = null,
  ) {
    this.name = name;
    this.fileExtensions = fileExtensions;
    this.rules = rules;
  }

  detect(fileDiff: FileDiff): Detection[] {
    const detections: Detection[] = [];

    for (const hunk of fileDiff.hunks) {
      for (const line of hunk.lines) {
        for (const rule of this.rules) {
          const lineType = rule.lineType ?? 'add';
          if (lineType !== 'any' && line.type !== lineType) continue;

          const match = rule.pattern.exec(line.content);
          if (!match) continue;

          detections.push({
            event: rule.event,
            payload: rule.toPayload(match, line, fileDiff.path),
            file: fileDiff.path,
            line: line.type === 'remove' ? line.oldLineNumber : line.newLineNumber,
          });
        }
      }
    }

    return detections;
  }
}
