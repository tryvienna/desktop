/**
 * OAuth IPC Handlers — Main process implementation
 *
 * Wires OAuth IPC methods to OAuthManager.
 * Flow start/submit operations are stubs until flow implementations
 * (callback server, device code poller) are added.
 */

import type { ApiHandlers } from '@vienna/ipc';
import type { OAuthManager } from '../../main/integrations/OAuthManager';
import type { oauthApi } from './contract';

export interface OAuthHandlerDeps {
  oauthManager: OAuthManager;
}

export function createOAuthHandlers(
  deps: OAuthHandlerDeps,
): ApiHandlers<typeof oauthApi> {
  const { oauthManager } = deps;

  return {
    oauth: {
      startFlow: async ({ integrationId, providerId }) => {
        try {
          const result = await oauthManager.startFlow(integrationId, providerId);
          return { success: true, authorizationUrl: result.authorizationUrl };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },

      getStatus: async ({ integrationId }) => {
        try {
          const providers = await oauthManager.getStatus(integrationId);
          return { success: true, providers };
        } catch (err) {
          return {
            success: false,
            providers: [],
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },

      revokeToken: async ({ integrationId, providerId }) => {
        try {
          await oauthManager.revokeToken(integrationId, providerId);
          return { success: true };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },

      submitCode: async ({ integrationId: _integrationId, providerId: _providerId, code: _code }) => {
        // Manual code submission requires token exchange (Phase 6+)
        return { success: false, error: 'Manual code submission not yet implemented' };
      },

      refreshToken: async ({ integrationId, providerId }) => {
        try {
          const registration = oauthManager.getRegistration(integrationId);
          if (!registration) {
            return { success: false, error: `No OAuth registration for '${integrationId}'` };
          }
          const provider = registration.config.providers.find(
            (p: { providerId: string }) => p.providerId === providerId,
          );
          const flow = provider?.flow;
          const tokenUrl = flow && 'tokenUrl' in flow ? (flow as { tokenUrl: string }).tokenUrl : '';
          const clientId = flow && 'clientId' in flow ? (flow as { clientId: string }).clientId : '';
          if (!tokenUrl || !clientId) {
            return { success: false, error: 'Missing tokenUrl or clientId in OAuth provider config' };
          }
          const clientSecret = flow && 'clientSecret' in flow
            ? (flow as { clientSecret?: string }).clientSecret
            : undefined;
          const result = await oauthManager.refreshToken(
            integrationId,
            providerId,
            tokenUrl,
            clientId,
            clientSecret,
          );
          if (result) {
            return { success: true, expiresAt: result.expiresAt };
          }
          return { success: false, error: 'Token refresh failed' };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
  };
}
