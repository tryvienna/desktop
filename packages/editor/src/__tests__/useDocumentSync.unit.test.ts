/**
 * useDocumentSync Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocumentSync } from '../hooks/useDocumentSync';
import { createMockLspClient, createMockModel } from './mock-monaco';

describe('useDocumentSync', () => {
  let lspClient: ReturnType<typeof createMockLspClient>;
  let model: ReturnType<typeof createMockModel>;

  beforeEach(() => {
    lspClient = createMockLspClient();
    model = createMockModel();
  });

  it('opens the document on mount for supported languages', async () => {
    const { result } = renderHook(() =>
      useDocumentSync({
        lspClient,
        filePath: '/test/file.ts',
        languageId: 'typescript',
        model: model as any,
      }),
    );

    await waitFor(() => {
      expect(result.current.isDocumentOpen).toBe(true);
    });

    expect(lspClient.openDocument).toHaveBeenCalledWith({
      uri: 'file:///test/file.ts',
      languageId: 'typescript',
      text: 'const x = 1;',
    });
  });

  it('does not open document for unsupported languages', () => {
    const { result } = renderHook(() =>
      useDocumentSync({
        lspClient,
        filePath: '/test/file.py',
        languageId: 'python',
        model: model as any,
      }),
    );

    expect(result.current.isDocumentOpen).toBe(false);
    expect(lspClient.openDocument).not.toHaveBeenCalled();
  });

  it('does not open document when model is null', () => {
    const { result } = renderHook(() =>
      useDocumentSync({
        lspClient,
        filePath: '/test/file.ts',
        languageId: 'typescript',
        model: null,
      }),
    );

    expect(result.current.isDocumentOpen).toBe(false);
    expect(lspClient.openDocument).not.toHaveBeenCalled();
  });

  it('closes the document on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useDocumentSync({
        lspClient,
        filePath: '/test/file.ts',
        languageId: 'typescript',
        model: model as any,
      }),
    );

    await waitFor(() => {
      expect(result.current.isDocumentOpen).toBe(true);
    });

    unmount();

    expect(lspClient.closeDocument).toHaveBeenCalledWith({ uri: 'file:///test/file.ts' });
  });

  it('returns the correct URI', () => {
    const { result } = renderHook(() =>
      useDocumentSync({
        lspClient,
        filePath: '/test/file.ts',
        languageId: 'typescript',
        model: model as any,
      }),
    );

    expect(result.current.uri).toBe('file:///test/file.ts');
  });

  it('syncs content changes with debounce', async () => {
    // Use fake timers but let promises resolve
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const { result } = renderHook(() =>
      useDocumentSync({
        lspClient,
        filePath: '/test/file.ts',
        languageId: 'typescript',
        model: model as any,
      }),
    );

    // Wait for async open to complete
    await vi.waitFor(() => {
      expect(result.current.isDocumentOpen).toBe(true);
    });

    // Trigger content change
    model.getValue.mockReturnValue('const x = 2;');
    act(() => {
      model._triggerContentChange();
    });

    // Not yet called (debounce)
    expect(lspClient.changeDocument).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(lspClient.changeDocument).toHaveBeenCalledWith({
      uri: 'file:///test/file.ts',
      text: 'const x = 2;',
    });

    vi.useRealTimers();
  });
});
