/**
 * MCP Bridge Module — Lifecycle and configuration
 *
 * Provides:
 * - initializeMCP() / shutdownMCP() — Socket server lifecycle
 * - buildMCPServerConfig() — MCP server config for WorkstreamManager
 *
 * The socket server listens for NDJSON requests from the MCP server process
 * (@vienna/mcp-entities). That process is spawned by Claude CLI via the
 * mcpServers config — we provide the config, Claude spawns the process.
 *
 * Socket isolation: each Electron instance gets a unique socket path
 * (UUID-based) so dev, branch, and production instances don't collide.
 *
 * @example
 * ```typescript
 * import { initializeMCP, shutdownMCP, buildMCPServerConfig } from './main/mcp';
 *
 * // In app.on('ready')
 * const mcp = await initializeMCP(logger, { db: appDb, entityRegistry, integrationRegistry });
 *
 * // Pass to WorkstreamManager
 * const mcpServers = buildMCPServerConfig(mcp.socketPath, logger);
 *
 * // In app.on('will-quit')
 * await shutdownMCP();
 * ```
 */

import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { app } from 'electron';
import type { Logger } from '@vienna/logger';
import { getEnrichedEnv } from '@vienna/shell-env';
import type { EntityRegistry, IntegrationRegistry, EntityContext } from '@tryvienna/sdk';
import type { AppDb } from '@vienna/app-db';
import type { GraphQLContext, WorkstreamActions, GitOps, TagActions } from '@vienna/graphql';
import type { TagFileStore } from '@vienna/app-db';
import { MCPSocketServer } from './socket-server';
import { createHandlers, type GraphqlCacheEmitter } from './handlers';
import type { IntentClassifier } from '../agent/intent-classifier';

// Re-export types for consumers
export type { MCPHandler, MCPRequest, MCPResponse } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

let server: MCPSocketServer | null = null;
let currentSocketPath: string | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Socket Path
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a unique socket path for this Electron instance. */
function generateSocketPath(): string {
  return path.join(os.tmpdir(), `vienna-mcp-${randomUUID()}.sock`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Node Binary Discovery
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the system Node.js binary for spawning MCP server processes.
 *
 * Uses the user's resolved shell environment (from their interactive login
 * shell) so that node managers like NVM, fnm, and Volta are properly sourced.
 * This is critical for packaged macOS apps launched from Dock/Launchpad,
 * where process.env.PATH is minimal (/usr/bin:/bin:/usr/sbin:/sbin).
 */
export function findNodeBinary(log?: Logger): string | null {
  // First, try to find node using the user's full shell environment.
  // This sources ~/.zshrc / ~/.bashrc, which is where NVM/fnm/Volta/etc.
  // add themselves to PATH. The resolved env is cached for the process lifetime.
  let shellEnv: Record<string, string> | undefined;
  try {
    shellEnv = getEnrichedEnv();
  } catch (err) {
    log?.warn('Could not resolve shell environment — falling back to process PATH', { error: String(err) });
  }

  // eslint-disable-next-line no-restricted-syntax -- Fallback when shell env resolution fails
  const envForExec = shellEnv ?? (process.env as Record<string, string>);

  try {
    const p = execSync('which node', {
      encoding: 'utf8',
      timeout: 3000,
      env: envForExec,
    }).trim();
    if (p && fs.existsSync(p)) {
      log?.debug('Found node via shell PATH', { nodeBinary: p });
      return p;
    }
  } catch {
    log?.debug('Node not found via shell PATH — checking common install locations');
  }

  // Fallback: check well-known installation paths
  const home = os.homedir();
  const candidates = [
    '/usr/local/bin/node',
    '/opt/homebrew/bin/node',
    '/usr/bin/node',
    path.join(home, '.volta', 'bin', 'node'),
  ];

  // NVM: try to resolve the default alias to a concrete node binary.
  // The alias file can contain a bare semver ("22.0.0"), an indirect alias
  // ("lts/*", "lts/iron", "node"), or an arbitrary user alias. We only handle
  // the bare semver case here — indirect aliases would require walking the
  // alias chain, which isn't worth the complexity for a last-resort fallback.
  // The primary path (`which node` with the enriched shell env) already handles
  // all NVM configurations correctly since NVM's init script sets PATH.
  const nvmDir = shellEnv?.NVM_DIR ?? path.join(home, '.nvm');
  const nvmDefault = path.join(nvmDir, 'alias', 'default');
  try {
    if (fs.existsSync(nvmDefault)) {
      const version = fs.readFileSync(nvmDefault, 'utf8').trim();
      if (/^\d+\.\d+\.\d+$/.test(version)) {
        const nvmNodeBin = path.join(nvmDir, 'versions', 'node', `v${version}`, 'bin', 'node');
        if (fs.existsSync(nvmNodeBin)) {
          candidates.unshift(nvmNodeBin);
        }
      }
    }
  } catch {
    // NVM alias resolution failed — not critical, enriched env path covers this
  }

  // fnm: check both the multishell current and the aliases directory
  candidates.push(path.join(home, '.local', 'share', 'fnm', 'aliases', 'default', 'bin', 'node'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      log?.debug('Found node at candidate path', { nodeBinary: candidate });
      return candidate;
    }
  }

  log?.error('No node binary found — MCP server cannot be spawned');
  return null;
}

/**
 * Find the tsx binary for running TypeScript in dev mode.
 * Checks the monorepo's pnpm node_modules structure.
 */
function findTsxBinary(monorepoRoot: string, log?: Logger): string | null {
  const candidates = [
    // pnpm hoisted bin (if publicly hoisted)
    path.join(monorepoRoot, 'node_modules', '.bin', 'tsx'),
    // pnpm internal bin (always available when tsx is any dep)
    path.join(monorepoRoot, 'node_modules', '.pnpm', 'node_modules', '.bin', 'tsx'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      log?.debug('Found tsx binary', { tsxBinary: candidate });
      return candidate;
    }
  }

  // Fallback: try resolving from the user's shell PATH (consistent with findNodeBinary)
  try {
    // eslint-disable-next-line no-restricted-syntax -- Fallback when shell env resolution fails
    const env = (() => { try { return getEnrichedEnv(); } catch { return process.env as Record<string, string>; } })();
    const p = execSync('which tsx', { encoding: 'utf8', timeout: 3000, env }).trim();
    if (p && fs.existsSync(p)) {
      log?.debug('Found tsx via PATH', { tsxBinary: p });
      return p;
    }
  } catch {
    // Not in PATH
  }

  log?.error('tsx not found', { candidates });
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

interface InitializeMCPOptions {
  db: AppDb;
  entityRegistry: EntityRegistry;
  integrationRegistry: IntegrationRegistry;
  graphqlEmitter?: GraphqlCacheEmitter;
  /** Factory for creating EntityContext with live integration clients per entity type. */
  entityContextFactory?: (entityType: string) => EntityContext;
  /** Get an integration's authenticated client by integration ID. */
  getIntegrationClient?: (integrationId: string) => Promise<unknown>;
  /** Optional intent classifier for semantic operation matching in graphql.operations */
  intentClassifier?: IntentClassifier;
  /** Fetch recent conversation messages for a workstream (for classifier context) */
  getRecentMessages?: (workstreamId: string) => string[];
  /** Workstream agent operations — required for sendWorkstreamMessage */
  workstream?: WorkstreamActions;
  /** Git operations — required for worktree creation in createWorkstream */
  gitOps?: GitOps;
  /** Tag pipeline operations — required for tag status updates and pipeline advancement */
  tag?: TagActions;
  /** Tag file store for JSON-based tag definitions — required for tag CRUD and apply */
  tagFileStore?: TagFileStore;
}

export interface MCPInitResult {
  socketPath: string;
}

/**
 * Start the MCP socket server.
 *
 * Creates a Unix socket that @vienna/mcp-entities connects to.
 * Call in app.on('ready') after entity registries are initialized.
 */
export async function initializeMCP(
  logger: Logger,
  options: InitializeMCPOptions,
): Promise<MCPInitResult> {
  if (server) {
    logger.warn('MCP already initialized');
    return { socketPath: currentSocketPath! };
  }

  const socketPath = generateSocketPath();
  const log = logger.child({ service: 'MCP' });

  log.info('Initializing MCP bridge', { socketPath });

  const socketServer = new MCPSocketServer(socketPath, log);

  // Build GraphQL context — same execution path as the renderer IPC
  const graphqlContext: GraphQLContext = {
    db: options.db,
    userId: null,
    entityRegistry: options.entityRegistry,
    integrationRegistry: options.integrationRegistry,
    entityContextFactory: options.entityContextFactory,
    getIntegrationClient: options.getIntegrationClient,
    workstream: options.workstream,
    gitOps: options.gitOps,
    tag: options.tag,
    tagFileStore: options.tagFileStore,
  };

  // Register handlers
  const handlers = createHandlers({
    graphqlContext,
    graphqlEmitter: options.graphqlEmitter,
    log,
    intentClassifier: options.intentClassifier,
    getRecentMessages: options.getRecentMessages,
  });
  for (const [method, handler] of handlers) {
    socketServer.registerHandler(method, handler);
  }

  log.info('Registered MCP handlers', { methods: Array.from(handlers.keys()) });

  await socketServer.start();

  server = socketServer;
  currentSocketPath = socketPath;

  log.info('MCP bridge initialized successfully', { socketPath });

  return { socketPath };
}

/**
 * Stop the MCP socket server.
 * Call in app.on('will-quit').
 */
export async function shutdownMCP(): Promise<void> {
  if (server) {
    await server.stop();
    server = null;
    currentSocketPath = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP Server Config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the mcpServers config that WorkstreamManager passes to agent sessions.
 *
 * This tells Claude CLI how to spawn the @vienna/mcp-entities process and
 * what env vars to give it (including the socket path for this instance).
 *
 * Dev mode: runs TypeScript source via `npx tsx` from the monorepo
 * Production: runs bundled JS from app resources via `node`
 */
export function buildMCPServerConfig(
  socketPath: string,
  log?: Logger,
): Record<string, { command: string; args?: string[]; env?: Record<string, string> }> {
  const mcpLog = log?.child({ service: 'MCP' });
  const isPackaged = app.isPackaged;

  mcpLog?.info('Building MCP server config', { socketPath, isPackaged });

  let command: string;
  let args: string[];

  if (isPackaged) {
    // Production: bundled JS copied to resources/mcp-entities/index.js during build
    const resourcesPath = process.resourcesPath || path.join(app.getAppPath(), '..', 'Resources');
    const mcpServerPath = path.join(resourcesPath, 'mcp-entities', 'index.js');

    const nodeBinary = findNodeBinary(mcpLog);
    if (!nodeBinary) {
      mcpLog?.error('Cannot build MCP server config — no node binary found');
      return {};
    }

    if (!fs.existsSync(mcpServerPath)) {
      mcpLog?.error('MCP entities server not found in app resources', {
        expectedPath: mcpServerPath,
        resourcesPath,
      });
      return {};
    }

    command = nodeBinary;
    args = [mcpServerPath];
    mcpLog?.info('Production MCP server path', { mcpServerPath, nodeBinary });
  } else {
    // Development: run TypeScript source via tsx from the monorepo.
    // process.cwd() is apps/desktop in dev, go up 2 levels to monorepo root.
    const monorepoRoot = path.resolve(process.cwd(), '..', '..');
    const mcpServerPath = path.join(monorepoRoot, 'packages', 'mcp-entities', 'src', 'index.ts');

    if (!fs.existsSync(mcpServerPath)) {
      mcpLog?.error('MCP entities server not found in monorepo', {
        expectedPath: mcpServerPath,
        monorepoRoot,
        cwd: process.cwd(),
      });
      return {};
    }

    // Find tsx binary — Claude CLI spawns from agent CWD, so we need an absolute path.
    const tsxBinary = findTsxBinary(monorepoRoot, mcpLog);
    if (!tsxBinary) {
      mcpLog?.error('tsx not found — cannot run MCP entities server in dev mode');
      return {};
    }

    command = tsxBinary;
    args = [mcpServerPath];
    mcpLog?.info('Development MCP server path', { mcpServerPath, tsxBinary, monorepoRoot, cwd: process.cwd() });
  }

  const config = {
    'vienna-entities': {
      command,
      args,
      env: {
        MCP_SOCKET_PATH: socketPath,
      },
    },
  };

  mcpLog?.info('MCP server config built', {
    serverName: 'vienna-entities',
    command,
    args,
    socketPath,
  });

  return config;
}
