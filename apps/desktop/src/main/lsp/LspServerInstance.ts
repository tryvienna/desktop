/**
 * LSP Server Instance
 *
 * Manages a single LSP server child process.
 * Handles process lifecycle, initialization, and protocol communication.
 *
 * Not a singleton — instantiated by LspManager with dependency injection.
 *
 * @module main/lsp/LspServerInstance
 */

import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { getEnrichedEnv } from '@vienna/shell-env';
import type { Logger } from '@vienna/logger';
import { LspProtocol } from './LspProtocol';
import type {
  ServerCapabilities,
  InitializeParams,
  InitializeResult,
  ClientCapabilities,
  PublishDiagnosticsParams,
  LogMessageParams,
} from './LspTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LspServerConfig {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd?: string;
  readonly env?: Record<string, string>;
}

export type LspServerState = 'stopped' | 'starting' | 'ready' | 'error' | 'stopping';

export interface LspServerInstanceOptions {
  readonly projectId: string;
  readonly rootUri: string;
  readonly config: LspServerConfig;
  readonly logger: Logger;
  readonly initOptions?: Record<string, unknown>;
}

/** Typed event callbacks for server lifecycle. */
export interface LspServerCallbacks {
  onReady: (capabilities: ServerCapabilities) => void;
  onDiagnostics: (params: PublishDiagnosticsParams) => void;
  onExit: (code: number | null) => void;
  onError: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Default Client Capabilities
// ---------------------------------------------------------------------------

const DEFAULT_CLIENT_CAPABILITIES: ClientCapabilities = {
  textDocument: {
    synchronization: {
      dynamicRegistration: true,
      willSave: false,
      willSaveWaitUntil: false,
      didSave: true,
    },
    completion: {
      dynamicRegistration: true,
      completionItem: {
        snippetSupport: true,
        commitCharactersSupport: true,
        documentationFormat: ['markdown', 'plaintext'],
        deprecatedSupport: true,
        preselectSupport: true,
      },
      contextSupport: true,
    },
    hover: {
      dynamicRegistration: true,
      contentFormat: ['markdown', 'plaintext'],
    },
    signatureHelp: {
      dynamicRegistration: true,
      signatureInformation: {
        documentationFormat: ['markdown', 'plaintext'],
        parameterInformation: { labelOffsetSupport: true },
      },
    },
    definition: { dynamicRegistration: true, linkSupport: true },
    typeDefinition: { dynamicRegistration: true, linkSupport: true },
    implementation: { dynamicRegistration: true, linkSupport: true },
    references: { dynamicRegistration: true },
    documentHighlight: { dynamicRegistration: true },
    documentSymbol: {
      dynamicRegistration: true,
      hierarchicalDocumentSymbolSupport: true,
    },
    codeAction: {
      dynamicRegistration: true,
      codeActionLiteralSupport: {
        codeActionKind: {
          valueSet: [
            'quickfix',
            'refactor',
            'refactor.extract',
            'refactor.inline',
            'refactor.rewrite',
            'source',
            'source.organizeImports',
          ],
        },
      },
    },
    codeLens: { dynamicRegistration: true },
    formatting: { dynamicRegistration: true },
    rangeFormatting: { dynamicRegistration: true },
    rename: { dynamicRegistration: true, prepareSupport: true },
    publishDiagnostics: {
      relatedInformation: true,
      tagSupport: { valueSet: [1, 2] },
      versionSupport: true,
    },
    foldingRange: {
      dynamicRegistration: true,
      lineFoldingOnly: false,
    },
  },
  workspace: {
    applyEdit: true,
    workspaceEdit: { documentChanges: true },
    didChangeConfiguration: { dynamicRegistration: true },
    didChangeWatchedFiles: { dynamicRegistration: true },
    symbol: { dynamicRegistration: true },
    executeCommand: { dynamicRegistration: true },
    workspaceFolders: true,
    configuration: true,
  },
  window: {
    workDoneProgress: true,
  },
};

// ---------------------------------------------------------------------------
// LSP Server Instance
// ---------------------------------------------------------------------------

export class LspServerInstance {
  private process: ChildProcess | null = null;
  private protocol: LspProtocol | null = null;
  private capabilities: ServerCapabilities | null = null;
  private state: LspServerState = 'stopped';
  private restartCount = 0;
  private readonly maxRestarts = 3;

  private readonly projectId: string;
  private readonly rootUri: string;
  private readonly config: LspServerConfig;
  private readonly logger: Logger;
  private readonly initOptions?: Record<string, unknown>;
  private callbacks: LspServerCallbacks | null = null;
  private readyWaiters: Array<(ready: boolean) => void> = [];

  constructor(options: LspServerInstanceOptions) {
    this.projectId = options.projectId;
    this.rootUri = options.rootUri;
    this.config = options.config;
    this.logger = options.logger;
    this.initOptions = options.initOptions;
  }

  /** Set lifecycle callbacks. Must be called before start(). */
  setCallbacks(callbacks: LspServerCallbacks): void {
    this.callbacks = callbacks;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.process) {
      this.logger.debug('LSP server already running', { projectId: this.projectId });
      return;
    }

    this.setState('starting');
    this.logger.info('Starting LSP server', {
      projectId: this.projectId,
      command: this.config.command,
      args: this.config.args.join(' '),
    });

    try {
      this.process = spawn(this.config.command, [...this.config.args], {
        cwd: this.config.cwd ?? this.rootUri.replace('file://', ''),
        env: getEnrichedEnv(this.config.env),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.on('error', (err) => {
        this.logger.error('LSP process error', {
          projectId: this.projectId,
          error: err.message,
        });
        this.setState('error');
        this.callbacks?.onError(err);
      });

      this.process.on('exit', (code, signal) => {
        this.logger.info('LSP process exited', { projectId: this.projectId, code, signal });
        this.cleanup();
        this.callbacks?.onExit(code);

        // Auto-restart on unexpected crashes
        if (code !== 0 && this.state !== 'stopping' && this.restartCount < this.maxRestarts) {
          this.restartCount++;
          this.logger.info('Auto-restarting LSP server', {
            projectId: this.projectId,
            attempt: this.restartCount,
            maxRestarts: this.maxRestarts,
          });
          setTimeout(() => void this.start(), 1000 * this.restartCount);
        }
      });

      this.protocol = new LspProtocol(
        (data) => {
          if (this.process?.stdin?.writable) {
            this.process.stdin.write(data);
          }
        },
        (method, params) => this.handleNotification(method, params),
        this.logger,
        (method, params, id) => this.handleServerRequest(method, params, id),
      );

      this.process.stdout?.on('data', (data: Buffer) => {
        this.protocol?.handleData(data.toString('utf8'));
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf8').trim();
        if (text) {
          this.logger.debug('LSP server stderr', {
            projectId: this.projectId,
            output: text.slice(0, 500),
          });
        }
      });

      await this.initialize();
      this.restartCount = 0;
    } catch (err) {
      this.logger.error('Failed to start LSP server', {
        projectId: this.projectId,
        error: (err as Error).message,
      });
      // Kill the spawned child process so we don't leak an orphan when
      // initialize() throws after spawn. Prefer SIGTERM; the process's
      // 'exit' handler will clean up references.
      if (this.process) {
        try {
          this.process.kill('SIGTERM');
          // Hard stop after a short grace period if the server ignores SIGTERM.
          const processRef = this.process;
          setTimeout(() => {
            if (!processRef.killed) processRef.kill('SIGKILL');
          }, 2000).unref();
        } catch (killErr) {
          this.logger.warn('Failed to kill LSP process after init failure', {
            projectId: this.projectId,
            error: (killErr as Error).message,
          });
        }
      }
      this.setState('error');
      this.callbacks?.onError(err as Error);
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (!this.process) return;

    this.setState('stopping');
    this.logger.info('Stopping LSP server', { projectId: this.projectId });

    try {
      if (this.protocol && this.state !== 'error') {
        await Promise.race([
          this.protocol.request('shutdown', null),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 5000)),
        ]).catch(() => {});

        this.protocol.notify('exit', null);
      }

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            this.logger.warn('Force killing LSP process', { projectId: this.projectId });
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 3000);

        if (this.process) {
          this.process.once('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        } else {
          clearTimeout(timeout);
          resolve();
        }
      });
    } catch (err) {
      this.logger.error('Error during LSP shutdown', {
        projectId: this.projectId,
        error: (err as Error).message,
      });
      this.process?.kill('SIGKILL');
    } finally {
      this.cleanup();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────────────────

  private async initialize(): Promise<void> {
    if (!this.protocol) throw new Error('Protocol not initialized');

    const params: InitializeParams = {
      processId: process.pid,
      clientInfo: { name: 'Vienna', version: '1.0.0' },
      rootUri: this.rootUri,
      rootPath: this.rootUri.replace('file://', ''),
      capabilities: DEFAULT_CLIENT_CAPABILITIES,
      workspaceFolders: [{ uri: this.rootUri, name: this.projectId }],
      initializationOptions: this.initOptions,
    };

    this.logger.debug('Sending LSP initialize request', { projectId: this.projectId });
    const result = await this.protocol.request<InitializeResult>('initialize', params);

    this.capabilities = result.capabilities;
    this.logger.info('LSP server initialized', {
      projectId: this.projectId,
      serverInfo: result.serverInfo,
    });

    this.protocol.notify('initialized', {});
    this.setState('ready');
    this.callbacks?.onReady(this.capabilities);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications from Server
  // ─────────────────────────────────────────────────────────────────────────

  private handleNotification(method: string, params: unknown): void {
    switch (method) {
      case 'textDocument/publishDiagnostics':
        this.callbacks?.onDiagnostics(params as PublishDiagnosticsParams);
        break;
      case 'window/logMessage': {
        const logMsg = params as LogMessageParams;
        this.logger.debug('LSP server log', { projectId: this.projectId, message: logMsg.message });
        break;
      }
      case 'window/showMessage':
        this.logger.debug('LSP server message', { projectId: this.projectId, params });
        break;
      case '$/progress':
        break;
      default:
        if (!method.startsWith('$/')) {
          this.logger.trace('LSP notification', { projectId: this.projectId, method });
        }
    }
  }

  private handleServerRequest(method: string, _params: unknown, id: number | string): void {
    switch (method) {
      case 'workspace/configuration':
        this.protocol?.respond(id, [{}]);
        break;
      case 'client/registerCapability':
      case 'window/workDoneProgress/create':
        this.protocol?.respond(id, null);
        break;
      default:
        this.logger.debug('LSP server request', { projectId: this.projectId, method });
        this.protocol?.respond(id, null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LSP Requests
  // ─────────────────────────────────────────────────────────────────────────

  async request<T>(method: string, params: unknown): Promise<T> {
    if (this.state !== 'ready') {
      throw new Error(`Server not ready (state: ${this.state})`);
    }
    if (!this.protocol) {
      throw new Error('Protocol not initialized');
    }
    return this.protocol.request<T>(method, params);
  }

  notify(method: string, params: unknown): void {
    if (this.state !== 'ready') {
      this.logger.warn('Cannot send LSP notification, server not ready', {
        projectId: this.projectId,
        state: this.state,
      });
      return;
    }
    this.protocol?.notify(method, params);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  private setState(newState: LspServerState): void {
    this.state = newState;
    if (newState === 'ready' || newState === 'error' || newState === 'stopped') {
      const isReady = newState === 'ready';
      for (const resolve of this.readyWaiters) resolve(isReady);
      this.readyWaiters = [];
    }
  }

  private cleanup(): void {
    this.protocol?.reset();
    this.process = null;
    this.protocol = null;
    this.setState('stopped');
  }

  getState(): LspServerState {
    return this.state;
  }

  getCapabilities(): ServerCapabilities | null {
    return this.capabilities;
  }

  isReady(): boolean {
    return this.state === 'ready';
  }

  /**
   * Returns a promise that resolves when the server reaches a terminal state.
   * Resolves to `true` if ready, `false` if error/stopped.
   * Includes a safety timeout to prevent indefinite waiting.
   */
  waitForReady(timeoutMs = 30_000): Promise<boolean> {
    if (this.state === 'ready') return Promise.resolve(true);
    if (this.state === 'error' || this.state === 'stopped') return Promise.resolve(false);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const idx = this.readyWaiters.indexOf(resolve);
        if (idx !== -1) this.readyWaiters.splice(idx, 1);
        resolve(false);
      }, timeoutMs);
      this.readyWaiters.push((ready) => {
        clearTimeout(timer);
        resolve(ready);
      });
    });
  }

  getProjectId(): string {
    return this.projectId;
  }
}
