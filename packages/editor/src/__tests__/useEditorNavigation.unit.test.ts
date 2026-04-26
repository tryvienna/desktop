/**
 * useEditorNavigation Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEditorNavigation } from '../hooks/useEditorNavigation';
import { createMockMonaco } from './mock-monaco';

describe('useEditorNavigation', () => {
  let mockMonaco: ReturnType<typeof createMockMonaco>;
  let onNavigateToFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMonaco = createMockMonaco();
    onNavigateToFile = vi.fn();
  });

  it('registers an editor opener when enabled', () => {
    renderHook(() =>
      useEditorNavigation({
        monaco: mockMonaco as any,
        filePath: '/test/file.ts',
        onNavigateToFile,
        enabled: true,
      }),
    );

    expect(mockMonaco.editor.registerEditorOpener).toHaveBeenCalledWith(
      expect.objectContaining({ openCodeEditor: expect.any(Function) }),
    );
  });

  it('does not register when disabled', () => {
    renderHook(() =>
      useEditorNavigation({
        monaco: mockMonaco as any,
        filePath: '/test/file.ts',
        onNavigateToFile,
        enabled: false,
      }),
    );

    expect(mockMonaco.editor.registerEditorOpener).not.toHaveBeenCalled();
  });

  it('does not register when onNavigateToFile is undefined', () => {
    renderHook(() =>
      useEditorNavigation({
        monaco: mockMonaco as any,
        filePath: '/test/file.ts',
        onNavigateToFile: undefined,
        enabled: true,
      }),
    );

    expect(mockMonaco.editor.registerEditorOpener).not.toHaveBeenCalled();
  });

  it('returns false for same-file navigation', () => {
    let opener: any;
    mockMonaco.editor.registerEditorOpener.mockImplementation((o: any) => {
      opener = o;
      return { dispose: vi.fn() };
    });

    renderHook(() =>
      useEditorNavigation({
        monaco: mockMonaco as any,
        filePath: '/test/file.ts',
        onNavigateToFile,
        enabled: true,
      }),
    );

    const result = opener.openCodeEditor(
      null,
      { path: '/test/file.ts' },
      null,
    );

    expect(result).toBe(false);
    expect(onNavigateToFile).not.toHaveBeenCalled();
  });

  it('calls onNavigateToFile for cross-file navigation with IPosition', () => {
    let opener: any;
    mockMonaco.editor.registerEditorOpener.mockImplementation((o: any) => {
      opener = o;
      return { dispose: vi.fn() };
    });

    renderHook(() =>
      useEditorNavigation({
        monaco: mockMonaco as any,
        filePath: '/test/file.ts',
        onNavigateToFile,
        enabled: true,
      }),
    );

    const result = opener.openCodeEditor(
      null,
      { path: '/other/file.ts' },
      { lineNumber: 10, column: 5 },
    );

    expect(result).toBe(true);
    expect(onNavigateToFile).toHaveBeenCalledWith('/other/file.ts', 10, 5);
  });

  it('calls onNavigateToFile for cross-file navigation with IRange', () => {
    let opener: any;
    mockMonaco.editor.registerEditorOpener.mockImplementation((o: any) => {
      opener = o;
      return { dispose: vi.fn() };
    });

    renderHook(() =>
      useEditorNavigation({
        monaco: mockMonaco as any,
        filePath: '/test/file.ts',
        onNavigateToFile,
        enabled: true,
      }),
    );

    const result = opener.openCodeEditor(
      null,
      { path: '/other/file.ts' },
      { startLineNumber: 5, startColumn: 3, endLineNumber: 5, endColumn: 10 },
    );

    expect(result).toBe(true);
    expect(onNavigateToFile).toHaveBeenCalledWith('/other/file.ts', 5, 3);
  });

  it('disposes opener on unmount', () => {
    const dispose = vi.fn();
    mockMonaco.editor.registerEditorOpener.mockReturnValue({ dispose });

    const { unmount } = renderHook(() =>
      useEditorNavigation({
        monaco: mockMonaco as any,
        filePath: '/test/file.ts',
        onNavigateToFile,
        enabled: true,
      }),
    );

    unmount();
    expect(dispose).toHaveBeenCalled();
  });
});
