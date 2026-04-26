/**
 * Focus Monitor IPC Handlers — bridges FocusMonitor service to renderer.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FocusMonitor } from '../../main/focus-monitor/FocusMonitor';
import type { focusMonitorApi } from './contract';
import type { ApiHandlers } from '@vienna/ipc/main';

const execFileAsync = promisify(execFile);

export function createFocusMonitorHandlers(
  monitor: FocusMonitor,
): ApiHandlers<typeof focusMonitorApi> {
  return {
    focusMonitor: {
      getCurrentFocus: async () => {
        return monitor.currentFocus ?? null;
      },

      getDetectors: async () => {
        return monitor.registeredDetectors.map((d) => ({
          id: d.id,
          displayName: d.displayName,
          matchPatterns: d.matchPatterns,
        }));
      },

      getStatus: async () => {
        return {
          running: monitor.isRunning,
          intervalMs: monitor['options'].intervalMs,
          detectorCount: monitor.registeredDetectors.length,
        };
      },

      configure: async ({ enabled, intervalMs }) => {
        if (intervalMs !== undefined) {
          monitor.setInterval(intervalMs);
        }
        if (enabled && !monitor.isRunning) {
          monitor.start();
        } else if (!enabled && monitor.isRunning) {
          monitor.stop();
        }
        return { running: monitor.isRunning };
      },

      activateWindow: async ({ appName, windowIndex, tabIndex }) => {
        if (process.platform !== 'darwin') {
          return { success: false };
        }

        try {
          await activateMacWindow(appName, windowIndex, tabIndex);
          return { success: true };
        } catch {
          return { success: false };
        }
      },
    },
  };
}

/**
 * Use JXA to activate a specific window and optionally select a tab.
 * Works for iTerm2, Terminal.app, and most macOS apps with standard windows.
 */
async function activateMacWindow(
  appName: string,
  windowIndex: number,
  tabIndex?: number,
): Promise<void> {
  // Step 1: Activate the app and raise the window
  const activateScript = `
    const app = Application("${escapeJxa(appName)}");
    app.activate();

    const wins = app.windows();
    if (${windowIndex} < wins.length) {
      const win = wins[${windowIndex}];
      win.index = 1; // Bring to front (index 1 = frontmost in most apps)
    }
  `;

  await execFileAsync('osascript', ['-l', 'JavaScript', '-e', activateScript], {
    timeout: 3000,
  });

  // Step 2: Select the tab if requested
  if (tabIndex !== undefined) {
    const tabScript = buildTabSelectionScript(appName, windowIndex, tabIndex);
    if (tabScript) {
      await execFileAsync('osascript', ['-l', 'JavaScript', '-e', tabScript], {
        timeout: 3000,
      });
    }
  }
}

/**
 * Build a JXA script to select a specific tab. App-specific because
 * each app exposes tabs differently in its scripting dictionary.
 */
function buildTabSelectionScript(
  appName: string,
  _windowIndex: number,
  tabIndex: number,
): string | null {
  const escaped = escapeJxa(appName);

  // iTerm2: select tab by telling the window
  if (/iterm/i.test(appName)) {
    return `
      const app = Application("${escaped}");
      const win = app.currentWindow();
      const tabs = win.tabs();
      if (${tabIndex} < tabs.length) {
        tabs[${tabIndex}].select();
      }
    `;
  }

  // Terminal.app: set selectedTab on the window
  if (/^terminal$/i.test(appName)) {
    return `
      const app = Application("${escaped}");
      const win = app.windows[0];
      const tabs = win.tabs();
      if (${tabIndex} < tabs.length) {
        win.selectedTab = tabs[${tabIndex}];
      }
    `;
  }

  // Generic: no tab support
  return null;
}

function escapeJxa(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
