import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthManager } from './AuthManager';
import type { AuthManagerDeps, AuthEventEmitter } from './AuthManager';
import type { SecureStorage } from '@vienna/secure-storage';
import type { MainLogger } from '@vienna/logger/main';

function createMockStorage(): SecureStorage {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  } as unknown as SecureStorage;
}

function createMockLogger(): MainLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
    flush: vi.fn(),
    close: vi.fn(),
  } as unknown as MainLogger;
}

function createMockEmitter(): AuthEventEmitter {
  return {
    onAuthStateChanged: vi.fn(),
  };
}

function createDeps(overrides?: Partial<AuthManagerDeps>): AuthManagerDeps {
  return {
    storage: createMockStorage(),
    logger: createMockLogger(),
    emitter: createMockEmitter(),
    webUrl: 'http://localhost:3000',
    ...overrides,
  };
}

/** Mock a successful fetch response. */
function mockFetchResponse(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

describe('AuthManager', () => {
  let deps: AuthManagerDeps;
  let manager: AuthManager;

  beforeEach(() => {
    vi.useFakeTimers();
    deps = createDeps();
    manager = new AuthManager(deps);
    // Default: token validation succeeds
    global.fetch = mockFetchResponse({ valid: true });
  });

  afterEach(() => {
    manager.stopPeriodicValidation();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // initialize()
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialize()', () => {
    it('restores session from storage and validates token', async () => {
      const stored = { token: 'tok-abc', userId: 'user-1' };
      vi.mocked(deps.storage.get).mockResolvedValue(stored);
      global.fetch = mockFetchResponse({ valid: true });

      await manager.initialize();

      expect(deps.storage.get).toHaveBeenCalledWith('auth', 'session');
      expect(manager.getToken()).toBe('tok-abc');
      expect(manager.getUserId()).toBe('user-1');
      expect(manager.isAuthenticated()).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/validate',
        expect.objectContaining({ headers: { Authorization: 'Bearer tok-abc' } }),
      );
    });

    it('clears session if stored token is no longer valid', async () => {
      vi.mocked(deps.storage.get).mockResolvedValue({ token: 'tok-old', userId: 'user-1' });
      global.fetch = mockFetchResponse({ valid: false }, 401);

      await manager.initialize();

      expect(manager.isAuthenticated()).toBe(false);
      expect(manager.getToken()).toBeNull();
      expect(deps.storage.delete).toHaveBeenCalledWith('auth', 'session');
      expect(deps.emitter.onAuthStateChanged).toHaveBeenCalledWith({
        isAuthenticated: false,
        userId: null,
      });
    });

    it('handles missing storage gracefully (no stored session)', async () => {
      vi.mocked(deps.storage.get).mockResolvedValue(null);

      await manager.initialize();

      expect(manager.getToken()).toBeNull();
      expect(manager.getUserId()).toBeNull();
      expect(manager.isAuthenticated()).toBe(false);
      expect(deps.logger.info).toHaveBeenCalledWith('No stored auth session found');
    });

    it('handles storage returning partial data (missing token)', async () => {
      vi.mocked(deps.storage.get).mockResolvedValue({ userId: 'user-1' });

      await manager.initialize();

      expect(manager.isAuthenticated()).toBe(false);
      expect(deps.logger.info).toHaveBeenCalledWith('No stored auth session found');
    });

    it('handles storage returning partial data (missing userId)', async () => {
      vi.mocked(deps.storage.get).mockResolvedValue({ token: 'tok-abc' });

      await manager.initialize();

      expect(manager.isAuthenticated()).toBe(false);
      expect(deps.logger.info).toHaveBeenCalledWith('No stored auth session found');
    });

    it('handles storage errors gracefully (logs warning, does not throw)', async () => {
      const storageError = new Error('keychain unavailable');
      vi.mocked(deps.storage.get).mockRejectedValue(storageError);

      await expect(manager.initialize()).resolves.toBeUndefined();

      expect(manager.isAuthenticated()).toBe(false);
      expect(deps.logger.warn).toHaveBeenCalledWith(
        'Failed to load auth session from storage',
        { error: storageError },
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // validateToken()
  // ─────────────────────────────────────────────────────────────────────────

  describe('validateToken()', () => {
    it('returns true when server confirms token is valid', async () => {
      await manager.handleAuthSuccess('tok-1', 'user-1');
      global.fetch = mockFetchResponse({ valid: true });

      const result = await manager.validateToken();

      expect(result).toBe(true);
    });

    it('returns false when server says token is invalid', async () => {
      await manager.handleAuthSuccess('tok-1', 'user-1');
      global.fetch = mockFetchResponse({ valid: false }, 401);

      const result = await manager.validateToken();

      expect(result).toBe(false);
    });

    it('returns true on network error (offline tolerance)', async () => {
      await manager.handleAuthSuccess('tok-1', 'user-1');
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

      const result = await manager.validateToken();

      expect(result).toBe(true);
      expect(deps.logger.warn).toHaveBeenCalledWith(
        'Token validation request failed (network error)',
        expect.any(Object),
      );
    });

    it('returns false when no token is stored', async () => {
      const result = await manager.validateToken();

      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // handleAuthSuccess()
  // ─────────────────────────────────────────────────────────────────────────

  describe('handleAuthSuccess()', () => {
    it('stores token and userId, emits event', async () => {
      await manager.handleAuthSuccess('tok-xyz', 'user-42');

      expect(manager.getToken()).toBe('tok-xyz');
      expect(manager.getUserId()).toBe('user-42');
      expect(manager.isAuthenticated()).toBe(true);

      expect(deps.storage.set).toHaveBeenCalledWith('auth', 'session', {
        token: 'tok-xyz',
        userId: 'user-42',
      });
      expect(deps.logger.info).toHaveBeenCalledWith('Auth session stored', { userId: 'user-42' });
      expect(deps.emitter.onAuthStateChanged).toHaveBeenCalledWith({
        isAuthenticated: true,
        userId: 'user-42',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // logout()
  // ─────────────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('revokes server session, then clears local state', async () => {
      await manager.handleAuthSuccess('tok-xyz', 'user-42');
      global.fetch = mockFetchResponse({ success: true });

      await manager.logout();

      // Server revocation was called
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/revoke',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer tok-xyz' }),
        }),
      );

      // Local state was cleared
      expect(manager.getToken()).toBeNull();
      expect(manager.getUserId()).toBeNull();
      expect(manager.isAuthenticated()).toBe(false);
      expect(deps.storage.delete).toHaveBeenCalledWith('auth', 'session');
      expect(deps.emitter.onAuthStateChanged).toHaveBeenCalledWith({
        isAuthenticated: false,
        userId: null,
      });
    });

    it('clears local state even if server revocation fails', async () => {
      await manager.handleAuthSuccess('tok-xyz', 'user-42');
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

      await manager.logout();

      expect(manager.isAuthenticated()).toBe(false);
      expect(deps.storage.delete).toHaveBeenCalledWith('auth', 'session');
      expect(deps.logger.warn).toHaveBeenCalledWith(
        'Failed to revoke server session',
        expect.any(Object),
      );
    });

    it('stops periodic validation on logout', async () => {
      vi.mocked(deps.storage.get).mockResolvedValue({ token: 'tok-1', userId: 'user-1' });
      global.fetch = mockFetchResponse({ valid: true });

      await manager.initialize();
      expect(manager.isAuthenticated()).toBe(true);

      // Logout — this should stop the periodic validation interval
      global.fetch = mockFetchResponse({ success: true });
      await manager.logout();

      // Set up a spy to detect any further fetch calls after logout
      const postLogoutFetch = vi.fn();
      global.fetch = postLogoutFetch;

      // Advance past the validation interval — should NOT trigger any fetch
      await vi.advanceTimersByTimeAsync(AuthManager.VALIDATION_INTERVAL_MS + 100);

      expect(postLogoutFetch).not.toHaveBeenCalled();
    });

    it('handles logout when not authenticated (no server call)', async () => {
      global.fetch = vi.fn();

      await manager.logout();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(manager.isAuthenticated()).toBe(false);
      expect(deps.storage.delete).toHaveBeenCalledWith('auth', 'session');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Periodic validation
  // ─────────────────────────────────────────────────────────────────────────

  describe('periodic validation', () => {
    it('logs out when periodic validation fails', async () => {
      vi.mocked(deps.storage.get).mockResolvedValue({ token: 'tok-1', userId: 'user-1' });
      global.fetch = mockFetchResponse({ valid: true });

      await manager.initialize();
      expect(manager.isAuthenticated()).toBe(true);

      // Now make validation fail
      global.fetch = mockFetchResponse({ valid: false }, 401);

      // Advance past the validation interval
      await vi.advanceTimersByTimeAsync(AuthManager.VALIDATION_INTERVAL_MS + 100);

      expect(manager.isAuthenticated()).toBe(false);
      expect(deps.logger.warn).toHaveBeenCalledWith('Periodic validation: token revoked or expired');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // isAuthenticated()
  // ─────────────────────────────────────────────────────────────────────────

  describe('isAuthenticated()', () => {
    it('returns false when neither token nor userId is set', () => {
      expect(manager.isAuthenticated()).toBe(false);
    });

    it('returns true only when both token and userId are set', async () => {
      await manager.handleAuthSuccess('tok-1', 'user-1');
      expect(manager.isAuthenticated()).toBe(true);
    });

    it('returns false after logout', async () => {
      await manager.handleAuthSuccess('tok-1', 'user-1');
      global.fetch = mockFetchResponse({ success: true });
      await manager.logout();
      expect(manager.isAuthenticated()).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getUserId() and getToken()
  // ─────────────────────────────────────────────────────────────────────────

  describe('getUserId() and getToken()', () => {
    it('return null before authentication', () => {
      expect(manager.getUserId()).toBeNull();
      expect(manager.getToken()).toBeNull();
    });

    it('return correct values after authentication', async () => {
      await manager.handleAuthSuccess('secret-token', 'user-abc');
      expect(manager.getUserId()).toBe('user-abc');
      expect(manager.getToken()).toBe('secret-token');
    });

    it('return null after logout', async () => {
      await manager.handleAuthSuccess('secret-token', 'user-abc');
      global.fetch = mockFetchResponse({ success: true });
      await manager.logout();
      expect(manager.getUserId()).toBeNull();
      expect(manager.getToken()).toBeNull();
    });
  });
});
