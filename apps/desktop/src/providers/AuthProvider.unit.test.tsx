// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { waitFor, act, renderHook } from '@testing-library/react';
import { createTestHarness } from '@vienna/ipc/testing';
import { api, events } from '../ipc';
import { AuthProvider, useAuth } from './AuthProvider';

// Track mock calls for assertions
const mockOpenBrowserAuth = vi.fn().mockResolvedValue({ success: true });
const mockGetAuthState = vi.fn().mockResolvedValue({ isAuthenticated: true, userId: 'user-1' });
const mockLogout = vi.fn().mockResolvedValue({ success: true });

let cleanup: (() => void) | undefined;

beforeAll(() => {
  const harness = createTestHarness(
    api,
    {
      system: {
        getVersions: async () => ({
          electron: '40.0.0',
          node: '22.0.0',
          chrome: '130.0.0',
        }),
        getEnv: async () => ({
          NODE_ENV: 'test' as const,
          isDev: false,
          isProd: false,
          isTest: true,
          isCI: false,
        }),
      },
      shell: {
        openExternal: async () => ({ success: true }),
        pickDirectory: async () => ({ path: null }),
        execute: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 0 }),
        showItemInFolder: async () => ({ success: true }),
      },
      logger: {
        log: async () => ({ logged: true }),
        getSessionId: async () => ({
          sessionId: 'test-session',
          sessionDir: '/tmp/test-logs',
        }),
      },
      agent: {
        startSession: async () => ({ sessionId: 'mock-session' }),
        stopSession: async () => ({ stopped: true }),
        sendMessage: async () => ({ accepted: true }),
        respondPermission: async () => ({ accepted: true }),
        interrupt: async () => ({ interrupted: true }),
        getHistory: async () => ({ events: [] }),
        listProviders: async () => ({ providers: [] }),
        checkProvider: async () => ({ available: false }),
        switchModel: async () => ({ restarted: false }),
        linkEntity: async () => ({ linked: true }),
        unlinkEntity: async () => ({ unlinked: true }),
        compactConversation: async () => ({ accepted: true }),
      },
      graphql: {
        execute: async () => ({ data: null }),
      },
      auth: {
        openBrowserAuth: mockOpenBrowserAuth,
        getAuthState: mockGetAuthState,
        logout: mockLogout,
      },
      keybindings: {
        get: async () => ({ keybindings: {} }),
        getDefaults: async () => ({ keybindings: {} }),
        update: async () => ({ success: true }),
        resetOne: async () => ({ success: true }),
        resetAll: async () => ({ success: true }),
      },
      lsp: {
        openDocument: async () => ({ opened: true }),
        closeDocument: async () => ({ success: true }),
        changeDocument: async () => ({ success: true }),
        saveDocument: async () => ({ success: true }),
        getHover: async () => null,
        getDefinition: async () => null,
        getReferences: async () => null,
        getCompletions: async () => null,
        getSignatureHelp: async () => null,
        getCodeActions: async () => null,
        prepareRename: async () => null,
        rename: async () => null,
        getDocumentSymbols: async () => null,
        getStatus: async () => ({ servers: [] }),
        isServerReady: async () => ({ ready: false }),
        getProjectRoot: async () => ({ projectRoot: null }),
      },
      file: {
        read: async () => ({ content: '', language: 'text' }),
        write: async () => ({ success: true }),
        watch: async () => ({ watching: true }),
        unwatch: async () => ({ success: true }),
        listDirectory: async () => ({ entries: [] }),
        createDirectory: async () => ({ success: true }),
        createFile: async () => ({ success: true }),
        rename: async () => ({ success: true }),
        deleteItem: async () => ({ success: true }),
      },
      files: {
        searchFiles: async () => ({ results: [] }),
        indexDirectories: async () => ({ success: true }),
        setDirectories: async () => ({ success: true }),
        getIndexStatus: async () => ({ totalFiles: 0, directories: 0, isIndexing: false, indexingDirectories: [] }),
      },
      feedback: {
        submit: async () => ({ success: true }),
      },
    },
    events
  );
  cleanup = harness.cleanup;
});

afterAll(() => {
  cleanup?.();
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    mockOpenBrowserAuth.mockClear();
    mockGetAuthState.mockClear().mockResolvedValue({ isAuthenticated: true, userId: 'user-1' });
    mockLogout.mockClear().mockResolvedValue({ success: true });
  });

  it('starts in loading state and fetches auth state on mount', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // After fetching, no longer loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userId).toBe('user-1');
    expect(mockGetAuthState).toHaveBeenCalledOnce();
  });

  it('handles getAuthState failure gracefully', async () => {
    mockGetAuthState.mockRejectedValueOnce(new Error('IPC error'));

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userId).toBeNull();
  });

  it('login calls openBrowserAuth with type login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login();
    });

    expect(mockOpenBrowserAuth).toHaveBeenCalledWith({ type: 'login' });
  });

  it('signup calls openBrowserAuth with type signup', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signup();
    });

    expect(mockOpenBrowserAuth).toHaveBeenCalledWith({ type: 'signup' });
  });

  it('logout calls auth.logout and resets state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userId).toBeNull();
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});
