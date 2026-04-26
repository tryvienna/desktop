/**
 * Auth Harness Fixture — extends auth-flow with reusable auth actions.
 *
 * Provides a single `authHarness` fixture with methods:
 *   - signup(opts?) — full signup flow through web browser
 *   - login(opts) — full login flow through web browser
 *   - logout() — clear auth state
 *   - ensureUnauthenticated() — verify/force unauthenticated state
 *   - ensureAuthenticated(user?) — signup if needed, return auth info
 *   - generateUser(overrides?) — create a unique TestUser identity
 *
 * On failure, automatically attaches screenshots + console logs to the
 * Playwright test report for debugging.
 *
 * Usage:
 *   import { test, expect } from './fixtures/auth-harness';
 *   test('my test', async ({ authHarness, page }) => {
 *     const auth = await authHarness.ensureAuthenticated();
 *     await authHarness.logout();
 *   });
 */

import { test as authFlowTest } from './auth-flow';
import {
  signup as signupAction,
  login as loginAction,
  logout as logoutAction,
  ensureUnauthenticated as ensureUnauthenticatedAction,
  ensureAuthenticated as ensureAuthenticatedAction,
  type AuthDeps,
  type AuthInfo,
} from '../helpers/auth-actions';
import { generateTestUser, type TestUser } from '../helpers/test-user';

export interface AuthHarness {
  /** Perform a full signup through the web browser. Returns auth info. */
  signup(opts?: { user?: TestUser; timeout?: number }): Promise<AuthInfo>;
  /** Perform a full login through the web browser. Returns auth info. */
  login(opts: { email: string; password: string; timeout?: number }): Promise<AuthInfo>;
  /** Logout from the desktop app. Waits for AuthGate to appear. */
  logout(timeout?: number): Promise<void>;
  /** Ensure the app is unauthenticated. Logs out if needed. */
  ensureUnauthenticated(): Promise<void>;
  /** Ensure the app is authenticated. Signs up a fresh user if needed. */
  ensureAuthenticated(user?: TestUser): Promise<AuthInfo>;
  /** Generate a unique test user identity. */
  generateUser(overrides?: Partial<TestUser>): TestUser;
  /** Console logs captured from the Electron renderer during this test. */
  readonly consoleLogs: readonly string[];
}

type AuthHarnessFixtures = {
  authHarness: AuthHarness;
};

export const test = authFlowTest.extend<AuthHarnessFixtures>({
  authHarness: async ({ electronApp, page, webPage, capturedAuthUrl }, use, testInfo) => {
    // ── Capture renderer console output ──
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      consoleLogs.push(`[error] ${err.message}`);
    });

    // ── Build dependency bag for action functions ──
    const deps: AuthDeps = { electronApp, page, webPage, capturedAuthUrl };

    // ── Screenshot wrapper for debugging failures ──
    async function withErrorCapture<T>(name: string, fn: () => Promise<T>): Promise<T> {
      try {
        return await fn();
      } catch (error) {
        // Best-effort screenshots from both pages
        for (const [label, p] of [['electron', page], ['web', webPage]] as const) {
          if (!p.isClosed()) {
            try {
              const shot = await p.screenshot({ fullPage: true, timeout: 5_000 });
              await testInfo.attach(`${name}-failure-${label}`, {
                body: shot,
                contentType: 'image/png',
              });
            } catch {
              /* page may have closed */
            }
          }
        }
        if (consoleLogs.length > 0) {
          await testInfo.attach(`${name}-console-logs`, {
            body: consoleLogs.join('\n'),
            contentType: 'text/plain',
          });
        }
        throw error;
      }
    }

    // ── Harness object ──
    const harness: AuthHarness = {
      signup: (opts) =>
        withErrorCapture('signup', () =>
          signupAction(deps, { user: opts?.user ?? generateTestUser(), timeout: opts?.timeout }),
        ),

      login: (opts) =>
        withErrorCapture('login', () => loginAction(deps, opts)),

      logout: (timeout) =>
        withErrorCapture('logout', () => logoutAction(deps, timeout)),

      ensureUnauthenticated: () =>
        withErrorCapture('ensureUnauthenticated', () => ensureUnauthenticatedAction(deps)),

      ensureAuthenticated: (user) =>
        withErrorCapture('ensureAuthenticated', () => ensureAuthenticatedAction(deps, user)),

      generateUser: (overrides) => generateTestUser(overrides),

      get consoleLogs() {
        return consoleLogs;
      },
    };

    await use(harness);

    // ── Attach console logs on test failure ──
    if (testInfo.status !== testInfo.expectedStatus && consoleLogs.length > 0) {
      await testInfo.attach('final-console-logs', {
        body: consoleLogs.join('\n'),
        contentType: 'text/plain',
      });
    }
  },
});

export { expect } from '@playwright/test';
