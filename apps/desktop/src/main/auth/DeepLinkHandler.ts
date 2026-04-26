/**
 * DeepLinkHandler — Handles vienna:// and vienna-dev:// protocol URLs.
 *
 * Routes:
 *   - `vienna://auth/callback?code=...` — OAuth auth code exchange
 *   - `vienna://plugin/install?repo=...&dir=...&name=...&slug=...` — Install a plugin from GitHub
 *   - `vienna://profile/<git-url>` — Fork a content profile from a git repo
 *
 * The auth code is then exchanged for a JWT via the /api/auth/exchange endpoint.
 */

import type { MainLogger } from '@vienna/logger/main';

export interface AuthCallbackResult {
  code?: string;
  userId?: string;
  state?: string;
  error?: string;
}

export interface PluginInstallParams {
  repo: string;
  dir: string;
  name: string;
  slug: string;
}

export class DeepLinkHandler {
  private pendingAuthState: string | null = null;
  private onProfileFork: ((gitUrl: string) => void | Promise<void>) | null = null;
  private onPluginInstall: ((params: PluginInstallParams) => void | Promise<void>) | null = null;

  constructor(
    private readonly logger: MainLogger,
    private readonly onAuthCallback: (result: AuthCallbackResult) => void | Promise<void>,
    private readonly allowedSchemes: string[],
  ) {}

  /**
   * Set the callback for profile fork deep links.
   * Called after ContentProfileManager is ready.
   */
  setOnProfileFork(handler: (gitUrl: string) => void | Promise<void>): void {
    this.onProfileFork = handler;
  }

  /**
   * Set the callback for plugin install deep links.
   * Called after PluginInstaller is ready.
   */
  setOnPluginInstall(handler: (params: PluginInstallParams) => void | Promise<void>): void {
    this.onPluginInstall = handler;
  }

  /**
   * Set the CSRF state token before opening the browser.
   * Must be called before `handleUrl` to validate callbacks.
   */
  setPendingAuthState(state: string): void {
    this.pendingAuthState = state;
  }

  /**
   * Handle an incoming deep link URL.
   * Routes by path and delegates to the appropriate handler.
   */
  async handleUrl(urlString: string): Promise<void> {
    this.logger.info('Deep link received', { url: urlString });

    let url: URL;
    try {
      url = new URL(urlString);
    } catch {
      this.logger.error('Invalid deep link URL', { url: urlString });
      return;
    }

    // Validate scheme
    const scheme = url.protocol.replace(/:$/, '');
    if (!this.allowedSchemes.includes(scheme)) {
      this.logger.error('Unknown deep link scheme', { scheme, allowedSchemes: this.allowedSchemes });
      return;
    }

    // Route by path (host is empty for custom protocols, path includes host)
    const fullPath = `${url.host}${url.pathname}`.replace(/\/$/, '');

    switch (true) {
      case fullPath === 'auth/callback':
        await this.handleAuthCallback(url);
        break;
      case fullPath === 'plugin/install':
        await this.handlePluginInstall(url);
        break;
      case fullPath.startsWith('profile/'):
        await this.handleProfileFork(fullPath);
        break;
      default:
        this.logger.warn('Unhandled deep link path', { path: fullPath });
    }
  }

  private async handleAuthCallback(url: URL): Promise<void> {
    const code = url.searchParams.get('code');
    const userId = url.searchParams.get('userId');
    const state = url.searchParams.get('state');

    // Validate CSRF state
    if (!state || state !== this.pendingAuthState) {
      this.logger.error('Auth callback state mismatch', {
        securityEvent: 'CSRF_TOKEN_MISMATCH',
        receivedState: state,
        expectedState: this.pendingAuthState,
      });
      await this.onAuthCallback({ error: 'Security validation failed: state mismatch' });
      return;
    }

    // Clear pending state (single-use)
    this.pendingAuthState = null;

    if (!code || !userId) {
      this.logger.error('Auth callback missing code or userId');
      await this.onAuthCallback({ error: 'Missing code or userId in callback' });
      return;
    }

    this.logger.info('Auth callback validated', { userId });
    await this.onAuthCallback({ code, userId, state });
  }

  /**
   * Handle a plugin install deep link.
   *
   * URL format: vienna://plugin/install?repo=<repoUrl>&dir=<sourceDir>&name=<name>&slug=<slug>
   */
  private async handlePluginInstall(url: URL): Promise<void> {
    const repo = url.searchParams.get('repo');
    const dir = url.searchParams.get('dir');
    const name = url.searchParams.get('name');
    const slug = url.searchParams.get('slug');

    if (!repo || !slug) {
      this.logger.error('Plugin install deep link missing required params', {
        repo, dir, name, slug,
      });
      return;
    }

    // Validate repo URL is https
    if (!repo.startsWith('https://')) {
      this.logger.error('Plugin install deep link has invalid repo URL', { repo });
      return;
    }

    this.logger.info('Plugin install deep link received', { repo, dir, name, slug });

    if (!this.onPluginInstall) {
      this.logger.warn('Plugin install handler not set — ignoring deep link');
      return;
    }

    await this.onPluginInstall({
      repo,
      dir: dir ?? '',
      name: name ?? slug,
      slug,
    });
  }

  /**
   * Handle a profile fork deep link.
   *
   * URL format: vienna://profile/github.com/user/repo
   * Reconstructed git URL: https://github.com/user/repo.git
   */
  /**
   * Allowed git hosts for profile deep links.
   * Only well-known forges are accepted to prevent drive-by cloning from arbitrary servers.
   */
  private static readonly ALLOWED_GIT_HOSTS = new Set([
    'github.com',
    'gitlab.com',
  ]);

  private async handleProfileFork(fullPath: string): Promise<void> {
    // Extract the git host + path after "profile/"
    const gitPath = fullPath.slice('profile/'.length);
    if (!gitPath || gitPath.length < 5) {
      this.logger.error('Profile deep link missing git URL', { path: fullPath });
      return;
    }

    // Validate structure: host/owner/repo — no port, query, auth, or extra segments
    const segments = gitPath.replace(/\.git$/, '').split('/');
    if (segments.length !== 3) {
      this.logger.error('Profile deep link has invalid path structure', { path: fullPath });
      return;
    }

    const [host, owner, repo] = segments;
    if (!DeepLinkHandler.ALLOWED_GIT_HOSTS.has(host)) {
      this.logger.error('Profile deep link host not allowed', { host, path: fullPath });
      return;
    }

    if (!owner || !repo || /[^a-zA-Z0-9._-]/.test(owner) || /[^a-zA-Z0-9._-]/.test(repo)) {
      this.logger.error('Profile deep link has invalid owner/repo', { path: fullPath });
      return;
    }

    const gitUrl = `https://${host}/${owner}/${repo}.git`;

    this.logger.info('Profile fork deep link received', { gitUrl });

    if (!this.onProfileFork) {
      this.logger.warn('Profile fork handler not set — ignoring deep link');
      return;
    }

    await this.onProfileFork(gitUrl);
  }
}
