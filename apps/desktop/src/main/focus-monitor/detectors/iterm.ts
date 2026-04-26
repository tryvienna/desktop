/**
 * iTerm2 Focus Detector — enumerates ALL windows, tabs, and sessions
 * using JXA (JavaScript for Automation) for structured JSON output.
 *
 * Returns the full window/tab/session tree so callers can:
 *   - See every open tab and what's running in it
 *   - Identify which tab/session is active
 *   - Target a specific tab/session for activation later
 *
 * Requires iTerm2 shell integration for CWD and running command fields.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FocusDetector, FocusDetails, TerminalWindow } from '../types';

const execFileAsync = promisify(execFile);

// JXA script that returns a JSON tree of all iTerm2 windows/tabs/sessions.
// Using JXA instead of AppleScript because it can output structured JSON directly.
const JXA_ENUMERATE_SCRIPT = `
const app = Application("iTerm2");
const result = { windows: [] };

const windows = app.windows();
const frontWindow = app.currentWindow();
const frontWindowId = frontWindow ? frontWindow.id() : null;

for (let wi = 0; wi < windows.length; wi++) {
  const win = windows[wi];
  const winId = win.id();
  const isFrontWindow = winId === frontWindowId;
  const winObj = {
    index: wi,
    title: win.name() || null,
    isActive: isFrontWindow,
    tabs: []
  };

  const tabs = win.tabs();
  const currentTab = win.currentTab();
  const currentTabIndex = currentTab ? currentTab.index() : -1;

  for (let ti = 0; ti < tabs.length; ti++) {
    const tab = tabs[ti];
    const tabIndex = tab.index();
    // A tab is only truly "active" if it's the selected tab in the frontmost window
    const isSelectedTab = tabIndex === currentTabIndex;
    const tabObj = {
      index: ti,
      title: null,
      isActive: isSelectedTab && isFrontWindow,
      sessions: []
    };

    const sessions = tab.sessions();
    const currentSession = tab.currentSession();
    const currentSessionId = currentSession ? currentSession.id() : null;

    for (let si = 0; si < sessions.length; si++) {
      const sess = sessions[si];
      const sessId = sess.id();

      let cwd = null;
      try { cwd = sess.variable({ named: "user.currentDirectory" }); } catch(e) {
        try { cwd = sess.variable({ named: "session.path" }); } catch(e2) {}
      }

      let cmd = null;
      try { cmd = sess.variable({ named: "user.currentCommand" }); } catch(e) {}

      const sessObj = {
        name: sess.name() || null,
        profileName: sess.profileName() || null,
        tty: sess.tty() || null,
        cwd: cwd || null,
        runningCommand: cmd || null,
        isActive: sessId === currentSessionId && isSelectedTab && isFrontWindow,
        sessionId: sessId || null
      };

      tabObj.sessions.push(sessObj);
    }

    // Use the active session name as tab title
    const activeSession = tabObj.sessions.find(s => s.isActive);
    tabObj.title = activeSession ? activeSession.name : (tabObj.sessions[0] ? tabObj.sessions[0].name : null);

    winObj.tabs.push(tabObj);
  }

  result.windows.push(winObj);
}

JSON.stringify(result);
`;

export const itermDetector: FocusDetector = {
  id: 'iterm2',
  displayName: 'iTerm2',
  matchPatterns: ['iTerm2', 'iterm2', 'com.googlecode.iterm2'],

  async isAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('osascript', [
        '-e', 'tell application "System Events" to return (exists process "iTerm2")',
      ], { timeout: 2000 });
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  },

  async detect(): Promise<FocusDetails> {
    let windows: TerminalWindow[] = [];

    try {
      const { stdout } = await execFileAsync(
        'osascript',
        ['-l', 'JavaScript', '-e', JXA_ENUMERATE_SCRIPT],
        { timeout: 5000 },
      );

      const parsed = JSON.parse(stdout.trim()) as { windows: TerminalWindow[] };
      windows = parsed.windows;
    } catch {
      // Fall back to empty if JXA fails
    }

    // Extract active session info for the top-level fields
    const activeWindow = windows.find((w) => w.isActive);
    const activeTab = activeWindow?.tabs.find((t) => t.isActive);
    const activeSession = activeTab?.sessions.find((s) => s.isActive);

    return {
      detectorId: 'iterm2',
      tabTitle: activeTab?.title ?? null,
      profileName: activeSession?.profileName ?? null,
      cwd: activeSession?.cwd ?? null,
      runningCommand: activeSession?.runningCommand ?? null,
      filePath: null,
      gitBranch: null,
      windows,
      extra: {
        tty: activeSession?.tty ?? null,
        sessionId: activeSession?.sessionId ?? null,
        windowCount: windows.length,
        tabCount: windows.reduce((sum, w) => sum + w.tabs.length, 0),
        sessionCount: windows.reduce(
          (sum, w) => sum + w.tabs.reduce((ts, t) => ts + t.sessions.length, 0),
          0,
        ),
      },
    };
  },
};
