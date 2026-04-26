/**
 * @vienna/paths — Centralized directory paths for Vienna.
 *
 * Entry points:
 *   @vienna/paths          — shared types (safe for all processes)
 *   @vienna/paths/main     — createPaths() factory (Node.js / Electron main)
 */

// ---------------------------------------------------------------------------
// Log paths
// ---------------------------------------------------------------------------

export interface LogPaths {
  /** Root log directory: <profileDir>/logs */
  readonly dir: string;

  /** Session directory: <profileDir>/logs/<sessionId> */
  session(sessionId: string): string;

  /** Session log file: <profileDir>/logs/<sessionId>/vienna.log */
  sessionLog(sessionId: string): string;

  /** Path to the current-session pointer file: <profileDir>/logs/current-session */
  readonly currentSession: string;
}

// ---------------------------------------------------------------------------
// Aggregated paths
// ---------------------------------------------------------------------------

export interface ViennaPaths {
  /** The root data directory (app-level, NOT profile-specific). */
  readonly baseDir: string;

  /** The active profile's data directory (all user data lives here). */
  readonly profileDir: string;

  /** App database: <profileDir>/app.db */
  readonly appDb: string;

  /** Agent database: <profileDir>/agent.db */
  readonly agentDb: string;

  /** Settings file: <profileDir>/settings.json */
  readonly settings: string;

  /** Keybindings file: <profileDir>/keybindings.json */
  readonly keybindings: string;

  /** Secure storage directory: <profileDir>/secure-storage/ */
  readonly secureStorage: string;

  /** Registry cache directory: <profileDir>/registry-cache/ */
  readonly registryCache: string;

  /** Installed skills directory: <profileDir>/skills/ */
  readonly skills: string;

  /** Installed plugins directory: <profileDir>/plugins/ */
  readonly plugins: string;

  /** Global tags file: <profileDir>/tags.json */
  readonly tags: string;

  /** Per-project directory: <profileDir>/projects/ */
  readonly projects: string;

  /** Log file paths (profile-scoped). */
  readonly logs: LogPaths;

  /** Whisper model cache directory: <baseDir>/whisper-models/ (shared across profiles) */
  /** Whisper model cache directory: <baseDir>/whisper-models/ (shared across profiles) */
  readonly whisperModels: string;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface CreatePathsOptions {
  /** Root data directory. Typically `app.getPath('userData')` or `VIENNA_DATA_DIR`. */
  baseDir: string;

  /** The resolved profile directory. All user data is stored here. */
  profileDir: string;
}
