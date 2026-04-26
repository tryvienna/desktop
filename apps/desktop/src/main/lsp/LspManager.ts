/**
 * LSP Manager
 *
 * Manages all LSP server instances across projects.
 * Handles server lifecycle, request routing, and document synchronization.
 *
 * Architecture:
 * - One LSP server per project (directory)
 * - Documents are tracked by URI and mapped to projects
 * - Requests are routed to the appropriate server based on file URI
 *
 * Not a singleton — instantiated in main.ts and injected via IPC.
 *
 * @module main/lsp/LspManager
 */

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from '@vienna/logger';
import { LspServerInstance } from './LspServerInstance';
import type { LspServerConfig } from './LspServerInstance';
import { getTypeScriptServerConfig, isTypeScriptLanguage } from './servers/typescript';
import type {
  ServerCapabilities,
  PublishDiagnosticsParams,
  CompletionList,
  CompletionItem,
  Hover,
  Location,
  LocationLink,
  SignatureHelp,
  DocumentSymbol,
  SymbolInformation,
  TextDocumentItem,
  CodeAction,
  CodeActionContext,
  WorkspaceEdit,
  PrepareRenameResult,
  Range,
} from './LspTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpenDocument {
  uri: string;
  languageId: string;
  version: number;
  projectId: string;
}

/** Callbacks for forwarding events to IPC emitter. */
export interface LspManagerCallbacks {
  onDiagnostics: (data: { uri: string; diagnostics: PublishDiagnosticsParams['diagnostics'] }) => void;
  onServerReady: (data: { projectRoot: string }) => void;
  onServerStopped: (data: { projectRoot: string; reason?: string }) => void;
}

export interface LspManagerOptions {
  readonly logger: Logger;
  readonly callbacks: LspManagerCallbacks;
}

// ---------------------------------------------------------------------------
// LSP Manager
// ---------------------------------------------------------------------------

export class LspManager {
  private readonly servers = new Map<string, LspServerInstance>();
  private readonly openDocuments = new Map<string, OpenDocument>();
  private readonly logger: Logger;
  private readonly callbacks: LspManagerCallbacks;

  constructor(options: LspManagerOptions) {
    this.logger = options.logger;
    this.callbacks = options.callbacks;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Server Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  async ensureServerForProject(projectRoot: string): Promise<LspServerInstance | null> {
    const projectId = projectRoot;

    if (this.servers.has(projectId)) {
      const server = this.servers.get(projectId)!;
      if (server.isReady()) return server;

      if (server.getState() === 'starting') {
        const ready = await server.waitForReady();
        return ready ? server : null;
      }
    }

    const config = this.getServerConfig(projectRoot);
    if (!config) {
      this.logger.debug('No LSP server available for project', { projectId });
      return null;
    }

    const server = new LspServerInstance({
      projectId,
      rootUri: `file://${projectRoot}`,
      config,
      logger: this.logger,
      initOptions: {
        preferences: {
          includeCompletionsForModuleExports: true,
          includeCompletionsWithInsertText: true,
        },
      },
    });

    server.setCallbacks({
      onReady: (_capabilities: ServerCapabilities) => {
        this.callbacks.onServerReady({ projectRoot: projectId });
      },
      onDiagnostics: (params: PublishDiagnosticsParams) => {
        this.callbacks.onDiagnostics({
          uri: params.uri,
          diagnostics: params.diagnostics,
        });
      },
      onExit: () => {
        this.servers.delete(projectId);
        this.callbacks.onServerStopped({ projectRoot: projectId });
      },
      onError: (err: Error) => {
        this.logger.error('LSP server error', {
          projectId,
          error: err.message,
        });
      },
    });

    this.servers.set(projectId, server);

    try {
      await server.start();
      return server;
    } catch {
      this.servers.delete(projectId);
      return null;
    }
  }

  private getServerConfig(projectRoot: string): LspServerConfig | null {
    const hasPackageJson = fs.existsSync(path.join(projectRoot, 'package.json'));
    const hasTsConfig = fs.existsSync(path.join(projectRoot, 'tsconfig.json'));

    if (hasPackageJson || hasTsConfig) {
      return getTypeScriptServerConfig(projectRoot, this.logger);
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Document Sync
  // ─────────────────────────────────────────────────────────────────────────

  async openDocument(uri: string, languageId: string, text: string): Promise<{ opened: boolean }> {
    this.logger.info('Opening document with LSP', { uri, languageId });

    if (!isTypeScriptLanguage(languageId)) {
      this.logger.info('Language not supported by LSP', { languageId });
      return { opened: false };
    }

    const filePath = uri.replace('file://', '');
    const projectRoot = await this.detectProjectRoot(filePath);

    if (!projectRoot) {
      this.logger.warn('No project root found for file', { filePath });
      return { opened: false };
    }

    const server = await this.ensureServerForProject(projectRoot);
    if (!server) {
      this.logger.error('Failed to start LSP server for project', { projectRoot });
      return { opened: false };
    }

    // If already tracked as open (e.g. previous close was lost in a race),
    // close the stale document first to avoid "Can't open already open document".
    const existing = this.openDocuments.get(uri);
    if (existing) {
      const existingServer = this.servers.get(existing.projectId);
      if (existingServer?.isReady()) {
        existingServer.notify('textDocument/didClose', { textDocument: { uri } });
      }
      this.openDocuments.delete(uri);
    }

    this.openDocuments.set(uri, { uri, languageId, version: 1, projectId: projectRoot });

    const textDocument: TextDocumentItem = { uri, languageId, version: 1, text };
    server.notify('textDocument/didOpen', { textDocument });

    this.logger.info('Document opened with LSP server', { uri, projectRoot });
    return { opened: true };
  }

  changeDocument(uri: string, text: string): { success: boolean } {
    const doc = this.openDocuments.get(uri);
    if (!doc) return { success: false };

    const server = this.servers.get(doc.projectId);
    if (!server?.isReady()) return { success: false };

    doc.version++;
    server.notify('textDocument/didChange', {
      textDocument: { uri, version: doc.version },
      contentChanges: [{ text }],
    });
    return { success: true };
  }

  closeDocument(uri: string): { success: boolean } {
    const doc = this.openDocuments.get(uri);
    if (!doc) return { success: false };

    const server = this.servers.get(doc.projectId);
    if (server?.isReady()) {
      server.notify('textDocument/didClose', { textDocument: { uri } });
    }

    this.openDocuments.delete(uri);
    return { success: true };
  }

  saveDocument(uri: string, text?: string): { success: boolean } {
    const doc = this.openDocuments.get(uri);
    if (!doc) return { success: false };

    const server = this.servers.get(doc.projectId);
    if (!server?.isReady()) return { success: false };

    server.notify('textDocument/didSave', { textDocument: { uri }, text });
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LSP Requests
  // ─────────────────────────────────────────────────────────────────────────

  async getHover(uri: string, line: number, character: number): Promise<Hover | null> {
    const server = this.getServerForUri(uri);
    if (!server) return null;

    try {
      return await server.request<Hover | null>('textDocument/hover', {
        textDocument: { uri },
        position: { line, character },
      });
    } catch (err) {
      this.logger.error('LSP hover error', { uri, error: (err as Error).message });
      return null;
    }
  }

  async getDefinition(
    uri: string,
    line: number,
    character: number,
  ): Promise<Location | Location[] | LocationLink[] | null> {
    const server = this.getServerForUri(uri);
    if (!server) {
      this.logger.warn('LSP definition: no server for URI', { uri });
      return null;
    }

    try {
      const result = await server.request('textDocument/definition', {
        textDocument: { uri },
        position: { line, character },
      });
      this.logger.debug('LSP definition result', { uri, line, character, result: JSON.stringify(result) });
      return result as unknown as Location | Location[] | LocationLink[] | null;
    } catch (err) {
      this.logger.error('LSP definition error', { uri, line, character, error: (err as Error).message });
      return null;
    }
  }

  async getReferences(
    uri: string,
    line: number,
    character: number,
    includeDeclaration = true,
  ): Promise<Location[] | null> {
    const server = this.getServerForUri(uri);
    if (!server) return null;

    try {
      return await server.request('textDocument/references', {
        textDocument: { uri },
        position: { line, character },
        context: { includeDeclaration },
      });
    } catch (err) {
      this.logger.error('LSP references error', { uri, error: (err as Error).message });
      return null;
    }
  }

  async getCompletions(
    uri: string,
    line: number,
    character: number,
  ): Promise<CompletionList | CompletionItem[] | null> {
    const server = this.getServerForUri(uri);
    if (!server) return null;

    try {
      return await server.request('textDocument/completion', {
        textDocument: { uri },
        position: { line, character },
      });
    } catch (err) {
      this.logger.error('LSP completion error', { error: (err as Error).message });
      return null;
    }
  }

  async getSignatureHelp(uri: string, line: number, character: number): Promise<SignatureHelp | null> {
    const server = this.getServerForUri(uri);
    if (!server) return null;

    try {
      return await server.request('textDocument/signatureHelp', {
        textDocument: { uri },
        position: { line, character },
      });
    } catch (err) {
      this.logger.error('LSP signature help error', { error: (err as Error).message });
      return null;
    }
  }

  async getDocumentSymbols(uri: string): Promise<DocumentSymbol[] | SymbolInformation[] | null> {
    const server = this.getServerForUri(uri);
    if (!server) return null;

    try {
      return await server.request('textDocument/documentSymbol', { textDocument: { uri } });
    } catch (err) {
      this.logger.error('LSP document symbols error', { error: (err as Error).message });
      return null;
    }
  }

  async getCodeActions(uri: string, range: Range, context: CodeActionContext): Promise<CodeAction[] | null> {
    const server = this.getServerForUri(uri);
    if (!server) return null;

    try {
      return await server.request('textDocument/codeAction', {
        textDocument: { uri },
        range,
        context,
      });
    } catch (err) {
      this.logger.error('LSP code actions error', { error: (err as Error).message });
      return null;
    }
  }

  async prepareRename(uri: string, line: number, character: number): Promise<PrepareRenameResult | Range | null> {
    const server = this.getServerForUri(uri);
    if (!server) return null;

    try {
      return await server.request('textDocument/prepareRename', {
        textDocument: { uri },
        position: { line, character },
      });
    } catch (err) {
      this.logger.error('LSP prepare rename error', { error: (err as Error).message });
      return null;
    }
  }

  async rename(uri: string, line: number, character: number, newName: string): Promise<WorkspaceEdit | null> {
    const server = this.getServerForUri(uri);
    if (!server) return null;

    try {
      return await server.request('textDocument/rename', {
        textDocument: { uri },
        position: { line, character },
        newName,
      });
    } catch (err) {
      this.logger.error('LSP rename error', { error: (err as Error).message });
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private getServerForUri(uri: string): LspServerInstance | null {
    const doc = this.openDocuments.get(uri);
    if (doc) {
      const server = this.servers.get(doc.projectId);
      if (server?.isReady()) return server;
      return null;
    }

    // Fallback: find by file path prefix
    const filePath = uri.replace('file://', '');
    for (const [projectRoot, server] of this.servers) {
      if (filePath.startsWith(projectRoot) && server.isReady()) return server;
    }

    this.logger.warn('No LSP server found for URI', { uri });
    return null;
  }

  async detectProjectRoot(filePath: string): Promise<string | null> {
    const projectMarkers = ['package.json', 'tsconfig.json', '.git'];
    let currentDir = path.dirname(filePath);
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      for (const marker of projectMarkers) {
        try {
          await fsPromises.access(path.join(currentDir, marker));
          return currentDir;
        } catch {
          // Marker doesn't exist
        }
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shutdown
  // ─────────────────────────────────────────────────────────────────────────

  async stopAll(): Promise<void> {
    this.logger.info('Stopping all LSP servers');
    const stops = Array.from(this.servers.values()).map((s) => s.stop());
    await Promise.all(stops);
    this.servers.clear();
    this.openDocuments.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status
  // ─────────────────────────────────────────────────────────────────────────

  getStatus(): Array<{ projectId: string; state: string; openDocuments: number }> {
    return Array.from(this.servers.entries()).map(([projectId, server]) => ({
      projectId,
      state: server.getState(),
      openDocuments: Array.from(this.openDocuments.values()).filter((d) => d.projectId === projectId).length,
    }));
  }

  isServerReady(projectId: string): boolean {
    return this.servers.get(projectId)?.isReady() ?? false;
  }

  getCapabilities(projectId: string): ServerCapabilities | null {
    return this.servers.get(projectId)?.getCapabilities() ?? null;
  }
}
