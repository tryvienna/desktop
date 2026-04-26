/**
 * useLspProviders Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLspProviders } from '../hooks/useLspProviders';
import { createMockMonaco, createMockEditor, createMockLspClient } from './mock-monaco';

describe('useLspProviders', () => {
  let mockMonaco: ReturnType<typeof createMockMonaco>;
  let mockEditor: ReturnType<typeof createMockEditor>;
  let lspClient: ReturnType<typeof createMockLspClient>;

  beforeEach(() => {
    mockMonaco = createMockMonaco();
    mockEditor = createMockEditor();
    lspClient = createMockLspClient();
  });

  it('registers all 7 language providers when enabled', () => {
    renderHook(() =>
      useLspProviders({
        monaco: mockMonaco as any,
        editor: mockEditor as any,
        lspClient,
        monacoLanguageId: 'typescript',
        lspLanguageId: 'typescript',
        uri: 'file:///test/file.ts',
        enabled: true,
      }),
    );

    expect(mockMonaco.languages.registerHoverProvider).toHaveBeenCalledWith('typescript', expect.any(Object));
    expect(mockMonaco.languages.registerDefinitionProvider).toHaveBeenCalledWith('typescript', expect.any(Object));
    expect(mockMonaco.languages.registerReferenceProvider).toHaveBeenCalledWith('typescript', expect.any(Object));
    expect(mockMonaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith('typescript', expect.any(Object));
    expect(mockMonaco.languages.registerSignatureHelpProvider).toHaveBeenCalledWith('typescript', expect.any(Object));
    expect(mockMonaco.languages.registerCodeActionProvider).toHaveBeenCalledWith('typescript', expect.any(Object));
    expect(mockMonaco.languages.registerRenameProvider).toHaveBeenCalledWith('typescript', expect.any(Object));
  });

  it('does not register providers when disabled', () => {
    renderHook(() =>
      useLspProviders({
        monaco: mockMonaco as any,
        editor: mockEditor as any,
        lspClient,
        monacoLanguageId: 'typescript',
        lspLanguageId: 'typescript',
        uri: 'file:///test/file.ts',
        enabled: false,
      }),
    );

    expect(mockMonaco.languages.registerHoverProvider).not.toHaveBeenCalled();
  });

  it('does not register providers when monaco is null', () => {
    renderHook(() =>
      useLspProviders({
        monaco: null,
        editor: mockEditor as any,
        lspClient,
        monacoLanguageId: 'typescript',
        lspLanguageId: 'typescript',
        uri: 'file:///test/file.ts',
        enabled: true,
      }),
    );

    expect(mockMonaco.languages.registerHoverProvider).not.toHaveBeenCalled();
  });

  it('disposes providers on unmount', () => {
    const disposeMock = vi.fn();
    const disposable = { dispose: disposeMock };
    mockMonaco.languages.registerHoverProvider.mockReturnValue(disposable);
    mockMonaco.languages.registerDefinitionProvider.mockReturnValue(disposable);
    mockMonaco.languages.registerReferenceProvider.mockReturnValue(disposable);
    mockMonaco.languages.registerCompletionItemProvider.mockReturnValue(disposable);
    mockMonaco.languages.registerSignatureHelpProvider.mockReturnValue(disposable);
    mockMonaco.languages.registerCodeActionProvider.mockReturnValue(disposable);
    mockMonaco.languages.registerRenameProvider.mockReturnValue(disposable);

    const { unmount } = renderHook(() =>
      useLspProviders({
        monaco: mockMonaco as any,
        editor: mockEditor as any,
        lspClient,
        monacoLanguageId: 'typescript',
        lspLanguageId: 'typescript',
        uri: 'file:///test/file.ts',
        enabled: true,
      }),
    );

    unmount();

    // 7 providers should be disposed
    expect(disposeMock).toHaveBeenCalledTimes(7);
  });
});
