import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MainLogger } from '@vienna/logger/main';
import type { AuthManager } from '../../main/auth/AuthManager';
import type { DeepLinkHandler } from '../../main/auth/DeepLinkHandler';
import { createAuthHandlers, type AuthHandlerOptions } from './handlers';

vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
}));

function createMockLogger(): MainLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as MainLogger;
}

function createOptions(): { logger: MainLogger; options: AuthHandlerOptions } {
  return {
    logger: createMockLogger(),
    options: {
      authManager: {
        isAuthenticated: vi.fn().mockReturnValue(true),
        getUserId: vi.fn().mockReturnValue('user-1'),
        logout: vi.fn().mockResolvedValue(undefined),
      } as unknown as AuthManager,
      deepLinkHandler: {
        setPendingAuthState: vi.fn(),
      } as unknown as DeepLinkHandler,
      webUrl: 'http://localhost:3000',
      protocolScheme: 'vienna-dev',
    },
  };
}

describe('createAuthHandlers', () => {
  beforeEach(async () => {
    const { shell } = await import('electron');
    vi.mocked(shell.openExternal).mockClear();
  });

  describe('auth.openBrowserAuth', () => {
    it('opens browser with login URL', async () => {
      const { logger, options } = createOptions();
      const { shell } = await import('electron');
      const handlers = createAuthHandlers(logger, options);

      const result = await handlers.auth.openBrowserAuth({ type: 'login' });

      expect(result).toEqual({ success: true });
      expect(options.deepLinkHandler.setPendingAuthState).toHaveBeenCalledWith('test-uuid-1234');
      expect(shell.openExternal).toHaveBeenCalledWith(
        expect.stringContaining('/auth/desktop/login'),
      );
    });

    it('uses signup path for signup type', async () => {
      const { logger, options } = createOptions();
      const { shell } = await import('electron');
      const handlers = createAuthHandlers(logger, options);

      await handlers.auth.openBrowserAuth({ type: 'signup' });

      expect(shell.openExternal).toHaveBeenCalledWith(
        expect.stringContaining('/auth/desktop/signup'),
      );
    });

    it('includes localPort when provided', async () => {
      const { logger, options } = createOptions();
      options.localPort = 9876;
      const { shell } = await import('electron');
      const handlers = createAuthHandlers(logger, options);

      await handlers.auth.openBrowserAuth({ type: 'login' });

      const url = vi.mocked(shell.openExternal).mock.calls[0][0] as string;
      expect(url).toContain('localPort=9876');
    });

    it('returns error on failure', async () => {
      const { logger, options } = createOptions();
      const { shell } = await import('electron');
      vi.mocked(shell.openExternal).mockRejectedValueOnce(new Error('fail'));
      const handlers = createAuthHandlers(logger, options);

      const result = await handlers.auth.openBrowserAuth({ type: 'login' });

      expect(result).toEqual({ success: false, error: 'Failed to open browser' });
    });
  });

  describe('auth.getAuthState', () => {
    it('returns current auth state', async () => {
      const { logger, options } = createOptions();
      const handlers = createAuthHandlers(logger, options);

      const result = await handlers.auth.getAuthState({});

      expect(result).toEqual({ isAuthenticated: true, userId: 'user-1' });
    });
  });

  describe('auth.logout', () => {
    it('delegates to AuthManager and triggers profile switch', async () => {
      const { logger, options } = createOptions();
      const mockProfileSwitch = vi.fn();
      options.onProfileSwitch = mockProfileSwitch;
      const handlers = createAuthHandlers(logger, options);

      const result = await handlers.auth.logout({});

      expect(result).toEqual({ success: true });
      expect(options.authManager.logout).toHaveBeenCalled();
      expect(mockProfileSwitch).toHaveBeenCalledWith('Signed out. Restarting Vienna…');
    });

    it('returns failure on error', async () => {
      const { logger, options } = createOptions();
      vi.mocked(options.authManager.logout).mockRejectedValueOnce(new Error('logout error'));
      const handlers = createAuthHandlers(logger, options);

      const result = await handlers.auth.logout({});

      expect(result).toEqual({ success: false });
    });
  });
});
