/**
 * AstDetector — TypeScript AST-based detection on changed files.
 *
 * Two-phase execution:
 * 1. preResolve (optional, async) — cross-file prep work (import resolution, etc.)
 * 2. visit (sync) — walk the AST, emit detections for nodes on added lines
 *
 * Reads the current file from disk (not from the diff) to get a valid AST.
 * Only reports detections on lines that were actually added in the diff.
 * Lazily loads TypeScript — silently returns empty if TS is not available.
 */

import { readFile } from 'node:fs/promises';
import { join, extname, isAbsolute } from 'node:path';
import type { Detector, Detection, FileDiff } from '../types';
import { getAddedLineNumbers } from '../diff-parser';

/**
 * TypeScript module type — we import TS dynamically so consumers
 * without TypeScript installed get graceful degradation.
 */
export type TypeScriptModule = typeof import('typescript');

export interface AstRule<TContext = Record<string, unknown>> {
  /** Event name prefix (individual detections set the full event name). */
  event: string;

  /**
   * Optional async preparation phase. Run before visit().
   * Use for cross-file import resolution, building context maps, etc.
   * Return value is passed to visit() as `preResolved`.
   */
  preResolve?: (
    ts: TypeScriptModule,
    sourceFile: import('typescript').SourceFile,
    filePath: string,
    repoRoot: string,
    readFileFn: (absolutePath: string) => Promise<string>,
  ) => Promise<TContext>;

  /**
   * Synchronous AST visitor. Walk the AST and return detections.
   * Only emit detections for nodes on lines in `addedLines`.
   */
  visit: (
    ts: TypeScriptModule,
    sourceFile: import('typescript').SourceFile,
    addedLines: ReadonlySet<number>,
    filePath: string,
    preResolved: TContext | undefined,
  ) => Detection[];
}

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs']);

export class AstDetector implements Detector {
  readonly name: string;
  readonly fileExtensions: readonly string[];
  private readonly rules: readonly AstRule[];

  constructor(name: string, rules: readonly AstRule[]) {
    this.name = name;
    this.fileExtensions = [...TS_EXTENSIONS];
    this.rules = rules;
  }

  async detect(fileDiff: FileDiff, repoRoot: string): Promise<Detection[]> {
    const ext = extname(fileDiff.path);
    if (!TS_EXTENSIONS.has(ext)) return [];

    // Lazy-load TypeScript
    let ts: TypeScriptModule;
    try {
      ts = await import('typescript');
    } catch {
      return [];
    }

    // Collect added line numbers from the diff
    const addedLines = getAddedLineNumbers(fileDiff.hunks);
    if (addedLines.size === 0) return [];

    // Read the current file from disk (not the diff) for a valid AST
    const absolutePath = isAbsolute(fileDiff.path)
      ? fileDiff.path
      : join(repoRoot, fileDiff.path);
    let fileContent: string;
    try {
      fileContent = await readFile(absolutePath, 'utf-8');
    } catch {
      return [];
    }

    // Parse AST
    const sourceFile = ts.createSourceFile(
      fileDiff.path,
      fileContent,
      ts.ScriptTarget.Latest,
      true, // setParentNodes
    );

    const readFileFn = (p: string) => readFile(p, 'utf-8');

    // Run all rules
    const allDetections: Detection[] = [];
    for (const rule of this.rules) {
      try {
        const preResolved = rule.preResolve
          ? await rule.preResolve(ts, sourceFile, fileDiff.path, repoRoot, readFileFn)
          : undefined;

        const detections = rule.visit(ts, sourceFile, addedLines, fileDiff.path, preResolved);
        allDetections.push(...detections);
      } catch {
        // Individual rule failures don't crash the detector
      }
    }

    return allDetections;
  }
}
