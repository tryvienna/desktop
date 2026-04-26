/**
 * OAuthManager — Consolidated OAuth flow management.
 *
 * Merges OAuthTokenManager, OAuthFlowManager, OAuthCallbackServer,
 * DeviceCodePoller, and OAuthIpcManager into a single class with
 * a clean public API. Internal flow mechanics are private.
 */

import * as http from 'node:http';
import * as crypto from 'node:crypto';
import type {
  SecureStorage as EntitySecureStorage,
  OAuthConfig,
  OAuthAuthorizationCodeConfig,
  OAuthTokenData,
  OAuthAccessor,
  PluginLogger,
} from '@tryvienna/sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Public Types
// ─────────────────────────────────────────────────────────────────────────────

export type OAuthFlowStatus =
  | 'idle'
  | 'awaiting_callback'
  | 'awaiting_device_code'
  | 'awaiting_manual_code'
  | 'exchanging_token';

export interface OAuthProviderStatus {
  providerId: string;
  displayName: string;
  connected: boolean;
  expiresAt?: number;
  scopes?: string[];
  flowStatus: OAuthFlowStatus;
  required: boolean;
}

export interface FlowStartResult {
  userCode?: string;
  verificationUri?: string;
  instructions?: string;
  authorizationUrl?: string;
}

export type FlowCompletedCallback = (integrationId: string, providerId: string) => void | Promise<void>;

export interface OAuthManagerDeps {
  logger: PluginLogger;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Storage Key
// ─────────────────────────────────────────────────────────────────────────────

function tokenStorageKey(providerId: string): string {
  return `oauth_${providerId}_tokens`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level refresh deduplication (prevents rotating token errors)
// ─────────────────────────────────────────────────────────────────────────────

const refreshInFlight = new Map<string, Promise<OAuthTokenData | null>>();

// ─────────────────────────────────────────────────────────────────────────────
// OAuthManager
// ─────────────────────────────────────────────────────────────────────────────

export class OAuthManager {
  private registrations = new Map<string, { config: OAuthConfig; storage: EntitySecureStorage }>();
  private activeFlows = new Map<string, { status: OAuthFlowStatus; cancel?: () => void }>();
  /** Track active callback servers so we can force-close them before starting a new flow. */
  private callbackServers = new Map<string, http.Server>();
  private flowCompletedCallbacks: FlowCompletedCallback[] = [];
  private readonly logger: PluginLogger;

  constructor(deps: OAuthManagerDeps) {
    this.logger = deps.logger;
  }

  // ── Registration ─────────────────────────────────────────────────────

  /** Register an integration's OAuth config for flow management. */
  register(integrationId: string, config: OAuthConfig, storage: EntitySecureStorage): void {
    this.registrations.set(integrationId, { config, storage });
  }

  /** Unregister and cancel any active flows. */
  unregister(integrationId: string): void {
    // Cancel all active flows for this integration
    for (const [key, flow] of this.activeFlows) {
      if (key.startsWith(`${integrationId}:`)) {
        flow.cancel?.();
        this.activeFlows.delete(key);
      }
    }
    this.registrations.delete(integrationId);
  }

  /** Get a registration by integration ID (for resolving OAuth config). */
  getRegistration(integrationId: string) {
    return this.registrations.get(integrationId) ?? null;
  }

  // ── Token Operations ─────────────────────────────────────────────────

  /** Get an access token, proactively refreshing if expired or expiring. */
  async getAccessToken(integrationId: string, providerId: string): Promise<string | null> {
    const reg = this.registrations.get(integrationId);
    if (!reg) return null;

    const data = await this.getTokenData(reg.storage, providerId);
    if (!data?.accessToken) return null;

    // Proactive refresh if expired/expiring
    const provider = reg.config.providers.find(
      (p: { providerId: string }) => p.providerId === providerId,
    );
    const bufferMs = (provider?.refreshBufferSeconds ?? 300) * 1000;

    if (this.isExpiredOrExpiring(data, bufferMs) && data.refreshToken) {
      const flow = provider?.flow;
      const tokenUrl = flow && 'tokenUrl' in flow ? flow.tokenUrl : undefined;
      const clientId = flow && 'clientId' in flow ? flow.clientId : undefined;
      const clientSecret = flow && 'clientSecret' in flow
        ? (flow as { clientSecret?: string }).clientSecret
        : undefined;

      if (tokenUrl && clientId) {
        try {
          const refreshed = await this.refreshToken(
            integrationId,
            providerId,
            tokenUrl,
            clientId,
            clientSecret,
          );
          if (refreshed) return refreshed.accessToken;
        } catch (err) {
          this.logger.warn(`Token refresh failed for ${integrationId}:${providerId}, falling back to existing token`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    return data.accessToken;
  }

  /** Get full token data for a provider. */
  async getTokenData(storage: EntitySecureStorage, providerId: string): Promise<OAuthTokenData | null> {
    const raw = await storage.get(tokenStorageKey(providerId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as OAuthTokenData;
    } catch (err) {
      this.logger.warn(`Corrupted OAuth token data for provider '${providerId}'`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /** Store token data for a provider. */
  async storeTokenData(storage: EntitySecureStorage, providerId: string, data: OAuthTokenData): Promise<void> {
    await storage.set(tokenStorageKey(providerId), JSON.stringify(data));
  }

  /** Delete token data (revoke). */
  async revokeToken(integrationId: string, providerId: string): Promise<void> {
    const reg = this.registrations.get(integrationId);
    if (!reg) return;
    await reg.storage.delete(tokenStorageKey(providerId));
  }

  /** Refresh a token with dedup to prevent rotating token errors. */
  async refreshToken(
    integrationId: string,
    providerId: string,
    tokenUrl: string,
    clientId: string,
    clientSecret?: string,
  ): Promise<OAuthTokenData | null> {
    const dedupKey = `${integrationId}:${providerId}`;

    // Return existing in-flight refresh
    const existing = refreshInFlight.get(dedupKey);
    if (existing) return existing;

    const reg = this.registrations.get(integrationId);
    if (!reg) return null;

    const promise = this.doRefreshToken(reg.storage, providerId, tokenUrl, clientId, clientSecret);
    refreshInFlight.set(dedupKey, promise);

    try {
      return await promise;
    } finally {
      refreshInFlight.delete(dedupKey);
    }
  }

  // ── OAuth Accessor Factory ───────────────────────────────────────────

  /**
   * Create an OAuthAccessor for use in AuthContext.
   * Provides getAccessToken, getTokenData, isAuthenticated.
   */
  createAccessor(integrationId: string): OAuthAccessor | undefined {
    const reg = this.registrations.get(integrationId);
    if (!reg) return undefined;

    const providerIds = new Set(
      reg.config.providers.map((p: { providerId: string }) => p.providerId),
    );

    return {
      getAccessToken: async (providerId: string) => {
        if (!providerIds.has(providerId)) return null;
        return this.getAccessToken(integrationId, providerId);
      },
      getTokenData: async (providerId: string) => {
        if (!providerIds.has(providerId)) return null;
        return this.getTokenData(reg.storage, providerId);
      },
      isAuthenticated: async (providerId: string) => {
        if (!providerIds.has(providerId)) return false;
        const data = await this.getTokenData(reg.storage, providerId);
        return data?.accessToken != null;
      },
    };
  }

  // ── Flow Operations ──────────────────────────────────────────────────

  /**
   * Start an OAuth authorization_code flow.
   * Opens the browser, starts a local callback server, waits for the code,
   * exchanges it for tokens, stores them, and notifies listeners.
   */
  async startFlow(integrationId: string, providerId: string): Promise<FlowStartResult> {
    const reg = this.registrations.get(integrationId);
    if (!reg) throw new Error(`No OAuth registration for '${integrationId}'`);

    const provider = reg.config.providers.find((p) => p.providerId === providerId);
    if (!provider) throw new Error(`No OAuth provider '${providerId}' for '${integrationId}'`);

    const flow = provider.flow;
    if (flow.grantType !== 'authorization_code') {
      throw new Error(`Unsupported grant type '${flow.grantType}' — only authorization_code is implemented`);
    }

    const flowKey = `${integrationId}:${providerId}`;

    // Cancel any existing flow AND force-close any lingering callback server
    this.cancelFlow(integrationId, providerId);
    const existingServer = this.callbackServers.get(flowKey);
    if (existingServer) {
      existingServer.closeAllConnections?.();
      existingServer.close();
      this.callbackServers.delete(flowKey);
    }

    // Resolve client credentials from storage (supports clientIdKey/clientSecretKey)
    const { clientId, clientSecret } = await this.resolveClientCredentials(flow, reg.storage);
    if (!clientId) {
      throw new Error('OAuth Client ID is not configured');
    }

    // Generate PKCE if enabled
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    const pkceMethod = flow.pkce?.method ?? 'S256';
    if (flow.pkce?.enabled) {
      codeVerifier = crypto.randomBytes(32).toString('base64url');
      codeChallenge = pkceMethod === 'plain'
        ? codeVerifier
        : crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    }

    // Start local callback server
    const state = crypto.randomBytes(32).toString('hex');
    const redirectPath = flow.redirectPath ?? '/callback';
    const fixedPort = flow.redirectPort;

    const { server, port, waitForCode } = await this.startCallbackServer(
      redirectPath,
      state,
      fixedPort,
    );

    const redirectUri = `http://localhost:${port}${redirectPath}`;

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: flow.scopes.join(flow.scopeSeparator ?? ' '),
      state,
    });
    if (codeChallenge) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', pkceMethod);
    }
    if (flow.extraAuthParams) {
      for (const [k, v] of Object.entries(flow.extraAuthParams)) {
        params.set(k, v);
      }
    }
    const authorizationUrl = `${flow.authorizationUrl}?${params.toString()}`;

    // Track server for cleanup on subsequent flows
    this.callbackServers.set(flowKey, server);

    // Set flow status
    this.activeFlows.set(flowKey, {
      status: 'awaiting_callback',
      cancel: () => {
        server.closeAllConnections?.();
        server.close();
        this.callbackServers.delete(flowKey);
      },
    });

    // Open browser
    const { shell } = await import('electron');
    await shell.openExternal(authorizationUrl);

    // Wait for callback in background (don't block the IPC response)
    waitForCode.then(async (code) => {
      // Clean up server tracking
      this.callbackServers.delete(flowKey);

      // Update status
      this.activeFlows.set(flowKey, { status: 'exchanging_token' });

      // Exchange code for tokens
      const tokenData = await this.exchangeCode(flow.tokenUrl, {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      });

      // Store tokens
      await this.storeTokenData(reg.storage, providerId, tokenData);

      // Clear flow status
      this.activeFlows.delete(flowKey);

      this.logger.info(`OAuth flow completed for ${integrationId}:${providerId}`);

      // Notify listeners (triggers client refresh)
      await this.notifyFlowCompleted(integrationId, providerId);
    }).catch((err: unknown) => {
      this.callbackServers.delete(flowKey);
      this.activeFlows.delete(flowKey);
      this.logger.error(`OAuth flow failed for ${integrationId}:${providerId}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return { authorizationUrl };
  }

  /** Get the status of all OAuth providers for an integration. */
  async getStatus(integrationId: string): Promise<OAuthProviderStatus[]> {
    const reg = this.registrations.get(integrationId);
    if (!reg) return [];

    const statuses: OAuthProviderStatus[] = [];
    for (const provider of reg.config.providers) {
      const data = await this.getTokenData(reg.storage, provider.providerId);
      const flowKey = `${integrationId}:${provider.providerId}`;
      const flow = this.activeFlows.get(flowKey);

      statuses.push({
        providerId: provider.providerId,
        displayName: provider.displayName,
        connected: data?.accessToken != null,
        expiresAt: data?.expiresAt,
        scopes: data?.scopes,
        flowStatus: flow?.status ?? 'idle',
        required: provider.required ?? false,
      });
    }
    return statuses;
  }

  /** Cancel an active flow. */
  cancelFlow(integrationId: string, providerId: string): void {
    const key = `${integrationId}:${providerId}`;
    const flow = this.activeFlows.get(key);
    if (flow) {
      flow.cancel?.();
      this.activeFlows.delete(key);
    }
  }

  /** Subscribe to flow completion events. */
  onFlowCompleted(callback: FlowCompletedCallback): () => void {
    this.flowCompletedCallbacks.push(callback);
    return () => {
      this.flowCompletedCallbacks = this.flowCompletedCallbacks.filter((cb) => cb !== callback);
    };
  }

  /** Clean up all active flows and callback servers. */
  cleanup(): void {
    for (const [, flow] of this.activeFlows) {
      flow.cancel?.();
    }
    this.activeFlows.clear();
    for (const [, server] of this.callbackServers) {
      server.closeAllConnections?.();
      server.close();
    }
    this.callbackServers.clear();
  }

  // ── Private Flow Helpers ─────────────────────────────────────────────

  /**
   * Resolve client ID and secret from the flow config.
   * Supports clientIdKey/clientSecretKey to read from credential storage.
   */
  private async resolveClientCredentials(
    flow: OAuthAuthorizationCodeConfig,
    storage: EntitySecureStorage,
  ): Promise<{ clientId: string; clientSecret: string | undefined }> {
    let clientId = flow.clientId;
    let clientSecret = flow.clientSecret;

    if (flow.clientIdKey) {
      const stored = await storage.get(flow.clientIdKey);
      this.logger.debug('Resolved OAuth clientId from storage', {
        key: flow.clientIdKey,
        found: stored != null,
        length: stored?.length,
      });
      if (stored) clientId = stored;
    }
    if (flow.clientSecretKey) {
      const stored = await storage.get(flow.clientSecretKey);
      this.logger.debug('Resolved OAuth clientSecret from storage', {
        key: flow.clientSecretKey,
        found: stored != null,
        length: stored?.length,
      });
      if (stored) clientSecret = stored;
    }

    return { clientId, clientSecret };
  }

  /**
   * Start a temporary HTTP server to receive the OAuth callback.
   * Returns the server, port, and a promise that resolves with the auth code.
   */
  private startCallbackServer(
    redirectPath: string,
    expectedState: string,
    fixedPort?: number,
  ): Promise<{
    server: http.Server;
    port: number;
    waitForCode: Promise<string>;
  }> {
    return new Promise((resolveStart, rejectStart) => {
      let resolveCode: (code: string) => void;
      let rejectCode: (err: Error) => void;
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout>;

      const waitForCode = new Promise<string>((res, rej) => {
        resolveCode = res;
        rejectCode = rej;
      });

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        fn();
      };

      const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', `http://localhost`);
        if (url.pathname !== redirectPath) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        const errorDesc = url.searchParams.get('error_description');

        if (error) {
          const safeMessage = (errorDesc ?? error).replace(/[&<>"']/g, (c: string) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h3>Authorization failed</h3><p>${safeMessage}</p></body></html>`);
          server.close();
          settle(() => rejectCode(new Error(errorDesc ?? error)));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h3>Missing authorization code</h3></body></html>');
          // Don't close server or reject — could be a stale/browser prefetch request
          return;
        }

        if (state !== expectedState) {
          // Log but don't close — this could be a stale redirect from a previous flow
          this.logger.warn('Ignoring OAuth callback with mismatched state (stale redirect)', {
            expected: expectedState.slice(0, 8) + '...',
            received: (state ?? '').slice(0, 8) + '...',
          });
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h3>Stale authorization response</h3><p>Please try again — a new authorization window should have opened.</p></body></html>');
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h3>Authorization successful!</h3><p>You can close this tab.</p><script>window.close()</script></body></html>');
        server.close();
        settle(() => resolveCode(code));
      });

      server.listen(fixedPort ?? 0, '127.0.0.1', () => {
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
          rejectStart(new Error('Failed to bind callback server'));
          return;
        }
        this.logger.info(`OAuth callback server listening on port ${addr.port}`);
        resolveStart({ server, port: addr.port, waitForCode });
      });

      server.on('error', (err) => {
        rejectStart(err);
      });

      // Timeout after 5 minutes
      timeoutId = setTimeout(() => {
        server.close();
        settle(() => rejectCode(new Error('OAuth callback timeout (5 minutes)')));
      }, 300_000);
    });
  }

  /**
   * Exchange an authorization code for tokens.
   */
  private async exchangeCode(
    tokenUrl: string,
    params: Record<string, string>,
  ): Promise<OAuthTokenData> {
    const body = new URLSearchParams(params);

    // Log exchange attempt (redact secrets)
    this.logger.debug('Exchanging OAuth code for tokens', {
      tokenUrl,
      hasClientId: !!params['client_id'],
      clientIdPrefix: params['client_id']?.slice(0, 6),
      hasClientSecret: !!params['client_secret'],
      hasCodeVerifier: !!params['code_verifier'],
      hasCode: !!params['code'],
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const json = await response.json() as Record<string, unknown>;

    if (!response.ok || json['error'] || json['ok'] === false) {
      const errMsg = (json['error_description'] ?? json['error'] ?? 'Token exchange failed') as string;
      this.logger.error('OAuth token exchange failed', {
        tokenUrl,
        status: response.status,
        error: json['error'],
        errorDescription: json['error_description'],
      });
      throw new Error(errMsg);
    }

    const accessToken = json['access_token'] as string;
    if (!accessToken) throw new Error('No access_token in token response');

    return {
      accessToken,
      refreshToken: json['refresh_token'] as string | undefined,
      expiresAt: json['expires_in']
        ? Date.now() + (json['expires_in'] as number) * 1000
        : undefined,
      scopes: json['scope']
        ? (json['scope'] as string).split(/[\s,]+/)
        : undefined,
      tokenType: (json['token_type'] as string) ?? 'Bearer',
      obtainedAt: Date.now(),
    };
  }

  // ── Private Token Refresh ────────────────────────────────────────────

  private async doRefreshToken(
    storage: EntitySecureStorage,
    providerId: string,
    tokenUrl: string,
    clientId: string,
    clientSecret?: string,
  ): Promise<OAuthTokenData | null> {
    const existing = await this.getTokenData(storage, providerId);
    if (!existing?.refreshToken) return null;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: existing.refreshToken,
      client_id: clientId,
    });
    if (clientSecret) body.set('client_secret', clientSecret);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const json = await response.json() as Record<string, unknown>;

    // Handle error responses (including Slack-style { ok: false })
    if (!response.ok || json['ok'] === false || json['error']) {
      this.logger.warn(`Token refresh failed for ${providerId}`, {
        status: response.status,
        error: json['error'] ?? json['error_description'],
      });

      // Check if another caller already rotated the token
      if (response.status === 400 || response.status === 401) {
        const current = await this.getTokenData(storage, providerId);
        if (current && current.refreshToken !== existing.refreshToken) {
          return current; // Another caller already refreshed
        }
      }

      return null;
    }

    const refreshed: OAuthTokenData = {
      accessToken: json['access_token'] as string,
      refreshToken: (json['refresh_token'] as string) ?? existing.refreshToken,
      expiresAt: json['expires_in']
        ? Date.now() + (json['expires_in'] as number) * 1000
        : existing.expiresAt,
      scopes: json['scope']
        ? (json['scope'] as string).split(/[\s,]+/)
        : existing.scopes,
      tokenType: (json['token_type'] as string) ?? existing.tokenType,
      obtainedAt: Date.now(),
    };

    await this.storeTokenData(storage, providerId, refreshed);
    return refreshed;
  }

  private isExpiredOrExpiring(data: OAuthTokenData, bufferMs: number): boolean {
    if (!data.expiresAt) return false;
    return Date.now() + bufferMs >= data.expiresAt;
  }

  /** Notify all flow-completed listeners. Called by flow implementations. */
  async notifyFlowCompleted(integrationId: string, providerId: string): Promise<void> {
    for (const cb of this.flowCompletedCallbacks) {
      try {
        await cb(integrationId, providerId);
      } catch (err) {
        this.logger.error(`OAuth flow-completed listener threw for ${integrationId}:${providerId}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}
