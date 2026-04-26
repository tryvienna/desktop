/**
 * UpdateChecker — Polls GitHub Releases for new Vienna versions.
 *
 * @ai-context
 * - Instantiated once in main process bootstrap (main.ts)
 * - Polls hellodrift/vienna-releases for the latest release
 * - Caches state so the renderer can read it cheaply via IPC
 * - Downloads DMG artifacts to temp and opens them with shell.openPath()
 * - downloadAndOpen() uses the internally cached URL — the renderer never provides a URL
 */

import { app, shell } from 'electron';
import { writeFile, readdir, unlink } from 'fs/promises';
import { join } from 'path';

const RELEASES_API = 'https://api.github.com/repos/hellodrift/vienna-releases/releases/latest';
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const INITIAL_DELAY_MS = 30 * 1000; // 30 seconds after launch
const FETCH_TIMEOUT_MS = 15_000;
const DMG_PREFIX = 'vienna-update-';

// Mock data returned when VIENNA_DEV_VERSION is set, so you can test the UI
// without a real release being newer than your local version.
const DEV_MOCK_RELEASE_NOTES = `### New

- **In-app update notifications** — Vienna now checks for new versions and shows a banner when an update is available
- **Release notes drawer** — View what's new directly inside the app before updating
- **One-click update** — Download and install updates without leaving Vienna

![Screenshot of the new update drawer](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=300&fit=crop)

### Improved

- Faster startup time on large workspaces
- Reduced memory usage when multiple workstreams are open
- Better error messages for plugin installation failures

Here's a quick demo of the new update flow:

<video controls width="100%" autoplay loop muted playsinline>
  <source src="https://tryvienna.dev/git-review.webm" type="video/webm">
  <source src="https://tryvienna.dev/git-review.mp4" type="video/mp4">
</video>

### Fixed

- Fixed an issue where sidebar would occasionally flash on theme change
- Fixed keyboard shortcuts not working after closing a drawer
- Fixed duplicate entries appearing in the command palette
`;

const DEV_MOCK_VERSION = '99.0.0';

export interface UpdateState {
  available: boolean;
  currentVersion: string;
  latestVersion: string | null;
  releaseNotes: string | null;
  downloadUrl: string | null;
  publishedAt: string | null;
}

/**
 * Compare two semver strings numerically.
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 *
 * Note: This only handles numeric MAJOR.MINOR.PATCH versions.
 * Pre-release suffixes (e.g. 1.0.0-beta.1) are not supported —
 * the non-numeric portion after '-' would produce NaN and the
 * comparison would treat the versions as equal. This is fine since
 * hellodrift/vienna-releases only publishes numeric release tags.
 */
function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Validate that a URL points to an allowed GitHub domain.
 * Checks exact match or subdomain (e.g. objects.githubusercontent.com).
 */
function isAllowedGitHubUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    const allowed = ['github.com', 'githubusercontent.com'];
    return allowed.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export class UpdateChecker {
  private currentVersion: string;
  private state: UpdateState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private initialTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor(currentVersion: string) {
    // Allow overriding version in dev to test the update flow:
    //   VIENNA_DEV_VERSION=0.0.1 pnpm dev
    this.currentVersion = process.env.VIENNA_DEV_VERSION || currentVersion;
    this.state = {
      available: false,
      currentVersion: this.currentVersion,
      latestVersion: null,
      releaseNotes: null,
      downloadUrl: null,
      publishedAt: null,
    };
  }

  /** Start periodic checking. First check after a short delay, then every intervalMs. */
  start(intervalMs = CHECK_INTERVAL_MS): void {
    // Clean up any leftover DMGs from previous update downloads
    void this.cleanupOldDmgs();

    this.initialTimerId = setTimeout(() => {
      void this.check();
      this.intervalId = setInterval(() => void this.check(), intervalMs);
    }, INITIAL_DELAY_MS);
  }

  stop(): void {
    if (this.initialTimerId) {
      clearTimeout(this.initialTimerId);
      this.initialTimerId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getState(): UpdateState {
    return { ...this.state };
  }

  async check(): Promise<UpdateState> {
    // When VIENNA_DEV_VERSION is set, return mock data for UI testing
    if (process.env.VIENNA_DEV_VERSION) {
      this.state = {
        available: true,
        currentVersion: this.currentVersion,
        latestVersion: DEV_MOCK_VERSION,
        releaseNotes: DEV_MOCK_RELEASE_NOTES,
        downloadUrl: 'https://github.com/hellodrift/vienna-releases/releases/download/v0.0.16/Vienna-0.0.16-arm64.dmg',
        publishedAt: new Date().toISOString(),
      };
      return this.getState();
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(RELEASES_API, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.getState();
      }

      const data = (await response.json()) as {
        tag_name?: string;
        body?: string;
        published_at?: string;
        assets?: Array<{ name?: string; browser_download_url?: string }>;
      };

      const tagName = data.tag_name;
      if (!tagName) return this.getState();

      const latestVersion = tagName.replace(/^v/, '');
      const dmgAsset = data.assets?.find((a) => a.name?.endsWith('.dmg'));

      this.state = {
        available: compareSemver(latestVersion, this.currentVersion) > 0,
        currentVersion: this.currentVersion,
        latestVersion,
        releaseNotes: data.body ?? null,
        downloadUrl: dmgAsset?.browser_download_url ?? null,
        publishedAt: data.published_at ?? null,
      };
    } catch {
      // Network error, timeout, parse error — silently keep previous state
    }

    return this.getState();
  }

  /**
   * Download the update DMG and open it. Uses the internally cached download URL
   * from the last successful check — the renderer never provides a URL, removing
   * the attack surface of renderer-supplied URLs entirely.
   */
  async downloadAndOpen(): Promise<{ success: boolean; error?: string }> {
    const url = this.state.downloadUrl;
    if (!url) {
      return { success: false, error: 'No download URL available' };
    }

    if (!isAllowedGitHubUrl(url)) {
      return { success: false, error: 'Invalid download URL' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min timeout for download

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `Download failed (HTTP ${response.status})` };
      }

      // Download entire DMG into memory then write to disk.
      // DMGs are typically ~150MB which fits comfortably in memory,
      // and this avoids the fragile Readable.fromWeb() type cast
      // between the web ReadableStream and Node's Readable.
      const buffer = Buffer.from(await response.arrayBuffer());
      const version = this.state.latestVersion ?? 'unknown';
      const dmgPath = join(app.getPath('temp'), `${DMG_PREFIX}${version}.dmg`);
      await writeFile(dmgPath, buffer);

      await shell.openPath(dmgPath);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      return { success: false, error: message };
    }
  }

  /** Remove any leftover vienna-update-*.dmg files from the temp directory. */
  private async cleanupOldDmgs(): Promise<void> {
    try {
      const tempDir = app.getPath('temp');
      const files = await readdir(tempDir);
      for (const file of files) {
        if (file.startsWith(DMG_PREFIX) && file.endsWith('.dmg')) {
          await unlink(join(tempDir, file)).catch(() => {});
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
