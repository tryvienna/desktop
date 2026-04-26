/**
 * Main-process IPC registration — wires handlers to ipcMain.
 *
 * Only import this from the main process (src/main.ts).
 * It pulls in main-process dependencies (env, process.versions, etc.).
 */

import type { IpcMainLike } from '@vienna/ipc/main';
import { implement } from '@vienna/ipc/main';
import type { MainLogger } from '@vienna/logger/main';
import type { SessionManager } from '../main/agent/SessionManager';
import type { ProviderRegistry } from '@vienna/agent-providers';
import type { WorkstreamManager } from '../main/workstream/WorkstreamManager';
import type { RoutineExecutor } from '../main/routines/RoutineExecutor';
import type { TagPipelineExecutor } from '../main/tags/TagPipelineExecutor';
import type { AppDb, TagFileStore, EntityToolStore } from '@vienna/app-db';
import type { EntityRegistry, IntegrationRegistry, EntityContext, PluginSystem } from '@tryvienna/sdk';
import type { SecureStorage } from '@vienna/secure-storage';
import type { GitOps, RegistryActions, SkillActions, PluginActions, ContentProfileActions, InboxActions } from '@vienna/graphql';
import type { PluginDevServer } from '../main/plugins/PluginDevServer';
import type { OAuthManager } from '../main/integrations/OAuthManager';
import type { CredentialManager } from '../main/integrations/CredentialManager';
import type { AuthManager } from '../main/auth/AuthManager';
import type { DeepLinkHandler } from '../main/auth/DeepLinkHandler';
import type { KeybindingsManager } from '../main/keybindings/KeybindingsManager';
import type { LspManager } from '../main/lsp/LspManager';
import type { FileService } from '../main/file/FileService';
import type { CommandActions } from '@vienna/graphql';
import type { ViennaPaths } from '@vienna/paths';
import { api } from './index';
import { createSystemHandlers } from './system/handlers';
import type { UpdateChecker } from '../main/update/UpdateChecker';
import { createShellHandlers } from './shell/handlers';
import { createLoggerHandlers } from './logger/handlers';
import { createAgentHandlers } from './agent/handlers';
import { createGraphqlHandlers, type GraphqlCacheEmitter } from './graphql/handlers';
import { createAuthHandlers } from './auth/handlers';
import { createKeybindingsHandlers } from './keybindings/handlers';
import { createLspHandlers } from './lsp/handlers';
import { createFileHandlers } from './file/handlers';
import { filesHandlers } from './files/handlers';
import { createFeedbackHandlers } from './feedback/handlers';
import { createPluginHandlers, type PluginErrorRecord, type PluginInstallFromSourceDeps } from './plugin/handlers';
import { createOAuthHandlers } from './oauth/handlers';
import { createClaudeSettingsHandlers } from './claude-settings/handlers';
import { createFeedHandlers } from './feed/handlers';
import type { FeedManager } from '../main/feed/FeedManager';
import { createWhisperHandlers } from './whisper/handlers';
import { createCliHandlers } from './cli/handlers';
import { createZoomHandlers } from './zoom/handlers';
import { createFocusMonitorHandlers } from './focus-monitor/handlers';
import type { FocusMonitor } from '../main/focus-monitor/FocusMonitor';
import { createPluginEventsHandlers } from './plugin-events/handlers';
import { createInboxActionHandlers } from './inbox-action/handlers';
import type { InboxActionRegistry } from '../main/inbox/InboxActionRegistry';

export interface RegisterIpcOptions {
  sessionManager?: SessionManager;
  providerRegistry?: ProviderRegistry;
  workstreamManager?: WorkstreamManager;
  routineExecutor?: RoutineExecutor;
  tagPipelineExecutor?: TagPipelineExecutor;
  tagFileStore?: TagFileStore;
  entityToolStore?: EntityToolStore;
  appDb?: AppDb;
  entityRegistry?: EntityRegistry;
  integrationRegistry?: IntegrationRegistry;
  registry?: RegistryActions;
  skillManager?: SkillActions;
  pluginInstaller?: PluginActions;
  /** Concrete installer + registry for deep-link install-from-source flow. */
  pluginInstallFromSource?: PluginInstallFromSourceDeps;
  gitOps?: GitOps;
  authManager?: AuthManager;
  deepLinkHandler?: DeepLinkHandler;
  keybindingsManager?: KeybindingsManager;
  lspManager?: LspManager;
  fileService?: FileService;
  commandRegistry?: CommandActions;
  pluginSystem?: PluginSystem;
  pluginDevServer?: PluginDevServer;
  rendererBundleCache?: Map<string, string>;
  secureStorage?: SecureStorage;
  oauthManager?: OAuthManager;
  credentialManager?: CredentialManager;
  getPluginErrors?: () => PluginErrorRecord[];
  /** Return candidate directories to search for README.md (install dir, registry cache, etc.). */
  getReadmeDirs?: (pluginId: string) => Promise<string[]>;
  /** Emitter for auto-invalidating the renderer cache after GraphQL mutations. */
  graphqlEmitter?: GraphqlCacheEmitter;
  /** Factory for creating EntityContext with live integration clients per entity type. */
  entityContextFactory?: (entityType: string) => EntityContext;
  /** Get an integration's authenticated client by integration ID. */
  getIntegrationClient?: (integrationId: string) => Promise<unknown>;
  /** Content profile operations. */
  contentProfiles?: ContentProfileActions;
  /** Inbox action operations. */
  inbox?: InboxActions;
  feedManager?: FeedManager;
  /** Resolve project directories for a project ID. */
  getProjectDirs?: (projectId: string) => string[];
  paths?: ViennaPaths;
  /** Data directory for plugin events persistence (saved events). */
  pluginEventsDataDir?: string;
  /** Inbox action registry for coroutine-style action handlers. */
  inboxActionRegistry?: InboxActionRegistry;
  whisperEmitter?: {
    onDownloadProgress: (payload: {
      model: string;
      file: string;
      progress: number;
      loaded: number;
      total: number;
      modelIndex: number;
      totalModels: number;
    }) => void;
  };
  webUrl: string;
  protocolScheme?: string;
  localPort?: number;
  onProfileSwitch?: (message: string) => void;
  updateChecker?: UpdateChecker;
  focusMonitor?: FocusMonitor;
}

/**
 * Register all IPC handlers. Call once in the main process.
 * Returns a cleanup function to remove handlers on quit.
 */
export function registerIpc(
  ipcMain: IpcMainLike,
  logger: MainLogger,
  options: RegisterIpcOptions = {}
): () => void {
  const notConfigured = () => {
    throw new Error('Not configured');
  };

  const handlers: Record<string, unknown> = {
    ...createSystemHandlers(options.updateChecker),
    ...createShellHandlers(logger),
    ...createLoggerHandlers(logger),
    // Agent handlers — real if SessionManager configured, stubs otherwise
    ...(options.sessionManager && options.providerRegistry
      ? createAgentHandlers(options.sessionManager, options.providerRegistry)
      : {
          agent: {
            startSession: notConfigured,
            stopSession: notConfigured,
            sendMessage: notConfigured,
            respondPermission: notConfigured,
            interrupt: notConfigured,
            getHistory: notConfigured,
            listProviders: notConfigured,
            checkProvider: notConfigured,
            switchModel: notConfigured,
            linkEntity: notConfigured,
            unlinkEntity: notConfigured,
            compactConversation: notConfigured,
          },
        }),
    // GraphQL handlers — real if AppDb configured, stubs otherwise
    ...(options.appDb
      ? createGraphqlHandlers(options.appDb, {
          entityRegistry: options.entityRegistry,
          integrationRegistry: options.integrationRegistry,
          workstream: options.workstreamManager,
          routine: options.routineExecutor,
          tag: options.tagPipelineExecutor,
          tagFileStore: options.tagFileStore,
          entityToolStore: options.entityToolStore,
          registry: options.registry,
          skills: options.skillManager,
          plugins: options.pluginInstaller,
          events: options.pluginSystem ? { getEventSummaries: () => options.pluginSystem!.getEventSummaries() } : undefined,
          gitOps: options.gitOps,
          authManager: options.authManager,
          command: options.commandRegistry,
          emitter: options.graphqlEmitter,
          logger: logger.child({ service: 'IPC-GraphQL' }),
          entityContextFactory: options.entityContextFactory,
          getIntegrationClient: options.getIntegrationClient,
          contentProfiles: options.contentProfiles,
          inbox: options.inbox,
        })
      : {
          graphql: {
            execute: notConfigured,
          },
        }),
    // Auth handlers — real if AuthManager configured, stubs otherwise
    ...(options.authManager && options.deepLinkHandler
      ? createAuthHandlers(logger, {
          authManager: options.authManager,
          deepLinkHandler: options.deepLinkHandler,
          webUrl: options.webUrl,
          protocolScheme: options.protocolScheme ?? 'vienna-dev',
          localPort: options.localPort,
          onProfileSwitch: options.onProfileSwitch,
        })
      : {
          auth: {
            openBrowserAuth: notConfigured,
            getAuthState: notConfigured,
            logout: notConfigured,
          },
        }),
    // Keybindings handlers — real if KeybindingsManager configured, stubs otherwise
    ...(options.keybindingsManager
      ? createKeybindingsHandlers(options.keybindingsManager)
      : {
          keybindings: {
            get: notConfigured,
            getDefaults: notConfigured,
            update: notConfigured,
            resetOne: notConfigured,
            resetAll: notConfigured,
          },
        }),
    // LSP handlers — real if LspManager configured, stubs otherwise
    ...(options.lspManager
      ? createLspHandlers(options.lspManager)
      : {
          lsp: {
            openDocument: notConfigured,
            closeDocument: notConfigured,
            changeDocument: notConfigured,
            saveDocument: notConfigured,
            getHover: notConfigured,
            getDefinition: notConfigured,
            getReferences: notConfigured,
            getCompletions: notConfigured,
            getSignatureHelp: notConfigured,
            getCodeActions: notConfigured,
            prepareRename: notConfigured,
            rename: notConfigured,
            getDocumentSymbols: notConfigured,
            getStatus: notConfigured,
            isServerReady: notConfigured,
            getProjectRoot: notConfigured,
          },
        }),
    // File handlers — real if FileService configured, stubs otherwise
    ...(options.fileService
      ? createFileHandlers(options.fileService)
      : {
          file: {
            read: notConfigured,
            write: notConfigured,
            watch: notConfigured,
            unwatch: notConfigured,
            listDirectory: notConfigured,
          },
        }),
    // Feedback handlers — always available (posts to web backend)
    ...createFeedbackHandlers(options.webUrl),
    // File search handlers — always available
    ...filesHandlers,
    // Plugin handlers — real if PluginSystem configured, stubs otherwise
    ...(options.pluginSystem
      ? createPluginHandlers({
          pluginSystem: options.pluginSystem,
          devServer: options.pluginDevServer,
          rendererBundleCache: options.rendererBundleCache,
          secureStorage: options.secureStorage,
          credentialManager: options.credentialManager,
          getPluginErrors: options.getPluginErrors ?? (() => []),
          getReadmeDirs: options.getReadmeDirs,
          installFromSource: options.pluginInstallFromSource,
          devInstallPort: options.localPort ?? null,
        })
      : {
          plugin: {
            getRendererBundle: notConfigured,
            getLoadedPlugins: notConfigured,
            getCustomizedPlugins: notConfigured,
            getPluginErrors: notConfigured,
            setCredential: notConfigured,
            getCredential: notConfigured,
            removeCredential: notConfigured,
            getCredentialStatus: notConfigured,
            customizePlugin: notConfigured,
            resetPlugin: notConfigured,
            getCustomizationPath: notConfigured,
            getPluginReadme: notConfigured,
            getRendererBundles: notConfigured,
            loadLocalPlugin: notConfigured,
            unloadLocalPlugin: notConfigured,
            getDevInstallPort: notConfigured,
            installFromSource: notConfigured,
            fetch: notConfigured,
          },
        }),
    // OAuth handlers — real if OAuthManager configured, stubs otherwise
    ...(options.oauthManager
      ? createOAuthHandlers({ oauthManager: options.oauthManager })
      : {
          oauth: {
            startFlow: notConfigured,
            getStatus: notConfigured,
            revokeToken: notConfigured,
            submitCode: notConfigured,
            refreshToken: notConfigured,
          },
        }),
    // Quick actions — always available
    // Claude settings discovery — requires AppDb for path validation
    ...(options.appDb
      ? createClaudeSettingsHandlers({ db: options.appDb, logger })
      : {
          claudeSettings: {
            discover: notConfigured,
            listDirectory: notConfigured,
            create: notConfigured,
            readFile: notConfigured,
            writeFile: notConfigured,
          },
        }),
    // Feed handlers — real if FeedManager configured, stubs otherwise
    ...(options.feedManager && options.getProjectDirs
      ? createFeedHandlers({
          feedManager: options.feedManager,
          getProjectDirs: options.getProjectDirs,
        })
      : {
          feed: {
            getFeedWorkstreamId: notConfigured,
            getFeedContent: notConfigured,
            refreshFeed: notConfigured,
            hasFeedConfig: notConfigured,
            listFeedFiles: notConfigured,
            readFeedFile: notConfigured,
            writeFeedFile: notConfigured,
          },
        }),
    // Whisper handlers — real if paths configured, stubs otherwise
    ...(options.paths
      ? createWhisperHandlers(logger, options.paths, options.whisperEmitter)
      : {
          whisper: {
            transcribe: notConfigured,
            twoPassTranscribe: notConfigured,
            getStatus: notConfigured,
            checkMicrophonePermission: notConfigured,
            requestMicrophonePermission: notConfigured,
            checkModelsReady: notConfigured,
            downloadModel: notConfigured,
          },
        }),
    // CLI handlers — always available (manages vcli shell command installation)
    ...createCliHandlers(logger),
    // Zoom handlers — always available (requires AppDb for persistence)
    ...(options.appDb
      ? createZoomHandlers(options.appDb.settings)
      : {
          zoom: {
            zoomIn: notConfigured,
            zoomOut: notConfigured,
            resetZoom: notConfigured,
          },
        }),
    // Focus monitor handlers — real if FocusMonitor configured, stubs otherwise
    ...(options.focusMonitor
      ? createFocusMonitorHandlers(options.focusMonitor)
      : {
          focusMonitor: {
            getCurrentFocus: notConfigured,
            getDetectors: notConfigured,
            getStatus: notConfigured,
            configure: notConfigured,
            activateWindow: notConfigured,
          },
        }),
    // Plugin events handlers — real if PluginSystem configured, stubs otherwise
    ...(options.pluginSystem && options.pluginEventsDataDir
      ? createPluginEventsHandlers({
          pluginSystem: options.pluginSystem,
          dataDir: options.pluginEventsDataDir,
        })
      : {
          pluginEvents: {
            getRegisteredEvents: notConfigured,
            replayEvent: notConfigured,
            saveEvent: notConfigured,
            getSavedEvents: notConfigured,
            deleteSavedEvent: notConfigured,
            clearSavedEvents: notConfigured,
          },
        }),
    // Inbox action handlers — real if registry configured, stubs otherwise
    ...(options.inboxActionRegistry
      ? createInboxActionHandlers(options.inboxActionRegistry)
      : {
          inboxAction: {
            execute: notConfigured,
            respond: notConfigured,
            respondResult: notConfigured,
            cancel: notConfigured,
          },
        }),
  };

  return implement(ipcMain, api, handlers as Parameters<typeof implement>[2]);
}
