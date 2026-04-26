/**
 * useDiagnostics Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDiagnostics } from '../hooks/useDiagnostics';
import { createMockMonaco, createMockModel, createMockLspEvents } from './mock-monaco';
import { DiagnosticSeverity } from '../types';

describe('useDiagnostics', () => {
  let mockMonaco: ReturnType<typeof createMockMonaco>;
  let model: ReturnType<typeof createMockModel>;
  let lspEvents: ReturnType<typeof createMockLspEvents>;

  beforeEach(() => {
    mockMonaco = createMockMonaco();
    model = createMockModel();
    lspEvents = createMockLspEvents();
  });

  it('starts with zero counts', () => {
    const { result } = renderHook(() =>
      useDiagnostics({
        lspEvents,
        monaco: mockMonaco as any,
        model: model as any,
        uri: 'file:///test/file.ts',
        enabled: true,
      }),
    );

    expect(result.current.errorCount).toBe(0);
    expect(result.current.warningCount).toBe(0);
    expect(result.current.diagnostics).toEqual([]);
  });

  it('subscribes to diagnostic events when enabled', () => {
    renderHook(() =>
      useDiagnostics({
        lspEvents,
        monaco: mockMonaco as any,
        model: model as any,
        uri: 'file:///test/file.ts',
        enabled: true,
      }),
    );

    expect(lspEvents.onDiagnostics).toHaveBeenCalled();
  });

  it('does not subscribe when disabled', () => {
    renderHook(() =>
      useDiagnostics({
        lspEvents,
        monaco: mockMonaco as any,
        model: model as any,
        uri: 'file:///test/file.ts',
        enabled: false,
      }),
    );

    expect(lspEvents.onDiagnostics).not.toHaveBeenCalled();
  });

  it('updates counts when diagnostics arrive', () => {
    let diagnosticCallback: (data: { uri: string; diagnostics: any[] }) => void = () => {};
    lspEvents.onDiagnostics.mockImplementation((cb: any) => {
      diagnosticCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useDiagnostics({
        lspEvents,
        monaco: mockMonaco as any,
        model: model as any,
        uri: 'file:///test/file.ts',
        enabled: true,
      }),
    );

    act(() => {
      diagnosticCallback({
        uri: 'file:///test/file.ts',
        diagnostics: [
          { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, severity: DiagnosticSeverity.Error, message: 'Error 1' },
          { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } }, severity: DiagnosticSeverity.Warning, message: 'Warning 1' },
          { range: { start: { line: 2, character: 0 }, end: { line: 2, character: 3 } }, severity: DiagnosticSeverity.Error, message: 'Error 2' },
        ],
      });
    });

    expect(result.current.errorCount).toBe(2);
    expect(result.current.warningCount).toBe(1);
    expect(result.current.diagnostics).toHaveLength(3);
  });

  it('sets Monaco markers on the model', () => {
    let diagnosticCallback: (data: { uri: string; diagnostics: any[] }) => void = () => {};
    lspEvents.onDiagnostics.mockImplementation((cb: any) => {
      diagnosticCallback = cb;
      return vi.fn();
    });

    renderHook(() =>
      useDiagnostics({
        lspEvents,
        monaco: mockMonaco as any,
        model: model as any,
        uri: 'file:///test/file.ts',
        enabled: true,
      }),
    );

    act(() => {
      diagnosticCallback({
        uri: 'file:///test/file.ts',
        diagnostics: [
          { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, severity: DiagnosticSeverity.Error, message: 'Error' },
        ],
      });
    });

    expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
      model,
      'lsp',
      expect.arrayContaining([
        expect.objectContaining({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 6,
          message: 'Error',
        }),
      ]),
    );
  });

  it('ignores diagnostics for different URIs', () => {
    let diagnosticCallback: (data: { uri: string; diagnostics: any[] }) => void = () => {};
    lspEvents.onDiagnostics.mockImplementation((cb: any) => {
      diagnosticCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useDiagnostics({
        lspEvents,
        monaco: mockMonaco as any,
        model: model as any,
        uri: 'file:///test/file.ts',
        enabled: true,
      }),
    );

    act(() => {
      diagnosticCallback({
        uri: 'file:///other/file.ts',
        diagnostics: [
          { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, severity: DiagnosticSeverity.Error, message: 'Error' },
        ],
      });
    });

    expect(result.current.errorCount).toBe(0);
    expect(mockMonaco.editor.setModelMarkers).not.toHaveBeenCalled();
  });

  it('clears markers on unmount', () => {
    const unsub = vi.fn();
    lspEvents.onDiagnostics.mockReturnValue(unsub);

    const { unmount } = renderHook(() =>
      useDiagnostics({
        lspEvents,
        monaco: mockMonaco as any,
        model: model as any,
        uri: 'file:///test/file.ts',
        enabled: true,
      }),
    );

    unmount();

    expect(unsub).toHaveBeenCalled();
    expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(model, 'lsp', []);
  });
});
