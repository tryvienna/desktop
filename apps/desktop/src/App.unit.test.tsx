// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createTestHarness } from '@vienna/ipc/testing';
import { api, events } from './ipc';
import { App } from './App';

let cleanup: (() => void) | undefined;

beforeAll(() => {
  const harness = createTestHarness(api, {
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
      openBrowserAuth: async () => ({ success: true }),
      getAuthState: async () => ({ isAuthenticated: true, userId: 'test-user' }),
      logout: async () => ({ success: true }),
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
  }, events);
  cleanup = harness.cleanup;
});

afterAll(() => {
  cleanup?.();
});

describe('App', () => {
  it('renders the layout shell with hello world', async () => {
    const { container } = render(<App />);
    await waitFor(() => {
      expect(container.querySelector('[data-slot="side-panel"]')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello, World');
    });
  });

  it('displays version info from preload bridge', async () => {
    render(<App />);
    await waitFor(() => {
      const versionText = screen.getByText(/Electron 40\.0\.0/);
      expect(versionText).toBeInTheDocument();
      expect(versionText).toHaveTextContent('Node 22.0.0');
      expect(versionText).toHaveTextContent('Chrome 130.0.0');
    });
  });
});
