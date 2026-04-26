import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeepLinkHandler } from './DeepLinkHandler';
import type { AuthCallbackResult } from './DeepLinkHandler';
import type { MainLogger } from '@vienna/logger/main';

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

describe('DeepLinkHandler', () => {
  let logger: MainLogger;
  let onAuthCallback: ReturnType<typeof vi.fn<(result: AuthCallbackResult) => void>>;
  let handler: DeepLinkHandler;
  const allowedSchemes = ['vienna', 'vienna-dev'];

  beforeEach(() => {
    logger = createMockLogger();
    onAuthCallback = vi.fn();
    handler = new DeepLinkHandler(logger, onAuthCallback, allowedSchemes);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Valid auth callback
  // ─────────────────────────────────────────────────────────────────────────

  describe('valid auth callback', () => {
    it('succeeds with matching CSRF state', async () => {
      handler.setPendingAuthState('csrf-token-123');

      await handler.handleUrl(
        'vienna://auth/callback?code=my-code&userId=user-1&state=csrf-token-123',
      );

      expect(onAuthCallback).toHaveBeenCalledWith({
        code: 'my-code',
        userId: 'user-1',
        state: 'csrf-token-123',
      });
      expect(logger.info).toHaveBeenCalledWith('Auth callback validated', { userId: 'user-1' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CSRF state validation
  // ─────────────────────────────────────────────────────────────────────────

  describe('CSRF state validation', () => {
    it('rejects callback with mismatched CSRF state', async () => {
      handler.setPendingAuthState('expected-state');

      await handler.handleUrl(
        'vienna://auth/callback?code=c&userId=uid&state=wrong-state',
      );

      expect(onAuthCallback).toHaveBeenCalledWith({
        error: 'Security validation failed: state mismatch',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Auth callback state mismatch',
        expect.objectContaining({ securityEvent: 'CSRF_TOKEN_MISMATCH' }),
      );
    });

    it('rejects callback with missing state parameter', async () => {
      handler.setPendingAuthState('expected-state');

      await handler.handleUrl('vienna://auth/callback?code=c&userId=uid');

      expect(onAuthCallback).toHaveBeenCalledWith({
        error: 'Security validation failed: state mismatch',
      });
    });

    it('rejects callback when no pending state has been set', async () => {
      await handler.handleUrl(
        'vienna://auth/callback?code=c&userId=uid&state=some-state',
      );

      expect(onAuthCallback).toHaveBeenCalledWith({
        error: 'Security validation failed: state mismatch',
      });
    });

    it('clears CSRF state after successful validation (single-use)', async () => {
      handler.setPendingAuthState('one-time-state');

      // First call succeeds
      await handler.handleUrl(
        'vienna://auth/callback?code=c&userId=uid&state=one-time-state',
      );
      expect(onAuthCallback).toHaveBeenCalledWith({
        code: 'c',
        userId: 'uid',
        state: 'one-time-state',
      });

      // Second call with same state fails (state was cleared)
      onAuthCallback.mockClear();
      await handler.handleUrl(
        'vienna://auth/callback?code=c&userId=uid&state=one-time-state',
      );
      expect(onAuthCallback).toHaveBeenCalledWith({
        error: 'Security validation failed: state mismatch',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Missing code or userId
  // ─────────────────────────────────────────────────────────────────────────

  describe('missing code or userId', () => {
    it('rejects callback with missing code', async () => {
      handler.setPendingAuthState('state-1');

      await handler.handleUrl('vienna://auth/callback?userId=uid&state=state-1');

      expect(onAuthCallback).toHaveBeenCalledWith({
        error: 'Missing code or userId in callback',
      });
      expect(logger.error).toHaveBeenCalledWith('Auth callback missing code or userId');
    });

    it('rejects callback with missing userId', async () => {
      handler.setPendingAuthState('state-1');

      await handler.handleUrl('vienna://auth/callback?code=c&state=state-1');

      expect(onAuthCallback).toHaveBeenCalledWith({
        error: 'Missing code or userId in callback',
      });
    });

    it('rejects callback with both code and userId missing', async () => {
      handler.setPendingAuthState('state-1');

      await handler.handleUrl('vienna://auth/callback?state=state-1');

      expect(onAuthCallback).toHaveBeenCalledWith({
        error: 'Missing code or userId in callback',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Unknown deep link path
  // ─────────────────────────────────────────────────────────────────────────

  describe('unknown deep link path', () => {
    it('triggers a warning log', async () => {
      await handler.handleUrl('vienna://some/other/path');

      expect(logger.warn).toHaveBeenCalledWith('Unhandled deep link path', {
        path: 'some/other/path',
      });
      expect(onAuthCallback).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invalid URL
  // ─────────────────────────────────────────────────────────────────────────

  describe('invalid URL', () => {
    it('is handled gracefully', async () => {
      await handler.handleUrl('not-a-valid-url');

      expect(logger.error).toHaveBeenCalledWith('Invalid deep link URL', {
        url: 'not-a-valid-url',
      });
      expect(onAuthCallback).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Unknown scheme
  // ─────────────────────────────────────────────────────────────────────────

  describe('unknown scheme', () => {
    it('is rejected with an error log', async () => {
      await handler.handleUrl('badscheme://auth/callback?code=c&userId=uid&state=s');

      expect(logger.error).toHaveBeenCalledWith('Unknown deep link scheme', {
        scheme: 'badscheme',
        allowedSchemes,
      });
      expect(onAuthCallback).not.toHaveBeenCalled();
    });
  });
});
