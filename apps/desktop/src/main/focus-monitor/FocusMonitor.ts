/**
 * FocusMonitor — Main-process service that polls the OS for the focused
 * application/window and dispatches enriched snapshots via a callback.
 *
 * Architecture:
 *   - Uses macOS AppleScript (System Events) to get the frontmost app + window title.
 *   - Delegates to pluggable FocusDetectors for app-specific deep inspection.
 *   - Detectors are matched by bundle ID or app name.
 *
 * @module main/focus-monitor/FocusMonitor
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FocusDetector, FocusInfo, FocusDetails } from './types';

const execFileAsync = promisify(execFile);

export interface FocusMonitorOptions {
  /** Polling interval in milliseconds. */
  intervalMs: number;
  /** Called on every focus snapshot. */
  onFocus: (info: FocusInfo) => void;
  /** Called when an error occurs during polling. */
  onError?: (error: Error) => void;
  /**
   * Predicate to identify the host app. When the focused app matches,
   * the monitor skips the update to preserve the last external snapshot.
   * This lets users interact with the host UI (e.g. click "Open") without
   * losing the previously detected app context.
   */
  isOwnApp?: (app: { appName: string; bundleId: string | null }) => boolean;
  /** Logger (optional). */
  logger?: { debug: (...args: unknown[]) => void; warn: (...args: unknown[]) => void };
}

interface FrontmostAppInfo {
  appName: string;
  bundleId: string | null;
  windowTitle: string | null;
}

export class FocusMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private detectors: FocusDetector[] = [];
  private options: FocusMonitorOptions;
  private lastSnapshot: FocusInfo | null = null;
  private polling = false;

  constructor(options: FocusMonitorOptions) {
    this.options = options;
  }

  /** Register a detector. Can be called before or after start(). */
  registerDetector(detector: FocusDetector): void {
    this.detectors.push(detector);
  }

  /** Register multiple detectors at once. */
  registerDetectors(detectors: FocusDetector[]): void {
    this.detectors.push(...detectors);
  }

  /** Start polling. No-op if already running. */
  start(): void {
    if (this.timer) return;
    this.options.logger?.debug('[FocusMonitor] Starting with interval', this.options.intervalMs, 'ms');
    // Fire immediately, then on interval
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.options.intervalMs);
  }

  /** Stop polling and clear state. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.lastSnapshot = null;
    this.options.logger?.debug('[FocusMonitor] Stopped');
  }

  /** Update the polling interval. Restarts the timer if running. */
  setInterval(ms: number): void {
    this.options.intervalMs = ms;
    if (this.timer) {
      this.stop();
      this.start();
    }
  }

  /** Whether the monitor is actively polling. */
  get isRunning(): boolean {
    return this.timer !== null;
  }

  /** Get the most recent focus snapshot (or null if none yet). */
  get currentFocus(): FocusInfo | null {
    return this.lastSnapshot;
  }

  /** Get all registered detectors. */
  get registeredDetectors(): FocusDetector[] {
    return [...this.detectors];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    // Guard against overlapping polls
    if (this.polling) return;
    this.polling = true;

    try {
      const frontmost = await this.getFrontmostApp();
      if (!frontmost) return;

      // Skip updates when our own Electron app is focused — this preserves
      // the last external app snapshot so the user can still act on it
      // (e.g. click "Open" to switch back to a terminal tab).
      if (this.isOwnApp(frontmost)) return;

      let details: FocusDetails | null = null;
      const detector = this.findDetector(frontmost);
      if (detector) {
        try {
          details = await detector.detect();
        } catch (err) {
          this.options.logger?.warn('[FocusMonitor] Detector error', detector.id, err);
        }
      }

      const info: FocusInfo = {
        bundleId: frontmost.bundleId,
        appName: frontmost.appName,
        windowTitle: frontmost.windowTitle,
        details,
        timestamp: new Date().toISOString(),
      };

      this.lastSnapshot = info;
      this.options.onFocus(info);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.options.onError?.(error);
      this.options.logger?.warn('[FocusMonitor] Poll error', error.message);
    } finally {
      this.polling = false;
    }
  }

  /** Use AppleScript to get the frontmost application info. */
  private async getFrontmostApp(): Promise<FrontmostAppInfo | null> {
    if (process.platform !== 'darwin') return null;

    // Single AppleScript call to get app name, bundle ID, and window title
    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        set bundleId to bundle identifier of frontApp
        try
          set winTitle to name of front window of frontApp
        on error
          set winTitle to ""
        end try
        return appName & "|||" & bundleId & "|||" & winTitle
      end tell
    `;

    try {
      const { stdout } = await execFileAsync('osascript', ['-e', script], {
        timeout: 3000,
      });
      const parts = stdout.trim().split('|||');
      if (parts.length < 3) return null;

      return {
        appName: parts[0],
        bundleId: parts[1] || null,
        windowTitle: parts[2] || null,
      };
    } catch {
      return null;
    }
  }

  /** Check if the frontmost app is the host app (should be skipped). */
  private isOwnApp(app: FrontmostAppInfo): boolean {
    return this.options.isOwnApp?.(app) ?? false;
  }

  /** Find the first detector that matches the frontmost app. */
  private findDetector(app: FrontmostAppInfo): FocusDetector | null {
    const appNameLower = app.appName.toLowerCase();
    const bundleIdLower = app.bundleId?.toLowerCase() ?? '';

    for (const detector of this.detectors) {
      for (const pattern of detector.matchPatterns) {
        const p = pattern.toLowerCase();
        if (p === appNameLower || p === bundleIdLower) {
          return detector;
        }
      }
    }
    return null;
  }
}
