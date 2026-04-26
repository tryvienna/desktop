/**
 * ProblemsPanel — Collapsible diagnostic display panel.
 *
 * Shows error and warning counts with a toggleable list of
 * diagnostic items. Click a diagnostic to scroll the editor
 * to its position.
 *
 * @module editor/components/ProblemsPanel
 */

import { useState, useCallback } from 'react';
import type { DiagnosticItem } from '../types';
import { DiagnosticSeverity } from '../types';

export interface ProblemsPanelProps {
  /** Diagnostic items to display. */
  diagnostics: DiagnosticItem[];
  /** Number of error diagnostics. */
  errorCount: number;
  /** Number of warning diagnostics. */
  warningCount: number;
  /** Called when a diagnostic item is clicked. */
  onDiagnosticClick?: (line: number, character: number) => void;
}

const SEVERITY_COLORS: Record<number, string> = {
  [DiagnosticSeverity.Error]: 'text-red-400',
  [DiagnosticSeverity.Warning]: 'text-yellow-400',
  [DiagnosticSeverity.Information]: 'text-blue-400',
  [DiagnosticSeverity.Hint]: 'text-neutral-400',
};

const SEVERITY_LABELS: Record<number, string> = {
  [DiagnosticSeverity.Error]: 'error',
  [DiagnosticSeverity.Warning]: 'warning',
  [DiagnosticSeverity.Information]: 'info',
  [DiagnosticSeverity.Hint]: 'hint',
};

export function ProblemsPanel(props: ProblemsPanelProps) {
  const { diagnostics, errorCount, warningCount, onDiagnosticClick } = props;
  const [isExpanded, setIsExpanded] = useState(false);

  const total = errorCount + warningCount;
  if (total === 0) return null;

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div className="border-t border-neutral-700" data-slot="problems-panel">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-800"
      >
        <span className="text-neutral-400">{isExpanded ? '\u25BC' : '\u25B6'}</span>
        <span className="font-medium text-neutral-300">Problems</span>
        {errorCount > 0 && (
          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400">
            {errorCount} {errorCount === 1 ? 'error' : 'errors'}
          </span>
        )}
        {warningCount > 0 && (
          <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-yellow-400">
            {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="max-h-48 overflow-y-auto px-1 pb-1">
          {diagnostics.map((item, idx) => (
            <button
              key={`${item.line}:${item.character}:${item.message.slice(0, 20)}-${idx}`}
              type="button"
              onClick={() => onDiagnosticClick?.(item.line, item.character)}
              className="flex w-full items-start gap-2 rounded px-2 py-1 text-left text-xs hover:bg-neutral-800"
            >
              <span className={`shrink-0 ${SEVERITY_COLORS[item.severity] ?? 'text-neutral-400'}`}>
                {SEVERITY_LABELS[item.severity] ?? 'info'}
              </span>
              <span className="text-neutral-300 break-all">{item.message}</span>
              <span className="ml-auto shrink-0 text-neutral-500">
                [{item.line}:{item.character}]
              </span>
              {item.source && (
                <span className="shrink-0 text-neutral-600">({item.source})</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
