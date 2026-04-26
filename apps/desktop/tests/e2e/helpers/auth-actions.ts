/**
 * Auth action helpers — reusable functions for E2E auth operations.
 *
 * Pure functions that accept their dependencies explicitly.
 * The auth-harness fixture binds the Playwright dependencies.
 */

import type { ElectronApplication, Page } from '@playwright/test';
import { generateTestUser, type TestUser } from './test-user';

// ── Types ──────────────────────────────────────────────────────────

export interface AuthDeps {
  electronApp: ElectronApplication;
  page: Page; // Electron renderer page
  webPage: Page; // Chromium browser page for web app
  capturedAuthUrl: () => Promise<string>;
}

export interface AuthInfo {
  userId: string;
  email: string;
}

// ── Private Helpers ────────────────────────────────────────────────

/** Reset the captured auth URL so capturedAuthUrl() polls for a fresh one. */
async function resetCapturedUrl(electronApp: ElectronApplication): Promise<void> {
  await electronApp.evaluate(async () => {
    (globalThis as Record<string, unknown>).__capturedAuthUrl = null;
  });
}

/** Get auth state from the Electron main process via IPC bridge. */
async function getAuthState(
  page: Page,
): Promise<{ isAuthenticated: boolean; userId: string | null }> {
  return page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).api;
    return api.auth.getAuthState({});
  });
}

/** Wait for the Electron renderer to show the AuthGate (unauthenticated state). */
async function waitForAuthGate(page: Page, timeout = 15_000): Promise<void> {
  await page.locator('h1').filter({ hasText: 'Vienna' }).waitFor({ timeout });
}

/** Wait for the Electron renderer to transition to authenticated state. */
async function waitForAuthenticated(page: Page, timeout = 15_000): Promise<void> {
  await page.locator('h1').filter({ hasText: 'Hello, World' }).waitFor({ timeout });
}

// ── Public Actions ─────────────────────────────────────────────────

/**
 * Perform a complete signup flow:
 * 1. Click "Create account" in Electron → triggers shell.openExternal (mocked)
 * 2. Navigate web browser to captured signup URL
 * 3. Fill signup form, submit
 * 4. Wait for web redirect chain: register → login → success → DevCallbackServer
 * 5. Wait for Electron to transition to authenticated state
 */
export async function signup(
  deps: AuthDeps,
  opts: { user: TestUser; timeout?: number },
): Promise<AuthInfo> {
  const { electronApp, page, webPage, capturedAuthUrl } = deps;
  const { user, timeout = 20_000 } = opts;

  // Reset captured URL for this fresh flow
  await resetCapturedUrl(electronApp);

  // Ensure we're on the AuthGate
  await waitForAuthGate(page);

  // Click "Create account" to trigger shell.openExternal
  await page.getByRole('button', { name: 'Create account' }).click();

  // Get the captured auth URL
  const authUrl = await capturedAuthUrl();

  // Navigate web browser to signup page
  await webPage.goto(authUrl);
  await webPage.locator('h1').filter({ hasText: 'Create your account' }).waitFor({ timeout: 10_000 });

  // Fill out the signup form
  await webPage.fill('#name', user.name);
  await webPage.fill('#email', user.email);
  await webPage.fill('#password', user.password);
  await webPage.fill('#confirmPassword', user.password);

  // Submit the form and capture webPage console for debugging
  const webConsoleLogs: string[] = [];
  webPage.on('console', (msg) => webConsoleLogs.push(`[WEB ${msg.type()}] ${msg.text()}`));
  webPage.on('pageerror', (err) => webConsoleLogs.push(`[WEB ERROR] ${err.message}`));

  await webPage.getByRole('button', { name: 'Create account' }).click();

  // Wait for the success page to load
  await webPage.waitForURL('**/auth/desktop/success**', { timeout });

  // Debug: check what the success page shows
  const successContent = await webPage.content();
  if (successContent.includes('error') || successContent.includes('Error')) {
    // eslint-disable-next-line no-console
    console.log('[SUCCESS PAGE ERRORS]', webConsoleLogs.join(' | '));
  }

  // Wait for the success page's client-side redirect to the DevCallbackServer.
  // The DesktopSuccessClient auto-redirects via window.location.href.
  // If this times out, the client component may not have hydrated.
  try {
    await webPage.waitForURL('**/auth/callback**', { timeout: 10_000 });
  } catch {
    // Debug: capture page state on redirect failure
    const url = webPage.url();
    const text = await webPage.locator('body').innerText().catch(() => '(could not read)');
    // eslint-disable-next-line no-console
    console.log('[REDIRECT FAILED]', { url, bodyText: text.substring(0, 500), webConsoleLogs });
    throw new Error(
      `Success page did not redirect to DevCallbackServer. ` +
      `Current URL: ${url}. Body: ${text.substring(0, 200)}. ` +
      `Web console: ${webConsoleLogs.join(' | ')}`,
    );
  }

  // Wait for Electron app to transition to authenticated state
  await waitForAuthenticated(page, timeout);

  // Verify and return auth info
  const state = await getAuthState(page);
  if (!state.isAuthenticated || !state.userId) {
    throw new Error('Signup completed but auth state is not authenticated');
  }

  return { userId: state.userId, email: user.email };
}

/**
 * Perform a complete login flow:
 * 1. Click "Sign in" in Electron → triggers shell.openExternal (mocked)
 * 2. Navigate web browser to captured login URL
 * 3. Fill login form, submit
 * 4. Wait for web redirect chain: signIn → success → DevCallbackServer
 * 5. Wait for Electron to transition to authenticated state
 */
export async function login(
  deps: AuthDeps,
  opts: { email: string; password: string; timeout?: number },
): Promise<AuthInfo> {
  const { electronApp, page, webPage, capturedAuthUrl } = deps;
  const { email, password, timeout = 20_000 } = opts;

  // Reset captured URL for this fresh flow
  await resetCapturedUrl(electronApp);

  // Ensure we're on the AuthGate
  await waitForAuthGate(page);

  // Click "Sign in" to trigger shell.openExternal
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Get the captured auth URL
  const authUrl = await capturedAuthUrl();

  // Clear cookies so any prior web session (e.g. from signup) doesn't auto-redirect
  await webPage.context().clearCookies();

  // Navigate web browser to login page
  await webPage.goto(authUrl);
  await webPage.locator('h1').filter({ hasText: 'Sign in to Vienna' }).waitFor({ timeout: 10_000 });

  // Fill out the login form
  await webPage.fill('#email', email);
  await webPage.fill('#password', password);

  // Submit the form
  await webPage.getByRole('button', { name: 'Sign in' }).click();

  // Wait for the web redirect chain to complete
  await webPage.waitForURL('**/auth/callback**', { timeout });

  // Wait for Electron app to transition to authenticated state
  await waitForAuthenticated(page, timeout);

  // Verify and return auth info
  const state = await getAuthState(page);
  if (!state.isAuthenticated || !state.userId) {
    throw new Error('Login completed but auth state is not authenticated');
  }

  return { userId: state.userId, email };
}

/**
 * Logout from the Electron app via IPC.
 * Waits for the AuthGate to reappear.
 */
export async function logout(
  deps: Pick<AuthDeps, 'page'>,
  timeout = 10_000,
): Promise<void> {
  const { page } = deps;

  await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).api;
    await api.auth.logout({});
  });

  await waitForAuthGate(page, timeout);
}

/**
 * Ensure the Electron app is in an unauthenticated state.
 * If currently authenticated, logs out first.
 */
export async function ensureUnauthenticated(
  deps: Pick<AuthDeps, 'page'>,
): Promise<void> {
  const { page } = deps;
  const state = await getAuthState(page);
  if (state.isAuthenticated) {
    await logout(deps);
  } else {
    await waitForAuthGate(page, 10_000);
  }
}

/**
 * Ensure the Electron app is authenticated.
 * If not authenticated, performs a full signup with a fresh test user.
 */
export async function ensureAuthenticated(
  deps: AuthDeps,
  defaultUser?: TestUser,
): Promise<AuthInfo> {
  const { page } = deps;
  const state = await getAuthState(page);
  if (state.isAuthenticated && state.userId) {
    return { userId: state.userId, email: 'existing-session' };
  }
  const user = defaultUser ?? generateTestUser();
  return signup(deps, { user });
}
