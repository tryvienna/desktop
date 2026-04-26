/**
 * useFileEditor Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileEditor } from '../hooks/useFileEditor';
import { createMockFileClient, createMockFileEvents, createMockLspClient } from './mock-monaco';

describe('useFileEditor', () => {
  let fileClient: ReturnType<typeof createMockFileClient>;
  let fileEvents: ReturnType<typeof createMockFileEvents>;
  let lspClient: ReturnType<typeof createMockLspClient>;

  beforeEach(() => {
    fileClient = createMockFileClient();
    fileEvents = createMockFileEvents();
    lspClient = createMockLspClient();
  });

  it('loads file content on mount', async () => {
    const { result } = renderHook(() =>
      useFileEditor({
        fileClient,
        fileEvents,
        lspClient,
        filePath: '/test/file.ts',
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fileClient.read).toHaveBeenCalledWith({ path: '/test/file.ts' });
    expect(result.current.content).toBe('const x = 1;');
    expect(result.current.language).toBe('typescript');
    expect(result.current.isDirty).toBe(false);
  });

  it('starts watching the file', async () => {
    const { result } = renderHook(() =>
      useFileEditor({
        fileClient,
        fileEvents,
        lspClient,
        filePath: '/test/file.ts',
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fileClient.watch).toHaveBeenCalledWith({ path: '/test/file.ts' });
  });

  it('tracks dirty state when content changes', async () => {
    const { result } = renderHook(() =>
      useFileEditor({
        fileClient,
        fileEvents,
        lspClient,
        filePath: '/test/file.ts',
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setContent('const x = 2;');
    });

    expect(result.current.isDirty).toBe(true);

    // Setting back to saved content clears dirty
    act(() => {
      result.current.setContent('const x = 1;');
    });

    expect(result.current.isDirty).toBe(false);
  });

  it('saves file and notifies LSP', async () => {
    const { result } = renderHook(() =>
      useFileEditor({
        fileClient,
        fileEvents,
        lspClient,
        filePath: '/test/file.ts',
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setContent('const x = 2;');
    });

    await act(async () => {
      await result.current.save();
    });

    expect(fileClient.write).toHaveBeenCalledWith({ path: '/test/file.ts', content: 'const x = 2;' });
    expect(lspClient.saveDocument).toHaveBeenCalledWith({ uri: 'file:///test/file.ts', text: 'const x = 2;' });
    expect(result.current.isDirty).toBe(false);
  });

  it('detects conflicts when file changes externally while dirty', async () => {
    let changeCallback: (data: { path: string }) => void = () => {};
    fileEvents.onChanged.mockImplementation((cb: any) => {
      changeCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useFileEditor({
        fileClient,
        fileEvents,
        lspClient,
        filePath: '/test/file.ts',
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Make dirty
    act(() => {
      result.current.setContent('const x = 2;');
    });

    // External change
    act(() => {
      changeCallback({ path: '/test/file.ts' });
    });

    expect(result.current.hasConflict).toBe(true);
  });

  it('dismisses conflicts', async () => {
    let changeCallback: (data: { path: string }) => void = () => {};
    fileEvents.onChanged.mockImplementation((cb: any) => {
      changeCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useFileEditor({
        fileClient,
        fileEvents,
        lspClient,
        filePath: '/test/file.ts',
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setContent('const x = 2;');
    });

    act(() => {
      changeCallback({ path: '/test/file.ts' });
    });

    expect(result.current.hasConflict).toBe(true);

    act(() => {
      result.current.dismissConflict();
    });

    expect(result.current.hasConflict).toBe(false);
  });

  it('reloads file from disk', async () => {
    const { result } = renderHook(() =>
      useFileEditor({
        fileClient,
        fileEvents,
        lspClient,
        filePath: '/test/file.ts',
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setContent('modified');
    });

    fileClient.read.mockResolvedValue({ content: 'reloaded', language: 'typescript' });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.content).toBe('reloaded');
    expect(result.current.isDirty).toBe(false);
  });

  it('preserves dirty content across unmount/remount (tab switch)', async () => {
    const options = {
      fileClient,
      fileEvents,
      lspClient,
      filePath: '/test/file.ts',
    };

    const { result, unmount } = renderHook(() => useFileEditor(options));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Make dirty
    act(() => {
      result.current.setContent('const x = 2;');
    });
    expect(result.current.isDirty).toBe(true);

    // Unmount (simulates tab switch)
    unmount();

    // Remount — should restore dirty content
    const { result: result2 } = renderHook(() => useFileEditor(options));

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(result2.current.content).toBe('const x = 2;');
    expect(result2.current.isDirty).toBe(true);
  });

  it('does not cache content when not dirty on unmount', async () => {
    const options = {
      fileClient,
      fileEvents,
      lspClient,
      filePath: '/test/clean-file.ts',
    };

    const { result, unmount } = renderHook(() => useFileEditor(options));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isDirty).toBe(false);

    // Unmount without making dirty
    unmount();

    // Remount — should load from disk, not cache
    const { result: result2 } = renderHook(() => useFileEditor(options));

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(result2.current.content).toBe('const x = 1;');
    expect(result2.current.isDirty).toBe(false);
  });

  it('ignores file change events for other files', async () => {
    let changeCallback: (data: { path: string }) => void = () => {};
    fileEvents.onChanged.mockImplementation((cb: any) => {
      changeCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useFileEditor({
        fileClient,
        fileEvents,
        lspClient,
        filePath: '/test/file.ts',
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const readCount = fileClient.read.mock.calls.length;

    act(() => {
      changeCallback({ path: '/other/file.ts' });
    });

    // Should not have triggered another read
    expect(fileClient.read).toHaveBeenCalledTimes(readCount);
  });
});
