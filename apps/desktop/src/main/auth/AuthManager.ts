/**
 * AuthManager — Central auth coordinator for the main process.
 *
 * Manages authentication state using @vienna/secure-storage for
 * encrypted token persistence and provides getters for userId/token
 * used by GraphQL context and IPC handlers.
 *
 * Validates tokens against the web backend on startup and periodically,
 * and revokes server-side sessions on logout.
 */

import type { SecureStorage } from '@vienna/secure-storage';
import type { MainLogger } from '@vienna/logger/main';

interface StoredSession {
  token: string;
  userId: string;
  email?: string;
}

/** Emitter interface matching createEmitter() output for the auth events group */
export interface AuthEventEmitter {
  onAuthStateChanged: (payload: { isAuthenticated: boolean; userId: string | null; email?: string | null }) => void;
}

export interface AuthManagerDeps {
  storage: SecureStorage;
  logger: MainLogger;
  emitter: AuthEventEmitter;
  webUrl: string;
}

export type AuthStateListener = (state: { isAuthenticated: boolean; userId: string | null; email: string | null }) => void;

export class AuthManager {
  private userId: string | null = null;
  private email: string | null = null;
  private token: string | null = null;
  private readonly storage: SecureStorage;
  private logger: MainLogger;
  private readonly emitter: AuthEventEmitter;
  private readonly webUrl: string;
  private validationInterval: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<AuthStateListener>();

  static readonly VALIDATION_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

  constructor(deps: AuthManagerDeps) {
    this.storage = deps.storage;
    this.logger = deps.logger;
    this.emitter = deps.emitter;
    this.webUrl = deps.webUrl;
  }

  /**
   * Load stored session from SecureStorage on startup.
   * Validates the token against the server; clears if invalid.
   * Call once during app initialization.
   */
  async initialize(): Promise<void> {
    try {
      const stored = await this.storage.get<StoredSession>('auth', 'session');
      if (stored?.token && stored?.userId) {
        this.token = stored.token;
        this.userId = stored.userId;
        // Extract email from stored session or fall back to JWT payload
        // (sessions saved before the email field was added won't have it stored)
        this.email = stored.email ?? AuthManager.extractEmailFromJwt(stored.token);
        this.logger.info('Auth session restored from storage', { userId: this.userId, hasEmail: !!this.email });

        // Validate token against server on startup
        const valid = await this.validateToken();
        if (!valid) {
          this.logger.warn('Stored token is no longer valid, clearing session');
          this.token = null;
          this.userId = null;
          this.email = null;
          await this.storage.delete('auth', 'session');
          const state = { isAuthenticated: false, userId: null, email: null };
          this.emitter.onAuthStateChanged(state);
          this.notifyListeners(state);
          return;
        }
      } else {
        this.logger.info('No stored auth session found');
      }
    } catch (err) {
      this.logger.warn('Failed to load auth session from storage', { error: err });
    }

    this.startPeriodicValidation();
  }

  /**
   * Validate the current token against the web backend.
   * Returns true on network failure (offline tolerance).
   */
  async validateToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      const res = await fetch(`${this.webUrl}/api/auth/validate`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      const data = (await res.json()) as { valid?: boolean };
      if (data.valid !== true) {
        this.logger.warn('Token validation returned invalid', {
          status: res.status,
          response: data,
          webUrl: this.webUrl,
        });
      }
      return data.valid === true;
    } catch (err) {
      this.logger.warn('Token validation request failed (network error)', { error: err });
      return true; // Tolerate network failures — don't log out offline users
    }
  }

  /**
   * Store new auth credentials after successful login/signup.
   * Called after auth code exchange completes.
   */
  async handleAuthSuccess(token: string, userId: string, email?: string): Promise<void> {
    this.token = token;
    this.userId = userId;
    this.email = email ?? null;
    await this.storage.set('auth', 'session', { token, userId, email });
    this.logger.info('Auth session stored', { userId });
    const state = { isAuthenticated: true, userId, email: this.email };
    this.emitter.onAuthStateChanged(state);
    this.notifyListeners(state);
  }

  /**
   * Clear stored credentials on logout.
   * Revokes the server-side session first if possible.
   */
  async logout(): Promise<void> {
    const token = this.token;
    const userId = this.userId;

    // Stop periodic validation — no session to validate
    this.stopPeriodicValidation();

    // Revoke server-side session
    if (token) {
      try {
        await fetch(`${this.webUrl}/api/auth/revoke`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        this.logger.warn('Failed to revoke server session', { error: err });
      }
    }

    this.token = null;
    this.userId = null;
    this.email = null;
    await this.storage.delete('auth', 'session');
    this.logger.info('Auth session cleared', { userId });
    const state = { isAuthenticated: false, userId: null, email: null };
    this.emitter.onAuthStateChanged(state);
    this.notifyListeners(state);
  }

  /** Subscribe to auth state changes from within the main process. */
  onAuthStateChanged(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(state: { isAuthenticated: boolean; userId: string | null }): void {
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  getUserId(): string | null {
    return this.userId;
  }

  getEmail(): string | null {
    return this.email;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.userId !== null && this.token !== null;
  }

  private startPeriodicValidation(): void {
    // Guard: stop any existing interval before starting a new one
    this.stopPeriodicValidation();

    this.validationInterval = setInterval(async () => {
      if (!this.token) return;
      const valid = await this.validateToken();
      if (!valid) {
        this.logger.warn('Periodic validation: token revoked or expired');
        await this.logout();
      }
    }, AuthManager.VALIDATION_INTERVAL_MS);
    if (this.validationInterval.unref) this.validationInterval.unref();
  }

  /** Replace the logger instance (e.g. after profile resolution provides a real logger). */
  setLogger(newLogger: MainLogger): void {
    this.logger = newLogger;
  }

  stopPeriodicValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
  }

  /**
   * Extract email from a JWT payload without verifying the signature.
   * Used to recover email from tokens stored before the email field was persisted.
   */
  private static extractEmailFromJwt(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf-8')) as { email?: string };
      return payload.email ?? null;
    } catch {
      return null;
    }
  }
}
