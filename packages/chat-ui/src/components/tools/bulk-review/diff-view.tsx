/**
 * DiffView — Structured diff renderer with syntax highlighting,
 * line numbers, hunk splitting, and word-level emphasis.
 *
 * @ai-context
 * - Used by ChangeItem for Edit diffs
 * - Supports unified (stacked) and split (side-by-side) modes via DiffModeContext
 * - Pipelines: raw diff → hunks → hljs highlighting → word-level pairing → render
 * - Collapsible "...N hidden lines..." separators between hunks
 * - Line numbers in old/new gutters, +/- indicator column
 * - Toggle icon in top-right corner to switch modes
 * - data-slot="diff-view"
 *
 * @example
 * <DiffView oldContent={old} newContent={new} filePath="src/index.ts" />
 */

import * as React from 'react';
import { memo, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@tryvienna/ui';

import { computeLineDiff } from '../../../utils/diff';
import type { DiffLine } from '../../../utils/diff';
import { splitIntoHunks, pairChangedLines } from '../../../utils/diff-hunks';
import type { InlineSegment } from '../../../utils/diff-hunks';
import { highlightLines } from '../../../utils/highlight';
import { SPRINGS } from '../../../tokens';
import { useDiffMode } from './diff-mode-context';

interface DiffViewProps {
  oldContent: string;
  newContent: string;
  filePath: string;
  isStreaming?: boolean;
  /** Maximum height before scrolling. Default: 400 */
  maxHeight?: number;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HunkSeparator({
  linesHidden,
  expanded,
  onToggle,
}: {
  linesHidden: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full px-3 py-0.5 text-[9px] text-muted-foreground/50 font-mono',
        'bg-surface-sunken/30 hover:bg-surface-hover/30 cursor-pointer',
        'border-y border-border-muted/30 text-center transition-colors'
      )}
    >
      {expanded ? 'Hide context' : `\u22EF ${linesHidden} unchanged lines \u22EF`}
    </button>
  );
}

function DiffLineRow({
  line,
  wordSegments,
  highlightedHtml,
  isLastAdded,
  isStreaming,
}: {
  line: DiffLine;
  wordSegments?: InlineSegment[];
  highlightedHtml?: string;
  isLastAdded: boolean;
  isStreaming: boolean;
}) {
  const indicator = line.type === 'added' ? '+' : line.type === 'removed' ? '\u2212' : ' ';

  return (
    <div
      className={cn(
        'flex font-mono text-xs leading-relaxed',
        line.type === 'added' && 'bg-surface-success/50 text-success',
        line.type === 'removed' && 'bg-surface-error/30 text-error/70',
        line.type === 'context' && 'text-muted-foreground/80'
      )}
    >
      {/* Old line number gutter */}
      <span className="diff-gutter w-8 text-right pr-2 select-none text-muted-foreground/30 text-[9px] shrink-0 leading-relaxed">
        {line.oldLineNumber ?? ''}
      </span>
      {/* New line number gutter */}
      <span className="diff-gutter w-8 text-right pr-2 select-none text-muted-foreground/30 text-[9px] shrink-0 leading-relaxed">
        {line.newLineNumber ?? ''}
      </span>
      {/* +/- indicator */}
      <span className="w-4 shrink-0 select-none opacity-40 text-[9px] leading-relaxed text-center">
        {indicator}
      </span>
      {/* Content */}
      <span className="flex-1 min-w-0 whitespace-pre pr-2">
        {renderLineContent(line, wordSegments, highlightedHtml)}
        {isStreaming && isLastAdded && <StreamingCursor />}
      </span>
    </div>
  );
}

function StreamingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-[1.1em] bg-ai align-middle ml-0.5"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
    />
  );
}

function renderLineContent(
  line: DiffLine,
  wordSegments?: InlineSegment[],
  highlightedHtml?: string
): React.ReactNode {
  // Word-level segments take priority (they include the full line content)
  if (wordSegments && wordSegments.length > 0) {
    return wordSegments.map((seg, i) => (
      <span key={i} className={cn(seg.changed && 'diff-word-changed')}>
        {seg.text}
      </span>
    ));
  }

  // Syntax-highlighted HTML (no word diff)
  if (highlightedHtml) {
    return <span className="hljs" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />;
  }

  // Plain text fallback
  return <>{line.content || ' '}</>;
}

// ─── Mode toggle icon ────────────────────────────────────────────────────────

function UnifiedIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <line x1="2" y1="6" x2="14" y2="6" />
      <line x1="2" y1="10" x2="14" y2="10" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <line x1="8" y1="2" x2="8" y2="14" />
    </svg>
  );
}

export function DiffModeToggle({ className }: { className?: string }) {
  const { mode, toggle } = useDiffMode();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      title={mode === 'unified' ? 'Switch to side-by-side' : 'Switch to unified'}
      className={cn(
        'p-1 rounded text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-surface-hover/50 cursor-pointer transition-colors duration-100',
        className,
      )}
    >
      {mode === 'unified' ? <SplitIcon /> : <UnifiedIcon />}
    </button>
  );
}

// ─── Split (side-by-side) row ────────────────────────────────────────────────

interface SplitRow {
  left: { line: DiffLine; segments?: InlineSegment[]; highlightedHtml?: string } | null;
  right: { line: DiffLine; segments?: InlineSegment[]; highlightedHtml?: string } | null;
}

function buildSplitRows(
  hunkLines: DiffLine[],
  wordDiffs: Map<number, { pairIndex: number; segments: InlineSegment[] }>,
  getHighlightedLine: (line: DiffLine) => string | undefined,
): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;

  while (i < hunkLines.length) {
    const line = hunkLines[i]!;

    if (line.type === 'context') {
      rows.push({
        left: { line, highlightedHtml: getHighlightedLine(line) },
        right: { line, highlightedHtml: getHighlightedLine(line) },
      });
      i++;
    } else if (line.type === 'removed') {
      // Collect consecutive removed lines
      const removedStart = i;
      while (i < hunkLines.length && hunkLines[i]!.type === 'removed') i++;
      // Collect consecutive added lines
      const addedStart = i;
      while (i < hunkLines.length && hunkLines[i]!.type === 'added') i++;

      const removedCount = addedStart - removedStart;
      const addedCount = i - addedStart;
      const maxCount = Math.max(removedCount, addedCount);

      for (let j = 0; j < maxCount; j++) {
        const removedIdx = removedStart + j;
        const addedIdx = addedStart + j;
        const removedLine = j < removedCount ? hunkLines[removedIdx]! : null;
        const addedLine = j < addedCount ? hunkLines[addedIdx]! : null;

        rows.push({
          left: removedLine
            ? {
                line: removedLine,
                segments: wordDiffs.get(removedIdx)?.segments,
                highlightedHtml: !wordDiffs.has(removedIdx) ? getHighlightedLine(removedLine) : undefined,
              }
            : null,
          right: addedLine
            ? {
                line: addedLine,
                segments: wordDiffs.get(addedIdx)?.segments,
                highlightedHtml: !wordDiffs.has(addedIdx) ? getHighlightedLine(addedLine) : undefined,
              }
            : null,
        });
      }
    } else if (line.type === 'added') {
      // Added without preceding removed
      const wordInfo = wordDiffs.get(i);
      rows.push({
        left: null,
        right: {
          line,
          segments: wordInfo?.segments,
          highlightedHtml: !wordInfo ? getHighlightedLine(line) : undefined,
        },
      });
      i++;
    }
  }

  return rows;
}

function SplitDiffLineCell({
  side,
  isStreaming,
  isLastAdded,
}: {
  side: { line: DiffLine; segments?: InlineSegment[]; highlightedHtml?: string } | null;
  isStreaming: boolean;
  isLastAdded: boolean;
}) {
  if (!side) {
    return (
      <div className="flex flex-1 min-w-0 font-mono text-xs leading-relaxed bg-surface-sunken/20">
        <span className="diff-gutter w-8 text-right pr-2 shrink-0">&nbsp;</span>
        <span className="flex-1">&nbsp;</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-1 min-w-0 font-mono text-xs leading-relaxed',
        side.line.type === 'added' && 'bg-surface-success/50 text-success',
        side.line.type === 'removed' && 'bg-surface-error/30 text-error/70',
        side.line.type === 'context' && 'text-muted-foreground/80',
      )}
    >
      <span className="diff-gutter w-8 text-right pr-2 select-none text-muted-foreground/30 text-[9px] shrink-0 leading-relaxed">
        {(side.line.type === 'removed' ? side.line.oldLineNumber : side.line.newLineNumber) ?? ''}
      </span>
      <span className="flex-1 min-w-0 whitespace-pre pr-2">
        {renderLineContent(side.line, side.segments, side.highlightedHtml)}
        {isStreaming && isLastAdded && <StreamingCursor />}
      </span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export const DiffView = memo(function DiffView({
  oldContent,
  newContent,
  filePath,
  isStreaming = false,
  maxHeight = 400,
}: DiffViewProps) {
  const { mode } = useDiffMode();
  // 1. Compute raw diff with line numbers
  const diffLines = useMemo(
    () => computeLineDiff(oldContent, newContent),
    [oldContent, newContent]
  );

  // 2. Split into hunks
  const hunks = useMemo(() => splitIntoHunks(diffLines, 3), [diffLines]);

  // 3. Syntax-highlight both old and new content
  const oldHighlighted = useMemo(
    () => highlightLines(oldContent, filePath),
    [oldContent, filePath]
  );
  const newHighlighted = useMemo(
    () => highlightLines(newContent, filePath),
    [newContent, filePath]
  );

  // 4. Compute word-level diffs per hunk
  const hunkWordDiffs = useMemo(() => hunks.map((hunk) => pairChangedLines(hunk.lines)), [hunks]);

  // 5. Track gaps between hunks for separator rendering
  const gaps = useMemo(() => {
    if (hunks.length <= 1) return [];
    const result: number[] = [];
    for (let i = 1; i < hunks.length; i++) {
      const prevEnd = hunks[i - 1]!;
      const currStart = hunks[i]!;
      const prevLastLine = prevEnd.lines[prevEnd.lines.length - 1];
      const currFirstLine = currStart.lines[0];
      const prevLineNum = prevLastLine?.oldLineNumber ?? prevLastLine?.newLineNumber ?? 0;
      const currLineNum = currFirstLine?.oldLineNumber ?? currFirstLine?.newLineNumber ?? 0;
      result.push(Math.max(0, currLineNum - prevLineNum - 1));
    }
    return result;
  }, [hunks]);

  // Track which separators are expanded
  const [expandedSeparators, setExpandedSeparators] = useState<Set<number>>(new Set());

  const toggleSeparator = useCallback((index: number) => {
    setExpandedSeparators((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Build a map of line numbers to highlighted HTML for quick lookup
  const getHighlightedLine = useCallback(
    (line: DiffLine): string | undefined => {
      if (line.type === 'removed' && line.oldLineNumber != null && oldHighlighted) {
        return oldHighlighted[line.oldLineNumber - 1];
      }
      if (line.type === 'added' && line.newLineNumber != null && newHighlighted) {
        return newHighlighted[line.newLineNumber - 1];
      }
      if (line.type === 'context' && line.newLineNumber != null && newHighlighted) {
        return newHighlighted[line.newLineNumber - 1];
      }
      return undefined;
    },
    [oldHighlighted, newHighlighted]
  );

  // Find the last added line index across all hunks for streaming cursor
  const lastAddedInfo = useMemo(() => {
    if (!isStreaming) return null;
    for (let h = hunks.length - 1; h >= 0; h--) {
      const lines = hunks[h]!.lines;
      for (let l = lines.length - 1; l >= 0; l--) {
        if (lines[l]!.type === 'added') return { hunkIndex: h, lineIndex: l };
      }
    }
    return null;
  }, [hunks, isStreaming]);

  // Compute context lines between hunks for expanded separators
  const contextBetweenHunks = useMemo(() => {
    if (hunks.length <= 1) return [];
    return gaps.map((gap, i) => {
      if (gap <= 0) return [];
      const prevHunk = hunks[i]!;
      const prevLastLine = prevHunk.lines[prevHunk.lines.length - 1];
      const startIdx = diffLines.findIndex((l) => l === prevLastLine);
      if (startIdx === -1) return [];
      return diffLines.slice(startIdx + 1, startIdx + 1 + gap);
    });
  }, [hunks, gaps, diffLines]);

  if (hunks.length === 0) return null;

  return (
    <div data-slot="diff-view" className="overflow-auto" style={{ maxHeight }}>
      <div className="min-w-full w-fit">
      {hunks.map((hunk, hunkIdx) => {
        const wordDiffs = hunkWordDiffs[hunkIdx]!;

        return (
          <React.Fragment key={hunkIdx}>
            {/* Separator between hunks */}
            {hunkIdx > 0 && gaps[hunkIdx - 1]! > 0 && (
              <>
                <HunkSeparator
                  linesHidden={gaps[hunkIdx - 1]!}
                  expanded={expandedSeparators.has(hunkIdx - 1)}
                  onToggle={() => toggleSeparator(hunkIdx - 1)}
                />
                <AnimatePresence>
                  {expandedSeparators.has(hunkIdx - 1) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={SPRINGS.SNAPPY}
                      className="overflow-hidden"
                    >
                      {contextBetweenHunks[hunkIdx - 1]?.map((line, lineIdx) =>
                        mode === 'split' ? (
                          <div key={`ctx-${hunkIdx}-${lineIdx}`} className="flex">
                            <SplitDiffLineCell
                              side={{ line, highlightedHtml: getHighlightedLine(line) }}
                              isStreaming={false}
                              isLastAdded={false}
                            />
                            <div className="w-px bg-border-muted/30 shrink-0" />
                            <SplitDiffLineCell
                              side={{ line, highlightedHtml: getHighlightedLine(line) }}
                              isStreaming={false}
                              isLastAdded={false}
                            />
                          </div>
                        ) : (
                          <DiffLineRow
                            key={`ctx-${hunkIdx}-${lineIdx}`}
                            line={line}
                            highlightedHtml={getHighlightedLine(line)}
                            isLastAdded={false}
                            isStreaming={false}
                          />
                        )
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Hunk lines */}
            {mode === 'split' ? (
              buildSplitRows(hunk.lines, wordDiffs, getHighlightedLine).map((row, rowIdx) => {
                const isLastAdded =
                  row.right?.line.type === 'added' &&
                  lastAddedInfo?.hunkIndex === hunkIdx;

                return (
                  <div key={`${hunkIdx}-${rowIdx}`} className="flex">
                    <SplitDiffLineCell
                      side={row.left}
                      isStreaming={false}
                      isLastAdded={false}
                    />
                    <div className="w-px bg-border-muted/30 shrink-0" />
                    <SplitDiffLineCell
                      side={row.right}
                      isStreaming={isStreaming}
                      isLastAdded={isLastAdded ?? false}
                    />
                  </div>
                );
              })
            ) : (
              hunk.lines.map((line, lineIdx) => {
                const wordInfo = wordDiffs.get(lineIdx);
                const isLastAdded =
                  lastAddedInfo?.hunkIndex === hunkIdx && lastAddedInfo?.lineIndex === lineIdx;

                return (
                  <DiffLineRow
                    key={`${hunkIdx}-${lineIdx}`}
                    line={line}
                    wordSegments={wordInfo?.segments}
                    highlightedHtml={!wordInfo ? getHighlightedLine(line) : undefined}
                    isLastAdded={isLastAdded}
                    isStreaming={isStreaming}
                  />
                );
              })
            )}
          </React.Fragment>
        );
      })}
      </div>
    </div>
  );
});
