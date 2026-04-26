/**
 * TodoDetector — TODO/FIXME/HACK/XXX detection in two flavors.
 *
 * **AST-aware** (`todoAstDetector`): Uses TypeScript's comment parsing to only
 * detect TODO markers inside actual code comments (// and /* * /), not in
 * string literals. Only works on TS/JS files, and requires the file to exist
 * on disk with accurate line numbers (i.e., git-based diffs).
 *
 * **Pattern-based** (`todoPatternDetector`): Regex on diff lines. Works on any
 * file type, any diff source (git or synthetic). May false-positive on TODOs
 * in string literals, but reliable as a fallback.
 *
 * Usage:
 * - For git-based analysis: use `todoAstDetectors` (AST for additions + pattern for removals)
 * - For synthetic diffs:    use `todoPatternDetectors` (pattern for both additions and removals)
 * - For maximum coverage:   use `todoDetectors` (all of the above, may duplicate)
 */

import { AstDetector } from './ast-detector';
import { PatternDetector } from './pattern-detector';
import type { AstRule } from './ast-detector';
import type { Detection } from '../types';

export type TodoTag = 'TODO' | 'FIXME' | 'HACK' | 'XXX';

export interface TodoPayload {
  tag: TodoTag;
  text: string;
  file: string;
  line: number;
  context: string;
}

const TODO_PATTERN = /\b(TODO|FIXME|HACK|XXX)\b[:\s]*(.*)/i;

// ─────────────────────────────────────────────────────────────────────────────
// AST detector (additions only, comment-aware, TS/JS only)
// ─────────────────────────────────────────────────────────────────────────────

const todoAddedAstRule: AstRule = {
  event: 'todo.added',

  visit(ts, sourceFile, addedLines, filePath) {
    const detections: Detection<TodoPayload>[] = [];
    const text = sourceFile.getFullText();
    const comments = getAllComments(ts, sourceFile, text);

    for (const comment of comments) {
      const commentText = text.slice(comment.pos, comment.end);
      const lineAndChar = sourceFile.getLineAndCharacterOfPosition(comment.pos);
      const lineNumber = lineAndChar.line + 1;

      if (!addedLines.has(lineNumber)) continue;

      const match = TODO_PATTERN.exec(commentText);
      if (!match) continue;

      const lineStarts = sourceFile.getLineStarts();
      const lineStart = lineStarts[lineAndChar.line]!;
      const lineEnd = lineAndChar.line + 1 < lineStarts.length
        ? lineStarts[lineAndChar.line + 1]! - 1
        : text.length;
      const contextLine = text.slice(lineStart, lineEnd).trim();

      detections.push({
        event: 'todo.added',
        payload: {
          tag: match[1]!.toUpperCase() as TodoTag,
          text: match[2]!.trim(),
          file: filePath,
          line: lineNumber,
          context: contextLine,
        },
        file: filePath,
        line: lineNumber,
      });
    }

    return detections;
  },
};

interface CommentRange {
  pos: number;
  end: number;
}

function getAllComments(
  ts: typeof import('typescript'),
  sourceFile: import('typescript').SourceFile,
  text: string,
): CommentRange[] {
  const comments: CommentRange[] = [];

  function visit(node: import('typescript').Node) {
    const leading = ts.getLeadingCommentRanges(text, node.getFullStart());
    if (leading) {
      for (const range of leading) {
        comments.push({ pos: range.pos, end: range.end });
      }
    }
    const trailing = ts.getTrailingCommentRanges(text, node.getEnd());
    if (trailing) {
      for (const range of trailing) {
        comments.push({ pos: range.pos, end: range.end });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  const seen = new Set<number>();
  return comments.filter((c) => {
    if (seen.has(c.pos)) return false;
    seen.add(c.pos);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern detectors (regex-based, any file type)
// ─────────────────────────────────────────────────────────────────────────────

/** Pattern detector for TODO additions (regex fallback). */
const todoAddedPattern = new PatternDetector('todo-pattern-added', [
  {
    event: 'todo.added',
    pattern: TODO_PATTERN,
    lineType: 'add',
    toPayload: (match, line, file): TodoPayload => ({
      tag: match[1]!.toUpperCase() as TodoTag,
      text: match[2]!.trim(),
      file,
      line: line.newLineNumber ?? 0,
      context: line.content,
    }),
  },
]);

/** Pattern detector for TODO removals (regex, only way to detect deleted code). */
const todoRemovedPattern = new PatternDetector('todo-pattern-removed', [
  {
    event: 'todo.removed',
    pattern: TODO_PATTERN,
    lineType: 'remove',
    toPayload: (match, line, file): TodoPayload => ({
      tag: match[1]!.toUpperCase() as TodoTag,
      text: match[2]!.trim(),
      file,
      line: line.oldLineNumber ?? 0,
      context: line.content,
    }),
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// Exported detector sets
// ─────────────────────────────────────────────────────────────────────────────

/** AST detector for additions (comment-aware, TS/JS only). */
export const todoAstDetector = new AstDetector('todo-ast', [todoAddedAstRule]);

/** Pattern detector for additions (regex fallback, any file). */
export const todoPatternAddedDetector = todoAddedPattern;

/** Pattern detector for removals (regex, any file). */
export const todoPatternRemovedDetector = todoRemovedPattern;

/**
 * For git-based analysis: AST for additions (accurate) + pattern for removals.
 * Use when file line numbers are trustworthy (real git diffs).
 */
export const todoAstDetectors = [todoAstDetector, todoPatternRemovedDetector] as const;

/**
 * For synthetic diff analysis: pattern-based for both additions and removals.
 * Use when file line numbers may not match disk (synthetic diffs from tool inputs).
 */
export const todoPatternDetectors = [todoPatternAddedDetector, todoPatternRemovedDetector] as const;

/**
 * All detectors combined. May produce duplicates if AST and pattern both
 * detect the same TODO — consumer should deduplicate if using this.
 */
export const todoDetectors = [todoAstDetector, todoPatternAddedDetector, todoPatternRemovedDetector] as const;
