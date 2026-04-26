/**
 * Terminal.app Focus Detector — extracts window/tab info from macOS
 * built-in Terminal using its AppleScript dictionary.
 *
 * Terminal.app's scripting dictionary is more limited than iTerm2's,
 * but we can still enumerate windows, tabs, and running processes.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { FocusDetector, FocusDetails, TerminalWindow } from '../types';

const execFileAsync = promisify(execFile);

// JXA script to enumerate all Terminal.app windows, tabs, and processes.
// Terminal.app's scripting model: window.selectedTab() returns the active tab.
// Tabs don't have a "selected" boolean — we identify the active one by matching
// its index against the selectedTab's position via AppleScript bridging.
//
// We use an AppleScript helper to get the selected tab index because JXA's
// selectedTab() returns a reference that can't be compared to array elements.
const JXA_ENUMERATE_SCRIPT = `
ObjC.import('stdlib');

const app = Application("Terminal");
const result = { windows: [] };

const windows = app.windows();

for (let wi = 0; wi < windows.length; wi++) {
  const win = windows[wi];
  const winObj = {
    index: wi,
    title: win.name() || null,
    isActive: wi === 0,
    tabs: []
  };

  const tabs = win.tabs();

  // Get the selected tab's tty to identify it.
  // We read all ttys and the selected tab's tty, then match by value.
  let selectedTty = null;
  try {
    const sel = win.selectedTab();
    selectedTty = sel.tty();
  } catch(e) {}

  for (let ti = 0; ti < tabs.length; ti++) {
    const tab = tabs[ti];
    let tty = null;
    try { tty = tab.tty(); } catch(e) {}

    let processes = [];
    try { processes = tab.processes(); } catch(e) {}
    const lastProcess = processes.length > 0 ? processes[processes.length - 1] : null;

    // A tab is "selected" if it's the chosen tab in its window.
    // But it's only truly "active" (user is looking at it) if it's
    // also in the frontmost window (wi === 0).
    const isSelected = (selectedTty !== null && tty !== null && tty === selectedTty);
    const isActive = isSelected && wi === 0;

    const sessObj = {
      name: null,
      profileName: null,
      tty: tty,
      cwd: null,
      runningCommand: lastProcess || null,
      isActive: isActive,
      sessionId: tty
    };

    let tabTitle = null;
    try { tabTitle = tab.customTitle(); } catch(e) {}
    if (!tabTitle && lastProcess) tabTitle = lastProcess;

    winObj.tabs.push({
      index: ti,
      title: tabTitle,
      isActive: isActive,
      sessions: [sessObj]
    });
  }

  result.windows.push(winObj);
}

JSON.stringify(result);
`;

export const terminalDetector: FocusDetector = {
  id: 'terminal',
  displayName: 'Terminal.app',
  matchPatterns: ['Terminal', 'com.apple.Terminal'],

  async isAvailable(): Promise<boolean> {
    return process.platform === 'darwin';
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
      // Fall back to empty
    }

    const activeWindow = windows.find((w) => w.isActive);
    const activeTab = activeWindow?.tabs.find((t) => t.isActive);
    const activeSession = activeTab?.sessions.find((s) => s.isActive);

    // Terminal.app window title often contains the CWD
    const windowTitle = activeWindow?.title ?? '';
    const cwdMatch = windowTitle.match(/(?:~\/[^\s]*|\/[^\s]*)/);

    return {
      detectorId: 'terminal',
      tabTitle: activeTab?.title ?? null,
      profileName: null,
      cwd: cwdMatch?.[0]?.replace('~', process.env.HOME ?? '') ?? null,
      runningCommand: activeSession?.runningCommand ?? null,
      filePath: null,
      gitBranch: null,
      windows,
      extra: {
        tty: activeSession?.tty ?? null,
      },
    };
  },
};
