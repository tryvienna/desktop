/**
 * @vienna/file-analyzer
 *
 * Diff parsing, AST traversal, and detection framework for file changes.
 * Used by the Claude file change listener to detect patterns in code
 * that Claude modifies.
 */

// High-level API
export { analyze, analyzeFileDiffs, synthesizeEditDiff, synthesizeWriteDiff } from './analyze';
export type { AnalyzeFileDiffsOptions } from './analyze';

// Diff parser (pure function)
export { parseUnifiedDiff, getAddedLineNumbers } from './diff-parser';

// Types
export type {
  DiffLine,
  DiffHunk,
  FileDiff,
  Detection,
  Detector,
  AnalyzeOptions,
} from './types';

// Detector framework
export { PatternDetector } from './detectors/pattern-detector';
export type { PatternRule } from './detectors/pattern-detector';
export { AstDetector } from './detectors/ast-detector';
export type { AstRule, TypeScriptModule } from './detectors/ast-detector';

// Built-in detectors
export {
  todoAstDetector,
  todoPatternAddedDetector,
  todoPatternRemovedDetector,
  todoAstDetectors,
  todoPatternDetectors,
  todoDetectors,
} from './detectors/todo-detector';
export type { TodoPayload, TodoTag } from './detectors/todo-detector';
