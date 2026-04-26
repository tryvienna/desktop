import { app, BrowserWindow, dialog, ipcMain, safeStorage, Menu } from 'electron';

// Restore macOS native click-through behavior for transparent windows.
// Without this patch, Electron v7+ disables transparent click-through,
// making overlay windows (notification drawer, action form) block clicks
// on areas behind them.
if (process.platform === 'darwin') {
  try {
    const { InstallClickThroughPatch } = require('@loomhq/electron-click-through-workaround');
    InstallClickThroughPatch();
  } catch {
    // Native addon may not be available in dev
  }
}
import os from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mainEnv } from '@vienna/env/main';
import { createMainLogger } from '@vienna/logger/main';
import { createPaths } from '@vienna/paths/main';
import { openAppDatabase, closeAppDatabase, createAppDb, TagFileStore, EntityToolStore } from '@vienna/app-db';
import { openDatabase as openAgentDatabase, closeDatabase as closeAgentDatabase, SessionRepository, EventRepository, DirectoryRepository, PermissionRuleRepository } from '@vienna/agent-db';
import { createDefaultRegistry } from '@vienna/agent-providers';
import { PermissionEngine } from '@vienna/agent-permissions';
import * as gitUtils from '@vienna/git-utils';
import { EntityRegistry, IntegrationRegistry, PluginSystem, getEntityTypeFromURI } from '@tryvienna/sdk';
import type { EncryptionProvider } from '@vienna/secure-storage';
import { createSecureStorage, createScopedStorage } from '@vienna/secure-storage/main';
import { initializePluginSystem } from './main/integrations';
import type { PluginSystemHandle } from './main/integrations';
import { createEmitter } from '@vienna/ipc/main';
import { registerIpc } from './ipc/register';
import { startEventForwarding } from './ipc/plugin-events/handlers';
import { ClaudeSessionBridge } from './main/watcher/ClaudeSessionBridge';
import { ClaudeFileChangeListener } from './main/watcher/ClaudeFileChangeListener';
import { InboxActionRegistry } from './main/inbox/InboxActionRegistry';
import { createTaskAction } from './main/inbox/actions/create-task';
import { openPrAction } from './main/inbox/actions/open-pr';
import { reviewWithAgentAction } from './main/inbox/actions/review-with-agent';
import { createPrAction } from './main/inbox/actions/create-pr';
import { updatePrAction } from './main/inbox/actions/update-pr';
import { z } from 'zod';
import { registerBuiltinEntities } from './main/entities';
import { getFileIndexService } from './main/file-index/FileIndexService';
import { events } from './ipc/index';
import { SessionManager } from './main/agent/SessionManager';
import { IntentClassifier } from './main/agent/intent-classifier';
import { WorkstreamManager } from './main/workstream';
import { RoutineScheduler, RoutineExecutor } from './main/routines';
import { FocusMonitor, ALL_DETECTORS } from './main/focus-monitor';
import { FeedManager } from './main/feed/FeedManager';
import { setupTray, destroyTray, setTrayBadgeCount, setTrayReady, setMainWindow } from './main/tray';
import { setupInboxWindow, destroyInboxWindow } from './main/inbox-window';
import { setupInboxNotifications } from './main/inbox-notifications';
import { setupNotificationDrawer, showNotificationDrawer, destroyNotificationDrawer } from './main/notification-drawer';
import { setupActionFormWindow, showActionFormWindow, hideActionFormWindow, destroyActionFormWindow, isMainWindowVisible } from './main/action-form-window';
import { NotificationGate, NotificationTypeRegistry } from './main/notifications';
import { TagPipelineExecutor } from './main/tags';
import { ReferenceDetector } from './main/references/ReferenceDetector';
import { AuthManager } from './main/auth/AuthManager';
import { DeepLinkHandler } from './main/auth/DeepLinkHandler';
import { DevCallbackServer } from './main/auth/DevCallbackServer';
import { authEvents } from './ipc/auth/contract';
import { initializeMCP, shutdownMCP, buildMCPServerConfig } from './main/mcp';
import { keybindingsEvents } from './ipc/keybindings/contract';
import { menuEvents } from './ipc/menu/contract';
import { KeybindingsManager } from './main/keybindings/KeybindingsManager';
import { lspEvents } from './ipc/lsp/contract';
import { fileEvents } from './ipc/file/contract';
import { LspManager } from './main/lsp/LspManager';
import { FileService } from './main/file/FileService';
import { CommandRegistry } from './main/command/CommandRegistry';
import { BUILTIN_COMMANDS } from './main/command/commands';
import { createNavigationHandlers, createAppHandlers, createWorkstreamHandlers, createAgentHandlers } from './main/command/handlers';
import nodeFs from 'node:fs/promises';
import type { FsLike } from './main/keybindings/KeybindingsManager';
import { createGitClient } from './main/registry/GitClient';
import { RegistrySyncer } from './main/registry/RegistrySyncer';
import { RegistryReader } from './main/registry/RegistryReader';
import { RegistryManager } from './main/registry/RegistryManager';
import { RegistrySyncScheduler } from './main/registry/RegistrySyncScheduler';
import { SkillManager } from './main/skills/SkillManager';
import { SkillSymlinkManager } from './main/skills/SkillSymlinkManager';
import { PluginInstaller } from './main/plugins/PluginInstaller';
import { PluginBundler } from './main/plugins/PluginBundler';
import type { InstalledSkillRepository } from '@vienna/app-db';
import { resolveProfile, assertPathContainment } from './main/profile/ProfileManager';
import { ContentProfileManager } from './main/profile/ContentProfileManager';
import { migrateToProfileLayout } from './main/profile/migration';

/**
 * Register all enabled installed skills as command palette entries.
 * Each skill becomes a `skill:<id>` command with category 'skill'.
 * When executed, the handler activates the skill and returns insertText.
 */
function registerSkillCommands(
  repository: InstalledSkillRepository,
  sm: SkillManager,
  registry: CommandRegistry,
  log: { info: (msg: string, ctx?: Record<string, unknown>) => void },
): void {
  const skills = repository.listEnabled();
  // Clear previous skill commands
  registry.unregister('skill:');
  if (skills.length === 0) return;
  // Register definitions
  registry.register(
    skills.map((s) => ({
      id: `skill:${s.id}`,
      category: 'skill' as const,
      title: s.name,
      description: s.description,
      keywords: [s.id, ...(s.tags ?? []), s.category ?? ''].filter(Boolean),
    })),
  );
  // Register handlers — activate skill and return body as insertText
  for (const s of skills) {
    registry.registerHandler(`skill:${s.id}`, async () => {
      const body = await sm.activate(s.id);
      return { type: 'insertText' as const, text: body };
    });
  }
  log.info('Registered skill commands', { count: skills.length });
}

/**
 * Scan global (~/.claude/commands/) and project-level (<dir>/.claude/commands/)
 * directories for Claude custom commands, then register them in the command palette.
 */
async function scanAndRegisterClaudeCommands(
  sm: SkillManager,
  registry: CommandRegistry,
  projectDirs: string[],
  log: { info: (msg: string, ctx?: Record<string, unknown>) => void },
): Promise<void> {
  // Always clear previous claude-cmd entries
  registry.unregister('claude-cmd:');

  // Detect $PLACEHOLDER patterns (e.g., $ARGUMENTS, $FILE_PATH)
  const PLACEHOLDER_RE = /\$([A-Z][A-Z0-9_]*)/g;
  function hasPlaceholders(body: string): boolean {
    return PLACEHOLDER_RE.test(body);
  }

  const allCommands: Array<{ id: string; category: 'claude'; title: string; description: string; keywords: string[]; hasFlow?: boolean; body?: string; handler: () => Promise<{ type: 'insertText'; text: string }> }> = [];

  // 1. Global commands from ~/.claude/commands/
  const globalDir = path.join(os.homedir(), '.claude', 'commands');
  const globalCmds = await sm.scanClaudeCommands(globalDir);
  for (const cmd of globalCmds) {
    PLACEHOLDER_RE.lastIndex = 0;
    const needsArgs = hasPlaceholders(cmd.body);
    allCommands.push({
      id: `claude-cmd:${cmd.id}`,
      category: 'claude',
      title: cmd.name,
      description: 'Global Claude command',
      keywords: [cmd.id, 'claude', 'command', 'global'],
      hasFlow: needsArgs || undefined,
      body: needsArgs ? cmd.body : undefined,
      handler: async () => ({ type: 'insertText' as const, text: cmd.body }),
    });
  }

  // 2. Project-level commands from <projectDir>/.claude/commands/
  for (const dir of projectDirs) {
    const projectCmdsDir = path.join(dir, '.claude', 'commands');
    const projectCmds = await sm.scanClaudeCommands(projectCmdsDir);
    const dirName = path.basename(dir);
    for (const cmd of projectCmds) {
      const cmdId = `claude-cmd:project:${dirName}:${cmd.id}`;
      // Skip if a command with this ID already exists (e.g., same basename)
      if (allCommands.some((c) => c.id === cmdId)) continue;
      PLACEHOLDER_RE.lastIndex = 0;
      const needsArgs = hasPlaceholders(cmd.body);
      allCommands.push({
        id: cmdId,
        category: 'claude',
        title: `${cmd.name} (${dirName})`,
        description: `Project command — ${dirName}`,
        keywords: [cmd.id, dirName, 'claude', 'command', 'project'],
        hasFlow: needsArgs || undefined,
        body: needsArgs ? cmd.body : undefined,
        handler: async () => ({ type: 'insertText' as const, text: cmd.body }),
      });
    }
  }

  if (allCommands.length === 0) return;

  registry.register(
    allCommands.map(({ handler: _h, ...def }) => def),
  );
  for (const cmd of allCommands) {
    registry.registerHandler(cmd.id, cmd.handler);
  }
  log.info('Registered Claude commands', {
    count: allCommands.length,
    global: globalCmds.length,
    project: allCommands.length - globalCmds.length,
  });
}


// Suppress EPIPE errors — these occur harmlessly in dev when Turbo's pipe
// reader disconnects during hot-reload. The error can surface from any
// writable stream (stdout, stderr, Pino file stream, IPC), so we catch
// it globally rather than per-stream.
process.on('uncaughtException', (err) => {
  if ((err as NodeJS.ErrnoException).code === 'EPIPE') return;
  // Re-throw non-EPIPE exceptions so they still crash as expected.
  throw err;
});

// In dev mode, Cmd+C in the terminal sends SIGINT to the process group but
// Electron Forge's child Electron process can survive it, leaving a zombie app
// with no dev server. Quit gracefully on SIGINT/SIGTERM so `pnpm run dev` can
// be stopped cleanly from the terminal.
if (!app.isPackaged) {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => app.quit());
  }
}

// Forge injects these constants at build time.
// Runtime env vars (validated by @vienna/env) take precedence.
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Worktree isolation — injected by vite.main.config.ts via `define`.
declare const __VIENNA_BRANCH__: string;
declare const __VIENNA_CHANNEL__: string;

const channel = typeof __VIENNA_CHANNEL__ !== 'undefined' ? __VIENNA_CHANNEL__ : 'production';

// Set app name early (before app.getPath) so each branch/channel gets its own userData dir.
if (!app.isPackaged && typeof __VIENNA_BRANCH__ !== 'undefined' && __VIENNA_BRANCH__) {
  app.name = `Vienna (${__VIENNA_BRANCH__})`;
} else if (app.isPackaged && channel !== 'production') {
  app.name = `Vienna (${channel})`;
}

const devServerUrl =
  mainEnv.MAIN_WINDOW_VITE_DEV_SERVER_URL ??
  (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined'
    ? MAIN_WINDOW_VITE_DEV_SERVER_URL
    : undefined);
const viteName =
  mainEnv.MAIN_WINDOW_VITE_NAME ??
  (typeof MAIN_WINDOW_VITE_NAME !== 'undefined' ? MAIN_WINDOW_VITE_NAME : 'main_window');

// --- Root base directory (app-level, not profile-specific) ---
const baseDir = mainEnv.VIENNA_DATA_DIR ?? app.getPath('userData');

// --- Boot-level encryption provider (shared across all profiles) ---
const encryption: EncryptionProvider = {
  isAvailable: () => safeStorage.isEncryptionAvailable(),
  encrypt: (s) => safeStorage.encryptString(s),
  decrypt: (b) => safeStorage.decryptString(b),
};

// --- Boot-level secure storage (at root, used ONLY for auth bootstrap) ---
const bootSecureStorage = createSecureStorage({
  storageDir: path.join(baseDir, 'secure-storage'),
  encryption,
  fallbackBehavior: mainEnv.NODE_ENV === 'production' ? 'throw' : 'plaintext',
});

// --- Protocol Scheme (deep links) ---
const PROTOCOL_SCHEME = !app.isPackaged
  ? 'vienna-dev'
  : channel !== 'production'
    ? `vienna-${channel}`
    : 'vienna';
// Default backend for optional auth/feedback. Users (or internal devs pointing
// at a self-hosted stack) can override with the VIENNA_WEB_URL env var.
const DEFAULT_WEB_URL = 'https://www.tryvienna.dev';
const WEB_URL = mainEnv.VIENNA_WEB_URL ?? DEFAULT_WEB_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Mutable app state — initialized in app.on('ready') after profile resolution
// ─────────────────────────────────────────────────────────────────────────────

let deepLinkHandler: DeepLinkHandler;
let devCallbackServer: DevCallbackServer | undefined;
let cleanupIpc: () => void = () => {};
let cleanupUpdateChecker: () => void = () => {};

// References needed for shutdown (assigned during init)
let appDbRaw: ReturnType<typeof openAppDatabase>;
let agentDbRaw: ReturnType<typeof openAgentDatabase>;
let authManager: AuthManager;
let routineScheduler: RoutineScheduler;
let focusMonitor: FocusMonitor;
let registrySyncScheduler: RegistrySyncScheduler;
let registryManager: RegistryManager;
let skillManager: SkillManager;
let pluginInstaller: PluginInstaller;
let workstreamManager: WorkstreamManager;
let keybindingsManager: KeybindingsManager;
let intentClassifier: IntentClassifier | undefined;
let lspManager: LspManager;
let fileService: FileService;
let claudeSessionBridge: ClaudeSessionBridge | undefined;
let claudeFileChangeListener: ClaudeFileChangeListener | undefined;
let inboxActionRegistry: InboxActionRegistry | undefined;
let logger: ReturnType<typeof createMainLogger>;
let pluginSystemHandle: PluginSystemHandle | undefined;
let isQuitting = false;

/**
 * Restart the app to switch profiles after login/logout.
 * In production (packaged), uses app.relaunch() for seamless restart.
 * In dev mode, shows a dialog and quits (Forge doesn't support relaunch).
 */
function restartForProfileSwitch(message: string): void {
  if (app.isPackaged) {
    app.relaunch();
    app.exit(0);
  } else {
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'Vienna',
      message,
      detail: 'Please restart the app to continue.',
      buttons: ['OK'],
    });
    app.quit();
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    title: app.name,
    width: 1200,
    height: 800,
    minWidth: 680,
    minHeight: 400,
    show: false,
    backgroundColor: '#09090b', // zinc-950 — matches app background, avoids white flash
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: true,
      zoomFactor: 1.0,
    },
  });

  // Register with tray so showMainWindow targets this window, not the popover or panel
  setMainWindow(mainWindow);

  // Restrict webview URLs to YouTube embeds only. webviewTag is enabled for
  // help doc video playback — this prevents it from loading arbitrary URLs.
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (_waEvent, webPreferences, params) => {
      const url = params.src ?? '';
      if (!url.startsWith('https://www.youtube.com/embed/')) {
        _waEvent.preventDefault();
        return;
      }
      // Strip dangerous overrides from the webview
      delete webPreferences.preload;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
    });
  });

  // Show window only once the renderer has painted — avoids showing a blank/frozen frame
  // while the JS bundle loads from Vite dev server or disk.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Keep our custom title (with branch name) instead of the HTML <title>.
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  // Hide window instead of closing so the app stays in the menu bar tray
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${viteName}/index.html`));
  }
}

app.on('ready', async () => {
  // Set dock icon in dev (packaged builds use the icon from forge packagerConfig)
  if (!app.isPackaged && process.platform === 'darwin') {
    const generatedIcon = path.resolve(__dirname, '../../.generated/dev-icon.png');
    const staticIcon = path.resolve(__dirname, '../../resources/icon-dev.png');
    const fs = await import('node:fs');
    app.dock?.setIcon(fs.existsSync(generatedIcon) ? generatedIcon : staticIcon);
  }

  // Set up menu bar tray icon
  // The onViewInbox callback is late-bound because the shortcut emitter
  // is created later in the startup sequence.
  let onViewInbox: (() => void) | undefined;
  if (process.platform === 'darwin') {
    setupTray('😊', {
      onViewInbox: () => onViewInbox?.(),
      devServerUrl: devServerUrl ?? undefined,
      viteName,
    });
  }

  // ── Step 1: Auth bootstrap (determine who the user is) ──────────────
  const authEmitter = createEmitter(authEvents, {
    getWebContents: () => BrowserWindow.getAllWindows().map((w) => w.webContents),
  });

  // Use a silent no-op logger during auth bootstrap to avoid writing
  // auth-related logs to a shared root directory before profile resolution.
  const silentLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  } as unknown as ReturnType<typeof createMainLogger>;

  authManager = new AuthManager({
    storage: bootSecureStorage,
    logger: silentLogger,
    emitter: authEmitter.auth,
    webUrl: WEB_URL,
  });

  await authManager.initialize();

  // ── Step 2: Resolve profile based on auth state ─────────────────────
  const profile = resolveProfile(baseDir, authManager.getUserId());

  // ── Step 3: Create paths rooted at the profile directory ────────────
  const paths = createPaths({ baseDir, profileDir: profile.profileDir });

  // ── Step 4: Initialize logger at the profile's log directory ────────
  // All logs go to the profile directory — no shared root-level logs.
  logger = createMainLogger({
    baseLogDir: paths.logs.dir,
    level: mainEnv.NODE_ENV === 'production' ? 'info' : 'debug',
    enableConsole: mainEnv.NODE_ENV !== 'production',
  });

  // Give auth manager the real (profile-scoped) logger
  authManager.setLogger(logger);

  logger.info('Main process starting', {
    sessionId: logger.getSessionId(),
    logFile: logger.getLogFile(),
    nodeEnv: mainEnv.NODE_ENV,
    profileId: profile.profileId,
    isAnonymous: profile.isAnonymous,
  });

  // ── Step 5: Open databases at profile-specific paths ────────────────
  // Runtime safety: assert all data paths are inside the profile directory.
  // This prevents bugs in path construction from leaking data to wrong profiles.
  const profilesDir = path.join(baseDir, 'profiles');
  assertPathContainment(paths.appDb, profilesDir);
  assertPathContainment(paths.agentDb, profilesDir);
  assertPathContainment(paths.settings, profilesDir);
  assertPathContainment(paths.keybindings, profilesDir);
  assertPathContainment(paths.secureStorage, profilesDir);
  assertPathContainment(paths.registryCache, profilesDir);
  assertPathContainment(paths.logs.dir, profilesDir);

  appDbRaw = openAppDatabase({ path: paths.appDb });
  const appDb = createAppDb(appDbRaw, paths.settings);

  // ── Step 5b: Apply developer mode to logger ───────────────────────────
  // Developer mode gates logging: null = use env default (on for dev, off for prod).
  const advancedSettings = appDb.settings.get('advanced');
  const effectiveDeveloperMode = advancedSettings.developerMode ?? !app.isPackaged;
  if (!effectiveDeveloperMode) {
    logger.info('Developer mode off — disabling logging after this message');
    logger.setEnabled(false);
  }

  agentDbRaw = openAgentDatabase({ path: paths.agentDb });
  const sessionRepo = new SessionRepository(agentDbRaw);
  const eventRepo = new EventRepository(agentDbRaw);
  const directoryRepo = new DirectoryRepository(agentDbRaw);
  const permissionRuleRepo = new PermissionRuleRepository(agentDbRaw);

  // ── Step 6: Initialize all services (same as before, using profile paths) ──

  // Profile-scoped secure storage for integration credentials
  const profileSecureStorage = createSecureStorage({
    storageDir: paths.secureStorage,
    encryption,
    fallbackBehavior: mainEnv.NODE_ENV === 'production' ? 'throw' : 'plaintext',
  });

  const providerRegistry = createDefaultRegistry();
  const permissionEngine = new PermissionEngine();

  const ipcEmitter = createEmitter(events, {
    getWebContents: () => BrowserWindow.getAllWindows().map((w) => w.webContents),
  });

  const sessionManager = new SessionManager({
    registry: providerRegistry,
    permissionEngine,
    permissionRuleRepo,
    eventRepo,
    sessionRepo,
    directoryRepo,
    emitter: ipcEmitter.agent,
    logger,
  });

  sessionManager.loadPersistentRules();

  workstreamManager = new WorkstreamManager({
    sessionManager,
    workstreamRepo: appDb.workstreams,
    workstreamGroupRepo: appDb.workstreamGroups,
    workstreamDirRepo: appDb.workstreamDirectories,
    branchSelectionRepo: appDb.branchSelections,
    linkedEntityRepo: appDb.workstreamLinkedEntities,
    groupLinkedEntityRepo: appDb.groupLinkedEntities,
    sessionRepo,
    eventRepo,
    emitter: ipcEmitter.workstream,
    logger,
    defaultProviderId: 'claude-code',
    getAutoCompactPercent: () => appDb.settings.getAll().ai.autoCompactPercent,
    permissionPolicyRepo: appDb.permissionPolicies,
    settingsRepo: appDb.settings,
    tagRepo: appDb.tags,
  });

  const routineExecutor = new RoutineExecutor({
    routineRepo: appDb.routines,
    workstreamManager,
    inboxItems: appDb.inboxItems,
  });
  routineScheduler = new RoutineScheduler({
    routineRepo: appDb.routines,
    executor: routineExecutor,
  });

  // Focus Monitor — polls OS for frontmost app/window info
  const focusSettings = appDb.settings.get('advanced');
  focusMonitor = new FocusMonitor({
    intervalMs: focusSettings.focusMonitorIntervalMs,
    onFocus: (info) => {
      ipcEmitter.focusMonitor.onFocusChanged(info);
    },
    onError: (err) => {
      logger.warn('Focus monitor error', { error: err.message });
    },
    isOwnApp: (app) => {
      const name = app.appName.toLowerCase();
      const bundle = app.bundleId?.toLowerCase() ?? '';
      return (
        name === 'electron' ||
        name.startsWith('vienna') ||
        bundle.startsWith('com.tryvienna.') ||
        bundle === 'com.github.electron'
      );
    },
    logger,
  });
  focusMonitor.registerDetectors(ALL_DETECTORS);
  if (focusSettings.focusMonitorEnabled) {
    focusMonitor.start();
  }

  const tagFileStore = new TagFileStore(paths.profileDir);
  const entityToolStore = new EntityToolStore(paths.profileDir);

  const tagPipelineExecutor = new TagPipelineExecutor({
    tagRepo: appDb.tags,
    tagFileStore,
    db: appDb,
    workstreamManager,
    logger,
    gitOps: gitUtils,
    onInvalidate: () => ipcEmitter.graphql.onInvalidate({ typename: 'WorkstreamTag' }),
  });

  workstreamManager.addEventListener((workstreamId, event) => {
    if (event.type === 'turn_end' || event.type === 'error') {
      const errorMsg = event.type === 'error' ? event.message : undefined;
      routineExecutor.onWorkstreamEvent(workstreamId, event.type, errorMsg);
    }
  });

  appDb.routines.onScheduleChange = (routineId, action) => {
    switch (action) {
      case 'scheduled':
        routineScheduler.scheduleRoutine(routineId);
        break;
      case 'unscheduled':
        routineScheduler.unscheduleRoutine(routineId);
        break;
      case 'refreshed':
        routineScheduler.refreshSchedule(routineId);
        break;
    }
  };

  const entityRegistry = new EntityRegistry();
  const integrationRegistry = new IntegrationRegistry();
  const onApplyTag = (workstreamId: string, tagName: string, appliedBy: string, projectId: string) =>
    tagPipelineExecutor.executePipeline(workstreamId, [tagName], appliedBy, projectId).then(() => {});
  registerBuiltinEntities(entityRegistry, appDb, tagFileStore, {
    onApplyTag,
    onTagCompleted: (workstreamId, tagName) =>
      tagPipelineExecutor.onTagCompleted(workstreamId, tagName),
    onTagFailed: (workstreamId, tagName) =>
      tagPipelineExecutor.onTagFailed(workstreamId, tagName),
  }, {
    onApplyTag,
  });
  workstreamManager.setEntityRegistry(entityRegistry);

  // --- Plugin System (unified registry + integration lifecycle) ---
  const rendererBundleCache = new Map<string, string>();

  // In packaged builds, fix two esbuild issues:
  // 1. ESBUILD_BINARY_PATH — esbuild can't spawn binaries inside the ASAR archive
  // 2. process.cwd() — esbuild caches cwd at import time and passes it as the
  //    `cwd` option to child_process.spawn(). In packaged apps, cwd may point
  //    inside the ASAR (a file, not a directory), causing spawn ENOTDIR.
  if (app.isPackaged) {
    // Ensure cwd is a real directory BEFORE esbuild is imported
    try {
      process.chdir(os.homedir());
    } catch (err) {
      logger.warn('Failed to chdir to homedir', { error: err instanceof Error ? err.message : String(err) });
    }

    const asarPath = app.getAppPath(); // .../app.asar
    const unpackedPath = asarPath + '.unpacked';
    const esbuildBin = path.join(
      unpackedPath, 'node_modules', '@esbuild',
      `${process.platform}-${process.arch}`, 'bin', 'esbuild',
    );
    if (existsSync(esbuildBin)) {
      process.env.ESBUILD_BINARY_PATH = esbuildBin;
      logger.info('Set ESBUILD_BINARY_PATH for packaged app', { esbuildBin });
    } else {
      logger.error('esbuild platform binary not found in packaged app — plugin bundling will fail', {
        expected: esbuildBin,
        platform: process.platform,
        arch: process.arch,
      });
    }

    // Verify the esbuild JS package is also unpacked and version-aligned
    const esbuildJsDir = path.join(unpackedPath, 'node_modules', 'esbuild');
    if (!existsSync(path.join(esbuildJsDir, 'package.json'))) {
      logger.error('esbuild JS package not found in unpacked ASAR — plugin bundling will fail', {
        expected: esbuildJsDir,
      });
    }

    // Eagerly initialize the esbuild service so it picks up ESBUILD_BINARY_PATH,
    // then remove the env var so child processes (terminals, Claude Code, etc.)
    // don't inherit the packaged-app binary path and corrupt their own pnpm stores.
    try {
      await import('esbuild');
    } catch {
      // Non-fatal — PluginBundler will surface the error when plugins are loaded
    }
    delete process.env.ESBUILD_BINARY_PATH;
  }

  // Initialize the plugin system: CredentialManager, ClientManager,
  // OAuthManager, PluginLoader, PluginDevServer.
  // Plugins are loaded as local plugins (no built-in plugins).
  const pluginErrorStore: import('./ipc/plugin/handlers').PluginErrorRecord[] = [];

  const { createEntitySchemaBuilder, invalidateSchema } = await import('@vienna/graphql/schema');
  const entitySchemaBuilder = createEntitySchemaBuilder(entityRegistry);
  try {
    const branch = typeof __VIENNA_BRANCH__ !== 'undefined' ? __VIENNA_BRANCH__ : undefined;
    pluginSystemHandle = await initializePluginSystem({
      createScopedStorage: (opts) => createScopedStorage(profileSecureStorage, opts),
      logger,
      schemaBuilder: entitySchemaBuilder,
      invalidateSchema,
      customizationsDir: path.join(paths.profileDir, 'customizations'),
      branch,
      onPluginChangedIpc: (pluginId, action) => {
        // Clear any recorded error when the plugin successfully loads/reloads/unloads
        const idx = pluginErrorStore.findIndex((e) => e.pluginId === pluginId);
        if (idx !== -1) pluginErrorStore.splice(idx, 1);
        ipcEmitter.plugin.onPluginChanged({ pluginId, action });
        // Rescan active sessions so late-loaded plugins get file.changed events
        if (action === 'loaded' || action === 'reloaded') {
          void claudeFileChangeListener?.watchActiveSessions();
        }
      },
      onCustomizationProgressIpc: (pluginId, step, message) => {
        ipcEmitter.plugin.onCustomizationProgress({
          pluginId,
          step: step as 'copying' | 'installing' | 'done' | 'error',
          message,
        });
      },
      onPluginErrorIpc: (pluginId, error, phase) => {
        const record = { pluginId, error, phase, timestamp: Date.now() };
        pluginErrorStore.push(record);
        ipcEmitter.plugin.onPluginError(record);
      },
    });

    // Force schema rebuild now that plugin extensions are registered
    invalidateSchema();

    // Auto-load existing customizations from disk
    const customizationsDir = path.join(paths.profileDir, 'customizations');
    if (existsSync(customizationsDir)) {
      try {
        const customEntries = await readdir(customizationsDir);
        for (const entry of customEntries) {
          if (entry.startsWith('.')) continue;
          const customDir = path.join(customizationsDir, entry);
          const entryFile = path.join(customDir, 'src', 'index.ts');
          if (!existsSync(entryFile)) continue;

          logger.info('Loading existing customization', { pluginId: entry });
          const result = await pluginSystemHandle.devServer.loadFromDir(entry, customDir);
          if (result.success) {
            pluginSystemHandle.devServer.watch(entry, customDir);
          } else {
            logger.warn('Failed to load existing customization', {
              pluginId: entry,
              error: result.error,
            });
          }
        }
      } catch (scanErr) {
        logger.warn('Failed to scan customizations directory', {
          error: scanErr instanceof Error ? scanErr.message : String(scanErr),
        });
      }
    }

    // Auto-load persisted local plugins from previous sessions
    try {
      const localPlugins = await pluginSystemHandle.devServer.getPersistedLocalPlugins();
      for (const [pluginId, pluginDir] of Object.entries(localPlugins)) {
        if (!existsSync(pluginDir)) {
          logger.warn('Local plugin directory no longer exists, skipping', { pluginId, dir: pluginDir });
          continue;
        }
        logger.info('Auto-loading local plugin from previous session', { pluginId, dir: pluginDir });
        const result = await pluginSystemHandle.devServer.loadLocalPlugin(pluginDir);
        if (!result.success) {
          logger.warn('Failed to auto-load local plugin', { pluginId, error: result.error });
          const errorRecord: import('./ipc/plugin/handlers').PluginErrorRecord = {
            pluginId,
            error: result.error ?? (result.missingDependencies ? 'Dependencies not installed' : 'Failed to load'),
            phase: result.missingDependencies ? 'dependencies' : 'bundle',
            timestamp: Date.now(),
            missingDependencies: result.missingDependencies,
            packageManager: result.packageManager,
            pluginDir,
          };
          pluginErrorStore.push(errorRecord);
          ipcEmitter.plugin.onPluginError(errorRecord);
        }
      }
    } catch (localErr) {
      logger.warn('Failed to auto-load local plugins', {
        error: localErr instanceof Error ? localErr.message : String(localErr),
      });
    }

    logger.info('Plugin system initialized', {
      plugins: pluginSystemHandle.system.getPluginIds(),
      integrations: pluginSystemHandle.system.getAllIntegrations().map((i) => i.id),
    });
  } catch (err) {
    logger.error('Failed to initialize plugin system', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Use the initialized PluginSystem (falls back to empty if initialization failed)
  const pluginSystem = pluginSystemHandle?.system ?? new PluginSystem();

  // Forward all plugin events to the renderer for the Event Monitor
  startEventForwarding(pluginSystem, ipcEmitter);

  // Watch Claude Code CLI session files and bridge events into the plugin system
  claudeSessionBridge = new ClaudeSessionBridge({
    pluginSystem,
    logger: logger.child({ service: 'ClaudeSessionBridge' }),
  });
  void claudeSessionBridge.start().catch((err) => {
    logger.warn('Failed to start ClaudeSessionBridge', { error: String(err) });
  });

  // Listen for file changes from Claude and detect patterns (TODOs, etc.)
  claudeFileChangeListener = new ClaudeFileChangeListener({
    pluginSystem,
    logger: logger.child({ service: 'ClaudeFileChangeListener' }),
  });

  // Watch directories of any already-running Claude sessions
  void claudeFileChangeListener.watchActiveSessions();

  // ── Inbox action registry ──────────────────────────────────────────────
  // Coroutine-style handlers that can prompt the user with forms.

  const inboxActions = new InboxActionRegistry(logger);
  inboxActionRegistry = inboxActions;
  // Wrap the emitter to show the action form overlay when main window isn't visible
  inboxActions.setEmitter({
    onPrompt: (payload) => {
      ipcEmitter.inboxAction.onPrompt(payload);
      if (!isMainWindowVisible()) showActionFormWindow();
    },
    onResult: (payload) => {
      ipcEmitter.inboxAction.onResult(payload);
      if (!isMainWindowVisible()) showActionFormWindow();
    },
    onComplete: (payload) => {
      ipcEmitter.inboxAction.onComplete(payload);
      hideActionFormWindow();
    },
    onError: (payload) => {
      ipcEmitter.inboxAction.onError(payload);
      hideActionFormWindow();
    },
  });

  // Register action handlers
  inboxActions.register(createTaskAction(appDb));
  inboxActions.register(openPrAction());
  inboxActions.register(reviewWithAgentAction({ appDb, workstreamManager }));
  inboxActions.register(createPrAction());
  inboxActions.register(updatePrAction());

  // ── Core event listeners → inbox items ─────────────────────────────────
  // Plugin events fire → routed through NotificationGate → (if not muted)
  // appDb.inboxItems.create() + broadcast.

  /** Notify all renderers, update tray badge, and show the notification drawer. */
  const broadcastInbox = () => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.webContents.send('inbox:changed');
    });
    // Update tray badge immediately
    try {
      const count = appDb.inboxItems.countUnread();
      if (process.platform === 'darwin') {
        setTrayBadgeCount(count);
      }
    } catch { /* DB may not be ready */ }
    // Show the notification drawer
    showNotificationDrawer();
  };

  // Granular per-source / per-type mute controls. Settings are read on every
  // notify() so toggles take effect immediately without an app restart.
  const notificationRegistry = new NotificationTypeRegistry();
  const notificationGate = new NotificationGate({
    registry: notificationRegistry,
    getSettings: () => appDb.settings.get('notifications'),
    createInboxItem: (input) => appDb.inboxItems.create(input),
    broadcast: broadcastInbox,
    log: (msg, meta) => logger.debug(msg, meta),
  });

  // TODO detected in source code → inbox item
  pluginSystem.registerCoreListeners([
    {
      event: 'core.src.todo.added',
      handler: (payload: unknown) => {
        const p = payload as {
          tag: string; text: string; file: string; line: number;
          context: string; repoRoot: string;
        };
        notificationGate.notify('core.src.todo.added', {
          title: `${p.tag}: ${p.text || 'new comment'}`,
          description: `${p.file}:${p.line} — ${p.context}`,
          icon: p.tag === 'FIXME' ? '🔧' : p.tag === 'HACK' ? '⚠️' : '📝',
          actions: [
            {
              id: 'core.create-task',
              label: 'Create Task',
              payload: { tag: p.tag, text: p.text, file: p.file, line: p.line },
            },
          ],
        });
      },
    },
    {
      event: 'core.src.todo.removed',
      handler: (payload: unknown) => {
        const p = payload as {
          tag: string; text: string; file: string; line: number;
          context: string; repoRoot: string;
        };
        notificationGate.notify('core.src.todo.removed', {
          title: `${p.tag} removed: ${p.text || 'comment removed'}`,
          description: `${p.file}:${p.line}`,
          icon: '🗑️',
        });
      },
    },
    {
      event: 'core.claude-code.turn.completed',
      handler: (payload: unknown) => {
        const p = payload as {
          sessionId: string; projectPath: string; model: string;
          usage: { inputTokens: number; outputTokens: number };
          contentTypes: readonly string[]; timestamp: string;
        };
        // Suppress notifications from Claude sessions launched inside Vienna —
        // the user is already watching those in the workstream UI. This is a
        // context-specific predicate, not a user setting.
        const session = sessionRepo.getByProviderSessionId(p.sessionId);
        if (session?.workstreamId) return;
        // Only create inbox item if the turn included tool use (i.e., Claude did something)
        if (p.contentTypes.includes('tool_use') || p.contentTypes.includes('text')) {
          notificationGate.notify('core.claude-code.turn.completed', {
            title: `Turn completed (${p.model.split('-').slice(-2).join('-')})`,
            description: `${p.usage.inputTokens + p.usage.outputTokens} tokens used`,
            icon: '✅',
          });
        }
      },
    },
  ]);

  // Route impact summary from vercel_cli plugin → single inbox notification.
  // Dormant until the plugin loads and registers its events.
  pluginSystem.registerCoreListeners([
    {
      event: 'vercel_cli.route.analysis.complete',
      handler: (payload: unknown) => {
        const p = payload as { changedFile: string; projectRoot: string; impactCount: number };
        if (p.impactCount === 0) return;
        const fileName = p.changedFile.split('/').pop() ?? p.changedFile;
        const project = p.projectRoot.split('/').pop() ?? p.projectRoot;
        notificationGate.notify('vercel_cli.route.analysis.complete', {
          title: `${p.impactCount} route${p.impactCount > 1 ? 's' : ''} impacted by ${fileName}`,
          description: project,
          icon: '🔀',
        });
      },
    },
  ]);

  // GitHub CLI plugin events → inbox items with contextual actions.
  // Dormant until the plugin loads and registers its events.
  const execFileAsync = promisify(execFile);

  pluginSystem.registerCoreListeners([
    {
      event: 'github_cli.pr.created',
      handler: (payload: unknown) => {
        const p = payload as {
          sessionId: string; cwd: string; owner: string; repo: string;
          branch: string; defaultBranch: string;
          prNumber: number | null; prUrl: string; timestamp: string;
        };
        const prLabel = p.prNumber ? `PR #${p.prNumber}` : 'PR';
        notificationGate.notify('github_cli.pr.created', {
          title: `${prLabel} created on ${p.owner}/${p.repo}`,
          description: `${p.branch} → ${p.defaultBranch}`,
          icon: '🔀',
          entityUri: p.prNumber ? `@vienna//github_pr/${p.owner}/${p.repo}/${p.prNumber}` : undefined,
          actions: [
            {
              id: 'github-cli.open-pr',
              label: 'Open PR',
              payload: { prUrl: p.prUrl, prNumber: p.prNumber, owner: p.owner, repo: p.repo },
            },
            {
              id: 'github-cli.review-with-agent',
              label: 'Review with Agent',
              payload: { prUrl: p.prUrl, prNumber: p.prNumber, owner: p.owner, repo: p.repo, branch: p.branch },
            },
          ],
        });
      },
    },
    {
      event: 'github_cli.commit.created',
      handler: (payload: unknown) => {
        const p = payload as {
          sessionId: string; cwd: string; owner: string; repo: string;
          branch: string; defaultBranch: string;
          commitHash: string; commitMessage: string;
          filesChanged: number | null; toolUseId: string; timestamp: string;
        };

        // Check if a PR already exists for this branch to determine the CTA
        void (async () => {
          try {
            const { stdout } = await execFileAsync('gh', [
              'pr', 'list', '-R', `${p.owner}/${p.repo}`,
              '--head', p.branch, '--json', 'number,url', '--limit', '1',
            ], { cwd: p.cwd, timeout: 10_000, encoding: 'utf-8' });

            const prs = JSON.parse(stdout.trim() || '[]') as Array<{ number: number; url: string }>;
            const existingPr = prs[0] ?? null;

            const filesDesc = p.filesChanged !== null ? ` (${p.filesChanged} file${p.filesChanged !== 1 ? 's' : ''})` : '';

            if (existingPr) {
              // PR exists — CTA is "Update PR" (opens the existing PR)
              notificationGate.notify('github_cli.commit.created', {
                title: `Commit ${p.commitHash.slice(0, 7)} on ${p.owner}/${p.repo}`,
                description: `${p.commitMessage}${filesDesc}`,
                icon: '📦',
                actions: [
                  {
                    id: 'github-cli.update-pr',
                    label: 'Update PR',
                    payload: {
                      prUrl: existingPr.url,
                      prNumber: existingPr.number,
                      owner: p.owner,
                      repo: p.repo,
                      branch: p.branch,
                      cwd: p.cwd,
                      commitHash: p.commitHash,
                    },
                  },
                ],
              });
            } else {
              // No PR — CTA is "Create PR"
              notificationGate.notify('github_cli.commit.created', {
                title: `Commit ${p.commitHash.slice(0, 7)} on ${p.owner}/${p.repo}`,
                description: `${p.commitMessage}${filesDesc}`,
                icon: '📦',
                actions: [
                  {
                    id: 'github-cli.create-pr',
                    label: 'Create PR',
                    payload: {
                      cwd: p.cwd,
                      owner: p.owner,
                      repo: p.repo,
                      branch: p.branch,
                      defaultBranch: p.defaultBranch,
                      commitMessage: p.commitMessage,
                    },
                  },
                ],
              });
            }
          } catch {
            // If gh CLI fails, still create the inbox item without a PR-related action
            notificationGate.notify('github_cli.commit.created', {
              title: `Commit ${p.commitHash.slice(0, 7)} on ${p.owner}/${p.repo}`,
              description: p.commitMessage,
              icon: '📦',
            });
          }
        })();
      },
    },
    {
      event: 'github_cli.pr.merged',
      handler: (payload: unknown) => {
        const p = payload as {
          sessionId: string; cwd: string; owner: string; repo: string;
          branch: string; defaultBranch: string;
          prNumber: number | null; prUrl: string | null;
          mergeMethod: string; timestamp: string;
        };
        const prLabel = p.prNumber ? `PR #${p.prNumber}` : 'PR';
        notificationGate.notify('github_cli.pr.merged', {
          title: `${prLabel} merged (${p.mergeMethod})`,
          description: `${p.owner}/${p.repo}`,
          icon: '🎉',
          entityUri: p.prNumber ? `@vienna//github_pr/${p.owner}/${p.repo}/${p.prNumber}` : undefined,
        });
      },
    },
  ]);

  // contentProfileManager is created below — use a late-binding getter
  // so FeedManager can access it at feed-process time (not at construction).
  let _contentProfileManager: ContentProfileManager | null = null;
  const feedManager = new FeedManager({
    workstreamManager,
    workstreamRepo: appDb.workstreams,
    eventRepo,
    pluginSystem,
    profileDir: paths.profileDir,
    getContentProfileDir: () => _contentProfileManager?.getActiveDirectory() ?? '',
    onInvalidate: (payload) => ipcEmitter.graphql.onInvalidate(payload),
    logger: logger.child({ service: 'FeedManager' }),
  });

  // --- Reference Detector (auto-detect entity references in workstream conversations) ---
  const referenceDetector = new ReferenceDetector({
    pluginSystem,
    referenceRepo: appDb.workstreamReferences,
    linkedEntityRepo: appDb.workstreamLinkedEntities,
    logger: logger.child({ service: 'ReferenceDetector' }),
    onReferenceDetected: () => {
      ipcEmitter.graphql.onInvalidate({ typename: 'WorkstreamReference' });
    },
  });
  workstreamManager.addEventListener((workstreamId, event) => {
    referenceDetector.handleEvent(workstreamId, event);
  });

  const registryGitClient = createGitClient();
  const registrySyncer = new RegistrySyncer({ git: registryGitClient, logger });
  const registryReader = new RegistryReader({ logger });
  // --- Content profiles (~/.vienna/profiles/) ---
  const globalViennaDir = path.join(os.homedir(), '.vienna');
  migrateToProfileLayout(globalViennaDir);

  const skillSymlinkManager = new SkillSymlinkManager({ logger });

  const contentProfileManager = new ContentProfileManager(globalViennaDir, {
    gitClient: registryGitClient,
    logger,
    onSwitch: (activeDir) => {
      registryManager.invalidateCache();
      skillSymlinkManager.syncGlobalFromProfile(path.join(activeDir, 'skills')).catch((err) => {
        logger.warn('Failed to sync skill symlinks after profile switch', { error: String(err) });
      });
      // Reconcile plugins: uninstall old profile's, install new profile's
      if (pluginInstaller) {
        pluginInstaller.reconcileDefaults().catch((err) => {
          logger.warn('Failed to reconcile plugins after profile switch', { error: String(err) });
        });
      }
      // Notify renderer to refetch all queries (quick actions, skills, plugins, etc.)
      ipcEmitter.graphql.onInvalidate({ typename: 'Query' });
    },
  });
  _contentProfileManager = contentProfileManager;

  registryManager = new RegistryManager({
    repository: appDb.registries,
    syncer: registrySyncer,
    reader: registryReader,
    cacheDir: paths.registryCache,
    logger,
    contentProfileManager,
  });
  registrySyncScheduler = new RegistrySyncScheduler({
    manager: registryManager,
    logger,
  });
  registrySyncScheduler.start();

  // --- Skills ---
  skillManager = new SkillManager({
    repository: appDb.installedSkills,
    registryManager,
    skillsDir: paths.skills,
    gitClient: registryGitClient,
    logger,
  });
  // --- Skill symlink bridge (.vienna/skills/ → .claude/skills/) ---
  // Sync active profile's skill symlinks on startup (non-blocking)
  const activeProfileSkillsDir = path.join(contentProfileManager.getActiveDirectory(), 'skills');
  skillSymlinkManager.syncGlobalFromProfile(activeProfileSkillsDir).catch((err) => {
    logger.warn('Failed to sync global skill symlinks', { error: String(err) });
  });

  skillManager.ensureSkillsDir()
    .then(() => skillManager.ensureDefaults())
    .then(() => {
      if (!app.isPackaged) {
        const devSkillsDir = path.resolve(__dirname, '../../../..', 'skills');
        return skillManager.syncDevSkills(devSkillsDir);
      }
    })
    .then(() => {
      // Sync local skills from ~/.claude/skills/ (project dirs added later via GraphQL)
      return skillManager.syncLocalSkills({
        global: path.join(os.homedir(), '.claude', 'skills'),
        projectDirs: [],
      });
    })
    .then(async () => {
      // Register Claude commands from ~/.claude/commands/*.md (global only at startup)
      await scanAndRegisterClaudeCommands(skillManager, commandRegistry, [], logger);
    })
    .then(() => {
      // Register all enabled installed skills as command palette entries
      registerSkillCommands(appDb.installedSkills, skillManager, commandRegistry, logger);
      // Re-register commands automatically when skill state changes
      skillManager.setOnSkillsChanged(() =>
        registerSkillCommands(appDb.installedSkills, skillManager, commandRegistry, logger),
      );
    })
    .catch((err) => {
      logger.warn('Failed to initialize skills', { error: String(err) });
    });

  // --- Plugins (registry-installed) ---
  if (pluginSystemHandle) {
    const pluginBundler = new PluginBundler({ logger });
    pluginInstaller = new PluginInstaller({
      repository: appDb.installedPlugins,
      registryManager,
      pluginsDir: paths.plugins,
      gitClient: registryGitClient,
      bundler: pluginBundler,
      loader: pluginSystemHandle.pluginLoader,
      onRendererBundle: (pluginId, code) => rendererBundleCache.set(pluginId, code),
      onPluginChanged: (pluginId, action) => {
        ipcEmitter.plugin.onPluginChanged({ pluginId, action });
        // Rescan active sessions so late-loaded plugins get file.changed events
        if (action === 'loaded') {
          void claudeFileChangeListener?.watchActiveSessions();
        }
      },
      onPluginSourceRegistered: (pluginId, sourcePath, packageRoot) => {
        pluginSystemHandle!.devServer.registerPluginSource(pluginId, sourcePath, packageRoot);
      },
      logger,
    });
    pluginInstaller.ensurePluginsDir()
      .then(() => pluginInstaller.loadInstalledPlugins())
      .then(() => pluginInstaller.ensureDefaults())
      .catch((err) => {
        logger.warn('Failed to initialize registry plugins', { error: String(err) });
      });
  }

  // --- Keybindings ---
  const keybindingsEmitter = createEmitter(keybindingsEvents, {
    getWebContents: () => BrowserWindow.getAllWindows().map((w) => w.webContents),
  });
  const keybindingsFs: FsLike = {
    readFile: (p, enc) => nodeFs.readFile(p, enc),
    writeFile: (p, content, enc) => nodeFs.writeFile(p, content, enc),
    rename: (oldP, newP) => nodeFs.rename(oldP, newP),
    unlink: (p) => nodeFs.unlink(p),
    mkdir: async (p, opts) => { await nodeFs.mkdir(p, opts); },
  };
  keybindingsManager = new KeybindingsManager({
    fs: keybindingsFs,
    keybindingsPath: paths.keybindings,
    logger,
    emitter: keybindingsEmitter.keybindings,
  });

  // --- Shortcut forwarding events ---
  // Forwards keyboard shortcuts caught via before-input-event (main process)
  // to the renderer via IPC. Used for shortcuts like Cmd+` that macOS
  // intercepts at the system level before they reach the renderer's keydown.
  const shortcutEmitter = createEmitter(menuEvents, {
    getWebContents: () => BrowserWindow.getAllWindows().map((w) => w.webContents),
  });

  // Bind the tray "View Inbox" callback now that the emitter is ready
  onViewInbox = () => {
    shortcutEmitter.menu.onAccelerator({ commandId: 'app:view-inbox' });
  };

  // --- LSP Manager ---
  const lspEmitter = createEmitter(lspEvents, {
    getWebContents: () => BrowserWindow.getAllWindows().map((w) => w.webContents),
  });
  lspManager = new LspManager({
    logger,
    callbacks: {
      onDiagnostics: (data) =>
        lspEmitter.lsp.onDiagnostics({
          uri: data.uri,
          diagnostics: data.diagnostics.map((d) => ({
            range: d.range,
            severity: d.severity,
            code: d.code,
            source: d.source,
            message: d.message,
          })),
        }),
      onServerReady: (data) => lspEmitter.lsp.onServerReady(data),
      onServerStopped: (data) => lspEmitter.lsp.onServerStopped(data),
    },
  });

  // --- File Service ---
  const fileEmitter = createEmitter(fileEvents, {
    getWebContents: () => BrowserWindow.getAllWindows().map((w) => w.webContents),
  });
  fileService = new FileService({
    logger,
    callbacks: {
      onChanged: (data) => fileEmitter.file.onChanged(data),
    },
  });

  // --- Command Registry ---
  const commandRegistry = new CommandRegistry({
    logger,
    emitter: ipcEmitter.graphql,
  });
  commandRegistry.register(BUILTIN_COMMANDS);
  logger.info('Command registry initialized', {
    service: 'CommandRegistry',
    commandCount: BUILTIN_COMMANDS.length,
    commands: BUILTIN_COMMANDS.map((c) => c.id),
  });
  commandRegistry.registerHandlers({
    ...createNavigationHandlers(),
    ...createAppHandlers({
      getFocusedWindow: () => BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0],
    }),
    ...createWorkstreamHandlers(),
    ...createAgentHandlers(),
  });

  // Initialize keybindings (load user overrides from disk)
  await keybindingsManager.initialize();

  // Register protocol handler for deep links (production only)
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
  }

  // Deep link handler — receives auth code, exchanges for JWT, stores token
  deepLinkHandler = new DeepLinkHandler(
    logger,
    async (result) => {
      if (result.error) {
        logger.error('Auth callback error', { error: result.error });
        return;
      }
      if (result.code && result.userId) {
        try {
          const res = await fetch(`${WEB_URL}/api/auth/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: result.code }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error((data as { error?: string }).error || `Exchange failed: ${res.status}`);
          }
          const { token, userId, email } = (await res.json()) as { token: string; userId: string; email?: string };
          await authManager.handleAuthSuccess(token, userId, email);

          // Profile changed — restart to pick up the new profile directory
          logger.info('Auth success — restarting to switch profile', { userId });
          restartForProfileSwitch('Signed in successfully. Restarting Vienna…');
          return;
        } catch (err) {
          logger.error('Auth code exchange failed', { error: err });
        }
      }
    },
    [PROTOCOL_SCHEME],
  );

  // Wire profile fork deep link handler
  deepLinkHandler.setOnProfileFork(async (gitUrl) => {
    const repoName = gitUrl.split('/').pop()?.replace(/\.git$/, '') ?? 'profile';
    const mainWindow = BrowserWindow.getAllWindows()[0];
    const { response } = await dialog.showMessageBox(mainWindow ?? { destroy: () => {} } as never, {
      type: 'question',
      buttons: ['Fork & Switch', 'Fork Only', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Fork Content Profile',
      message: `Fork profile "${repoName}"?`,
      detail: `This will clone the repository and make it available as a content profile.\n\n${gitUrl}`,
    });

    if (response === 2) return; // Cancel

    try {
      const profile = await contentProfileManager.fork(gitUrl);
      if (response === 0) {
        await contentProfileManager.switchTo(profile.name);
      }
      logger.info('Profile forked via deep link', { name: profile.name, switched: response === 0 });
    } catch (err) {
      logger.error('Failed to fork profile via deep link', { error: String(err), gitUrl });
      dialog.showErrorBox('Profile Fork Failed', `Could not fork profile from ${gitUrl}:\n\n${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Wire plugin install deep link handler — emits an IPC event so the
  // renderer shows a confirmation dialog from the design system.
  deepLinkHandler.setOnPluginInstall(async (params) => {
    if (!pluginInstaller) {
      logger.warn('Plugin system not ready — ignoring deep link install', { slug: params.slug });
      return;
    }

    // Check if already installed (by slug or normalized canonical ID)
    const alreadyInstalled = !!(
      pluginInstaller.getById(params.slug) ||
      pluginInstaller.getById(params.slug.replace(/-/g, '_'))
    );

    // Emit event to renderer — the PluginInstallConfirmDialog will handle it
    ipcEmitter.plugin.onPluginInstallRequest({
      slug: params.slug,
      name: params.name,
      repo: params.repo,
      dir: params.dir || undefined,
      alreadyInstalled,
    });
  });

  // In dev mode, start local HTTP server for auth callbacks
  let devCallbackPort: number | undefined;
  if (!app.isPackaged) {
    devCallbackServer = new DevCallbackServer({
      deepLinkHandler,
      protocolScheme: PROTOCOL_SCHEME,
      logger,
    });
    devCallbackPort = await devCallbackServer.start();
  }

  // Build a shared entity context factory — creates per-entity-type contexts with
  // live integration clients so that GraphQL entity resolvers (and MCP handlers)
  // can access real clients (e.g. Octokit for GitHub entities).
  const entityContextFactory = pluginSystemHandle
    ? (entityType: string) => {
        const handlers = entityRegistry.getHandlers(entityType);
        return pluginSystemHandle!.pluginLoader.createEntityContext(handlers?.integrationDeps ?? {}, entityType);
      }
    : undefined;

  // Wire entity context resolution for rich linked-entity context in system prompts.
  // Uses the entity registry + live integration clients to call resolveContext on entity definitions.
  if (entityContextFactory) {
    workstreamManager.setResolveEntityContext(async (entityUri: string) => {
      try {
        const entityType = getEntityTypeFromURI(entityUri);
        const ctx = entityContextFactory(entityType);
        return await entityRegistry.resolveContext(entityUri, ctx);
      } catch {
        return null;
      }
    });
  }

  // Local intent classifier for semantic operation matching (always enabled, zero cost)
  intentClassifier = new IntentClassifier({ log: logger });
  logger.info('Intent classifier enabled for MCP operation matching');

  // Start MCP socket server
  try {
    const mcp = await initializeMCP(logger, {
      db: appDb,
      entityRegistry,
      integrationRegistry,
      graphqlEmitter: ipcEmitter.graphql,
      entityContextFactory,
      getIntegrationClient: pluginSystemHandle
        ? (id) => pluginSystemHandle!.clients.ensureClient(id)
        : undefined,
      intentClassifier,
      getRecentMessages: intentClassifier
        ? (workstreamId: string): string[] => {
            try {
              // Fetch last 50 events, extract user/assistant message text
              const records = eventRepo.getByWorkstreamTail(workstreamId, 50);
              const messages: string[] = [];
              for (const record of records) {
                if (record.eventType === 'user_message' || record.eventType === 'text_done') {
                  try {
                    const payload = JSON.parse(record.payload) as Record<string, unknown>;
                    const text = record.eventType === 'user_message'
                      ? (payload['text'] as string | undefined)
                      : (payload['fullText'] as string | undefined);
                    if (text) {
                      const role = record.eventType === 'user_message' ? 'user' : 'assistant';
                      messages.push(`[${role}]: ${text}`);
                    }
                  } catch {
                    // Skip malformed payloads
                  }
                }
              }
              // Return last 6 messages (3 turns) for concise context
              return messages.slice(-6);
            } catch {
              return [];
            }
          }
        : undefined,
      workstream: workstreamManager,
      gitOps: gitUtils,
      tag: tagPipelineExecutor,
      tagFileStore,
      entityToolStore,
    });
    const mcpServers = buildMCPServerConfig(mcp.socketPath, logger);
    const serverCount = Object.keys(mcpServers).length;
    if (serverCount > 0) {
      workstreamManager.setMCPServers(mcpServers);
      logger.info('MCP servers configured for workstream agent sessions', {
        servers: Object.keys(mcpServers),
        socketPath: mcp.socketPath,
      });
    } else {
      logger.warn('No MCP servers configured — agent will not have entity tools');
    }
  } catch (err) {
    logger.error('Failed to initialize MCP bridge', { error: String(err) });
  }

  // Start update checker (polls GitHub Releases for new versions)
  const { UpdateChecker } = await import('./main/update/UpdateChecker');
  const updateChecker = new UpdateChecker(app.getVersion());
  updateChecker.start();
  cleanupUpdateChecker = () => updateChecker.stop();

  // Register IPC handlers
  cleanupIpc = registerIpc(ipcMain, logger, {
    updateChecker,
    appDb,
    sessionManager,
    providerRegistry,
    workstreamManager: workstreamManager,
    routineExecutor,
    tagPipelineExecutor,
    tagFileStore,
    entityToolStore,
    registry: registryManager,
    skillManager,
    pluginInstaller,
    pluginInstallFromSource: pluginInstaller ? {
      install: (rp, opts) => pluginInstaller.install(rp, opts),
      getRegistryPlugins: () => registryManager.getPlugins(),
    } : undefined,
    entityRegistry,
    integrationRegistry,
    pluginSystem,
    pluginDevServer: pluginSystemHandle?.devServer,
    getPluginErrors: () => pluginErrorStore,
    rendererBundleCache,
    secureStorage: profileSecureStorage,
    oauthManager: pluginSystemHandle?.oauth,
    credentialManager: pluginSystemHandle?.credentials,
    graphqlEmitter: ipcEmitter.graphql,
    entityContextFactory,
    getIntegrationClient: pluginSystemHandle
      ? (id: string) => pluginSystemHandle!.clients.ensureClient(id)
      : undefined,
    gitOps: gitUtils,
    authManager,
    deepLinkHandler,
    contentProfiles: contentProfileManager,
    keybindingsManager,
    lspManager,
    fileService,
    commandRegistry: {
      getCatalog: (filter?: string) => commandRegistry.getCatalog(filter),
      execute: (id: string, args?: Record<string, unknown>) => commandRegistry.execute(id, args),
      rescanClaudeCommands: async (projectDirs: string[]) => {
        // Update registry manager with active project directories
        registryManager.setActiveProjectDirectories(projectDirs);
        // Sync skill symlinks for project directories
        await skillSymlinkManager.syncProjects(projectDirs);
        await scanAndRegisterClaudeCommands(skillManager, commandRegistry, projectDirs, logger);
      },
    },
    paths,
    pluginEventsDataDir: path.join(paths.profileDir, 'plugin-events'),
    inboxActionRegistry: inboxActions,
    whisperEmitter: ipcEmitter.whisper,
    webUrl: WEB_URL,
    protocolScheme: PROTOCOL_SCHEME,
    localPort: devCallbackPort,
    getReadmeDirs: async (pluginId: string) => {
      const dirs: string[] = [];
      // Installed plugin directory
      const installed = pluginInstaller?.getById(pluginId);
      if (installed?.path) dirs.push(installed.path);
      // Registry cache (source of truth for inline plugins)
      const registries = registryManager.listEnabled();
      for (const reg of registries) {
        const sourcePath = await registryManager.getPluginSourcePath(reg.name, pluginId);
        if (sourcePath) dirs.push(sourcePath);
      }
      return dirs;
    },
    onProfileSwitch: restartForProfileSwitch,
    focusMonitor,
    feedManager,
    getProjectDirs: (projectId: string) => {
      const project = appDb.projects.getById(projectId);
      if (!project) return [];
      return appDb.projectDirectories.getByProject(projectId).map((d) => d.path);
    },
  });

  // IPC handlers are registered — enable the tray popover and inbox panel
  setTrayReady();
  setupInboxWindow({
    devServerUrl: devServerUrl ?? undefined,
    viteName,
    onViewInbox: () => onViewInbox?.(),
  });
  setupNotificationDrawer({
    devServerUrl: devServerUrl ?? undefined,
    viteName,
    onViewInbox: () => onViewInbox?.(),
  });
  setupActionFormWindow({
    devServerUrl: devServerUrl ?? undefined,
    viteName,
  });

  // Wire file index status changes → renderer via IPC events
  const fileIndex = getFileIndexService();
  fileIndex.onStatusChange((status) => {
    ipcEmitter.files.onIndexStatusChanged(status);
  });

  // Set up a native macOS application menu so that standard text-editing
  // shortcuts (Cmd+C/V/X/Z/A) are routed through Electron-managed NSMenuItems.
  // Without this, macOS dispatches them through unmanaged items and logs:
  // "representedObject is not a WeakPtrToElectronMenuModelAsNSObject"
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CommandOrControl+=',
          click: () => {
            shortcutEmitter.menu.onAccelerator({ commandId: 'view:zoom-in' });
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CommandOrControl+-',
          click: () => {
            shortcutEmitter.menu.onAccelerator({ commandId: 'view:zoom-out' });
          },
        },
        {
          label: 'Actual Size',
          accelerator: 'CommandOrControl+0',
          click: () => {
            shortcutEmitter.menu.onAccelerator({ commandId: 'view:zoom-reset' });
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        {
          // Claim Cmd+` from macOS so it doesn't get swallowed by the
          // system "cycle windows" handler. The native menu accelerator
          // tells macOS this app owns the shortcut; the click handler
          // forwards it to the renderer via IPC.
          label: 'Toggle Previous Workstream',
          accelerator: 'CommandOrControl+`',
          click: () => {
            shortcutEmitter.menu.onAccelerator({ commandId: 'workstream:toggle-previous' });
          },
        },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  isReady = true;
  createWindow();

  // Set initial tray badge from existing unread count
  {
    setupInboxNotifications({ onViewInbox: () => onViewInbox?.() });
    try {
      const count = appDb.inboxItems.countUnread();
      if (process.platform === 'darwin') {
        setTrayBadgeCount(count);
      }
    } catch {
      // DB may not be ready yet
    }
  }

  // Restore persisted zoom level and defer file index warming + routine scheduler.
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    const savedZoom = appDb.settings.get('appearance').zoomLevel;
    if (savedZoom !== 0) {
      win.webContents.setZoomLevel(savedZoom);
    }

    win.webContents.once('did-finish-load', () => {
      try {
        const allWorkstreams = appDb.workstreams.listAll();
        const dirs = new Set<string>();
        for (const ws of allWorkstreams) {
          for (const dir of appDb.workstreamDirectories.getByWorkstream(ws.id)) {
            dirs.add(dir.path);
          }
        }
        if (dirs.size > 0) {
          for (const dir of dirs) {
            fileIndex.addDirectory(dir);
          }
          logger.info('File index warming started', { directoryCount: dirs.size });
        }
      } catch (err) {
        logger.error('Failed to warm file index', { error: String(err) });
      }

      routineScheduler.start().catch((err) => {
        logger.error('Failed to start routine scheduler', { error: String(err) });
      });
    });
  }
});

// --- Deep Link Handling ---
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (deepLinkHandler) {
    void deepLinkHandler.handleUrl(url);
  }
});

app.on('second-instance', (_event, commandLine) => {
  const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL_SCHEME}://`));
  if (url && deepLinkHandler) {
    void deepLinkHandler.handleUrl(url);
  }
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

let isReady = false;
let isShuttingDown = false;

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', (e) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  e.preventDefault();

  destroyTray();
  destroyInboxWindow();
  destroyNotificationDrawer();
  destroyActionFormWindow();
  keybindingsManager?.cleanup();
  authManager?.stopPeriodicValidation();
  routineScheduler?.stop();
  focusMonitor?.stop();
  registrySyncScheduler?.stop();
  registryManager?.dispose();
  devCallbackServer?.stop();
  claudeFileChangeListener?.stop();
  void claudeSessionBridge?.stop();
  inboxActionRegistry?.shutdown();
  pluginSystemHandle?.shutdown();
  getFileIndexService().shutdown();
  intentClassifier?.shutdown().catch(() => {});

  const shutdownWork = workstreamManager
    ? workstreamManager
        .shutdown()
        .then(() => lspManager?.stopAll())
        .then(() => {
          fileService?.unwatchAll();
          return shutdownMCP();
        })
    : shutdownMCP();

  shutdownWork
    .catch((err) => logger?.error('Shutdown error', { error: String(err) }))
    .finally(() => {
      cleanupUpdateChecker();
      cleanupIpc();
      if (agentDbRaw) closeAgentDatabase(agentDbRaw);
      if (appDbRaw) closeAppDatabase(appDbRaw);
      const closeLogger = logger?.close() ?? Promise.resolve();
      closeLogger.finally(() => app.quit());
    });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.show();
    win.focus();
  } else if (isReady) {
    createWindow();
  }
});

