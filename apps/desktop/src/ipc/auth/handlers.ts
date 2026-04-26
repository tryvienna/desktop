/**
 * Auth IPC Handlers — Main process implementation
 *
 * Implements browser-based auth flow:
 * 1. Renderer calls auth.openBrowserAuth → opens system browser
 * 2. User logs in/signs up in browser
 * 3. Browser redirects to vienna://auth/callback (deep link)
 * 4. DeepLinkHandler validates + stores token
 * 5. Main process emits auth.onAuthStateChanged to renderer
 */

import { randomUUID } from 'node:crypto';
import { shell } from 'electron';
import type { ApiHandlers } from '@vienna/ipc';
import type { MainLogger } from '@vienna/logger/main';
import type { AuthManager } from '../../main/auth/AuthManager';
import type { DeepLinkHandler } from '../../main/auth/DeepLinkHandler';
import type { authApi } from './contract';

export interface AuthHandlerOptions {
  authManager: AuthManager;
  deepLinkHandler: DeepLinkHandler;
  webUrl: string;
  protocolScheme: string;
  localPort?: number;
  onProfileSwitch?: (message: string) => void;
}

export function createAuthHandlers(
  logger: MainLogger,
  options: AuthHandlerOptions,
): ApiHandlers<typeof authApi> {
  const { authManager, deepLinkHandler, webUrl, protocolScheme, localPort, onProfileSwitch } = options;

  return {
    auth: {
      openBrowserAuth: async ({ type }) => {
        try {
          const state = randomUUID();
          deepLinkHandler.setPendingAuthState(state);

          const path = type === 'signup' ? '/auth/desktop/signup' : '/auth/desktop/login';
          const url = new URL(path, webUrl);
          url.searchParams.set('client', 'desktop');
          url.searchParams.set('state', state);
          url.searchParams.set('scheme', protocolScheme);
          if (localPort) {
            url.searchParams.set('localPort', String(localPort));
          }

          logger.info('Opening browser for auth', { type, url: url.toString() });
          await shell.openExternal(url.toString());

          return { success: true };
        } catch (err) {
          logger.error('Failed to open browser for auth', { error: err });
          return { success: false, error: 'Failed to open browser' };
        }
      },

      getAuthState: async () => {
        return {
          isAuthenticated: authManager.isAuthenticated(),
          userId: authManager.getUserId(),
          email: authManager.getEmail(),
        };
      },

      logout: async () => {
        try {
          await authManager.logout();
          logger.info('Logout success — restarting to switch profile');
          onProfileSwitch?.('Signed out. Restarting Vienna…');
          return { success: true };
        } catch (err) {
          logger.error('Logout failed', { error: err });
          return { success: false };
        }
      },
    },
  };
}
