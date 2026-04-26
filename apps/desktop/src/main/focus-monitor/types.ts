/**
 * Focus Monitor Types — shared interfaces for the pluggable focus detection system.
 *
 * @module main/focus-monitor/types
 */

/** Information about the currently focused application and window. */
export interface FocusInfo {
  /** Bundle ID or process name (e.g. 'com.googlecode.iterm2') */
  bundleId: string | null;
  /** Human-readable app name (e.g. 'iTerm2') */
  appName: string;
  /** Window title as reported by the OS */
  windowTitle: string | null;
  /** Deep app-specific details from a matched detector */
  details: FocusDetails | null;
  /** ISO timestamp of when this snapshot was taken */
  timestamp: string;
}

/** A terminal session (one pane inside a tab). */
export interface TerminalSession {
  /** Session name / title */
  name: string | null;
  /** Terminal profile name */
  profileName: string | null;
  /** TTY device path (e.g. /dev/ttys003) */
  tty: string | null;
  /** Current working directory (requires shell integration) */
  cwd: string | null;
  /** Currently running command (requires shell integration) */
  runningCommand: string | null;
  /** Whether this is the active session in its tab */
  isActive: boolean;
  /** Unique session ID (iTerm's internal ID) */
  sessionId: string | null;
}

/** A tab inside a terminal window. */
export interface TerminalTab {
  /** Tab index (0-based) */
  index: number;
  /** Tab title / name */
  title: string | null;
  /** Whether this is the active tab in its window */
  isActive: boolean;
  /** All sessions (panes) in this tab */
  sessions: TerminalSession[];
}

/** A terminal window. */
export interface TerminalWindow {
  /** Window index (0-based) */
  index: number;
  /** Window title */
  title: string | null;
  /** Whether this is the frontmost window */
  isActive: boolean;
  /** All tabs in this window */
  tabs: TerminalTab[];
}

/** App-specific details extracted by a detector. */
export interface FocusDetails {
  /** Detector that produced these details */
  detectorId: string;
  /** Active tab/file/document name */
  tabTitle: string | null;
  /** Current working directory (terminals) */
  cwd: string | null;
  /** Running command (terminals) */
  runningCommand: string | null;
  /** Current file path (editors) */
  filePath: string | null;
  /** Git branch (editors) */
  gitBranch: string | null;
  /** The terminal profile/session name */
  profileName: string | null;
  /** Full window/tab/session tree for terminal apps */
  windows: TerminalWindow[];
  /** Arbitrary extra data from the detector */
  extra: Record<string, unknown>;
}

/**
 * A pluggable detector for a specific application.
 * Each detector knows how to extract deep focus information from one app.
 */
export interface FocusDetector {
  /** Unique identifier for this detector (e.g. 'iterm2', 'vscode') */
  id: string;
  /** Human-readable name */
  displayName: string;
  /** Bundle IDs or app names this detector handles */
  matchPatterns: string[];
  /** Whether this detector is available on the current platform */
  isAvailable(): Promise<boolean>;
  /** Extract detailed focus info. Called only when the matched app is frontmost. */
  detect(): Promise<FocusDetails>;
}
