/**
 * useDiagnostics — Diagnostic marker management.
 *
 * Subscribes to LSP diagnostic events and maps them to Monaco editor markers.
 * Tracks error and warning counts for the ProblemsPanel.
 *
 * @module editor/hooks/useDiagnostics
 */

import { useEffect, useState, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';
import type { LspEventSubscriptions, LspDiagnostic, DiagnosticItem } from '../types';
import { DiagnosticSeverity } from '../types';

export interface UseDiagnosticsOptions {
  /** LSP event subscriptions from IPC. */
  lspEvents: LspEventSubscriptions;
  /** The Monaco namespace for setting markers. */
  monaco: typeof Monaco | null;
  /** The Monaco text model to annotate. */
  model: Monaco.editor.ITextModel | null;
  /** The file:// URI to filter diagnostics for. */
  uri: string;
  /** Only subscribe when the document is open in LSP. */
  enabled: boolean;
}

export interface UseDiagnosticsResult {
  errorCount: number;
  warningCount: number;
  diagnostics: DiagnosticItem[];
}

const MARKER_OWNER = 'lsp';

/** Map LSP severity (1-4) to Monaco MarkerSeverity (8,4,2,1). */
const LSP_TO_MONACO_SEVERITY: Record<number, number> = {
  [DiagnosticSeverity.Error]: 8,
  [DiagnosticSeverity.Warning]: 4,
  [DiagnosticSeverity.Information]: 2,
  [DiagnosticSeverity.Hint]: 1,
};

const SEVERITY_LABELS: Record<number, DiagnosticItem['severity']> = {
  [DiagnosticSeverity.Error]: DiagnosticSeverity.Error,
  [DiagnosticSeverity.Warning]: DiagnosticSeverity.Warning,
  [DiagnosticSeverity.Information]: DiagnosticSeverity.Information,
  [DiagnosticSeverity.Hint]: DiagnosticSeverity.Hint,
};

export function useDiagnostics(options: UseDiagnosticsOptions): UseDiagnosticsResult {
  const { lspEvents, monaco, model, uri, enabled } = options;
  const [errorCount, setErrorCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);

  const updateMarkers = useCallback(
    (diags: LspDiagnostic[]) => {
      if (!monaco || !model) return;

      const markers: Monaco.editor.IMarkerData[] = diags.map((d) => ({
        severity: LSP_TO_MONACO_SEVERITY[d.severity ?? DiagnosticSeverity.Error] ?? monaco.MarkerSeverity.Error,
        startLineNumber: d.range.start.line + 1,
        startColumn: d.range.start.character + 1,
        endLineNumber: d.range.end.line + 1,
        endColumn: d.range.end.character + 1,
        message: d.message,
        source: d.source ?? 'ts',
        code: d.code?.toString(),
      }));

      monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);

      let errors = 0;
      let warnings = 0;
      const items: DiagnosticItem[] = diags.map((d) => {
        const sev = d.severity ?? DiagnosticSeverity.Error;
        if (sev === DiagnosticSeverity.Error) errors++;
        else if (sev === DiagnosticSeverity.Warning) warnings++;

        return {
          severity: SEVERITY_LABELS[sev] ?? DiagnosticSeverity.Hint,
          message: d.message,
          source: d.source,
          code: d.code,
          line: d.range.start.line + 1,
          character: d.range.start.character + 1,
        };
      });

      setErrorCount(errors);
      setWarningCount(warnings);
      setDiagnostics(items);
    },
    [monaco, model],
  );

  // Subscribe to diagnostic events
  useEffect(() => {
    if (!enabled) return;

    const unsub = lspEvents.onDiagnostics((data) => {
      if (data.uri === uri) {
        updateMarkers(data.diagnostics);
      }
    });

    return () => {
      unsub();
      // Clear markers on cleanup
      if (monaco && model) {
        try {
          monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
        } catch {
          // Model may be disposed
        }
      }
      setErrorCount(0);
      setWarningCount(0);
      setDiagnostics([]);
    };
  }, [lspEvents, monaco, model, uri, enabled, updateMarkers]);

  return { errorCount, warningCount, diagnostics };
}
