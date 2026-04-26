/**
 * VS Code Focus Detector — extracts workspace and file info from
 * VS Code's window title (no AppleScript dictionary available).
 *
 * VS Code window titles follow a pattern like:
 *   "filename.ts - project-name - Visual Studio Code"
 *   "filename.ts [Git: main] - project-name - Visual Studio Code"
 */

import type { FocusDetector, FocusDetails } from '../types';

export const vscodeDetector: FocusDetector = {
  id: 'vscode',
  displayName: 'Visual Studio Code',
  matchPatterns: [
    'Code',
    'com.microsoft.VSCode',
    'com.microsoft.VSCodeInsiders',
    'com.visualstudio.code.oss',
    'com.todesktop.230313mzl4w4u92',  // Cursor
    'Cursor',
  ],

  async isAvailable(): Promise<boolean> {
    return process.platform === 'darwin';
  },

  async detect(): Promise<FocusDetails> {
    // VS Code doesn't have an AppleScript dictionary, so we parse
    // the window title from the FocusMonitor's base info.
    // The detect() is called *after* we already have window title from System Events.
    // We re-fetch it here for self-contained detection.
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        try
          return name of front window of frontApp
        on error
          return ""
        end try
      end tell
    `;

    let windowTitle = '';
    try {
      const { stdout } = await execFileAsync('osascript', ['-e', script], {
        timeout: 2000,
      });
      windowTitle = stdout.trim();
    } catch {
      // Fall through with empty title
    }

    return parseVSCodeTitle(windowTitle);
  },
};

/** Parse a VS Code window title into structured details. */
function parseVSCodeTitle(title: string): FocusDetails {
  const details: FocusDetails = {
    detectorId: 'vscode',
    tabTitle: null,
    cwd: null,
    runningCommand: null,
    filePath: null,
    gitBranch: null,
    profileName: null,
    windows: [],
    extra: { rawTitle: title },
  };

  if (!title) return details;

  // Strip trailing " - Visual Studio Code" or " - Cursor" etc.
  const cleaned = title
    .replace(/\s*[-—]\s*Visual Studio Code(?:\s*[-—]\s*Insiders)?$/i, '')
    .replace(/\s*[-—]\s*Cursor$/i, '')
    .trim();

  // Extract git branch: [Git: branch-name]
  const branchMatch = cleaned.match(/\[Git:\s*([^\]]+)\]/);
  if (branchMatch) {
    details.gitBranch = branchMatch[1].trim();
  }

  // Remove the git annotation for further parsing
  const withoutGit = cleaned.replace(/\s*\[Git:\s*[^\]]+\]\s*/g, ' ').trim();

  // Split by " - " to get [filename, workspace/folder]
  const segments = withoutGit.split(/\s+[-—]\s+/);

  if (segments.length >= 2) {
    details.tabTitle = segments[0].trim();
    details.cwd = segments[segments.length - 1].trim();
    // If tabTitle looks like a file path or has extension, treat as filePath
    if (details.tabTitle.includes('.') || details.tabTitle.includes('/')) {
      details.filePath = details.tabTitle;
    }
  } else if (segments.length === 1) {
    details.tabTitle = segments[0].trim();
  }

  return details;
}
