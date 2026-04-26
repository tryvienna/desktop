/**
 * MCP Socket Server — NDJSON over Unix socket
 *
 * Listens on a Unix socket for NDJSON requests from the MCP server process
 * (@vienna/mcp-entities). Routes requests to registered handlers by method name.
 *
 * Architecture:
 *   MCP Server Process (spawned by Claude CLI)
 *       ↓ Unix Socket (NDJSON)
 *   MCPSocketServer (this file)
 *       ↓
 *   Handlers (EntityRegistry, IntegrationRegistry)
 */

import * as net from 'node:net';
import * as fs from 'node:fs';
import type { Logger } from '@vienna/logger';
import { MCPRequestSchema, MCPErrorCode, type MCPResponse, type MCPHandler } from './types';

interface ClientConnection {
  id: string;
  socket: net.Socket;
  buffer: string;
}

export class MCPSocketServer {
  private server: net.Server | null = null;
  private handlers = new Map<string, MCPHandler>();
  private clients = new Map<string, ClientConnection>();
  private clientIdCounter = 0;

  constructor(
    private readonly socketPath: string,
    private readonly log: Logger,
  ) {}

  // ─── Handler Registration ──────────────────────────────────────────────────

  registerHandler(method: string, handler: MCPHandler): void {
    this.handlers.set(method, handler);
  }

  getRegisteredMethods(): string[] {
    return Array.from(this.handlers.keys());
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.server) return;

    this.removeStaleSocket();

    this.server = net.createServer((socket) => this.handleConnection(socket));

    this.server.on('error', (error) => {
      this.log.error('Socket server error', { error: String(error) });
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.listen(this.socketPath, () => {
        this.log.info('MCP socket server started', {
          socketPath: this.socketPath,
          methods: this.getRegisteredMethods(),
        });
        resolve();
      });
      this.server!.once('error', reject);
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;

    for (const client of this.clients.values()) {
      client.socket.destroy();
    }
    this.clients.clear();

    await new Promise<void>((resolve) => {
      this.server!.close(() => {
        this.server = null;
        resolve();
      });
    });

    this.removeStaleSocket();
    this.log.info('MCP socket server stopped');
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private removeStaleSocket(): void {
    try {
      if (fs.existsSync(this.socketPath)) {
        fs.unlinkSync(this.socketPath);
      }
    } catch {
      // Socket may not exist or may be in use — safe to ignore
    }
  }

  private handleConnection(socket: net.Socket): void {
    const clientId = `client-${++this.clientIdCounter}`;
    const client: ClientConnection = { id: clientId, socket, buffer: '' };
    this.clients.set(clientId, client);

    this.log.info('MCP client connected', { clientId });

    socket.on('data', (data: Buffer) => this.handleData(client, data));

    socket.on('close', () => {
      this.clients.delete(clientId);
      this.log.info('MCP client disconnected', { clientId });
    });

    socket.on('error', (error) => {
      this.log.error('MCP client error', { clientId, error: String(error) });
      this.clients.delete(clientId);
    });
  }

  private handleData(client: ClientConnection, data: Buffer): void {
    client.buffer += data.toString('utf-8');

    const lines = client.buffer.split('\n');
    client.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.trim()) {
        void this.processLine(client, line);
      }
    }
  }

  private async processLine(client: ClientConnection, line: string): Promise<void> {
    let requestId = 'unknown';

    try {
      const parsed = JSON.parse(line);
      requestId = parsed.id ?? 'unknown';

      const validation = MCPRequestSchema.safeParse(parsed);
      if (!validation.success) {
        this.log.warn('Invalid MCP request', { clientId: client.id, requestId, errors: validation.error.errors });
        this.sendResponse(client, {
          id: requestId,
          error: {
            code: MCPErrorCode.INVALID_REQUEST,
            message: `Invalid request: ${validation.error.errors.map((e) => e.message).join(', ')}`,
          },
        });
        return;
      }

      const request = validation.data;
      this.log.info('MCP request received', { clientId: client.id, requestId: request.id, method: request.method });
      const handler = this.handlers.get(request.method);

      if (!handler) {
        this.log.warn('Unknown MCP method', { clientId: client.id, requestId: request.id, method: request.method, availableMethods: this.getRegisteredMethods() });
        this.sendResponse(client, {
          id: request.id,
          error: {
            code: MCPErrorCode.METHOD_NOT_FOUND,
            message: `Unknown method: ${request.method}`,
          },
        });
        return;
      }

      const startTime = Date.now();
      const result = await handler(request.params ?? {});
      this.log.info('MCP request completed', { clientId: client.id, requestId: request.id, method: request.method, durationMs: Date.now() - startTime });
      this.sendResponse(client, { id: request.id, result });
    } catch (error) {
      this.log.error('Handler error', { requestId, error: String(error) });
      this.sendResponse(client, {
        id: requestId,
        error: {
          code: MCPErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private sendResponse(client: ClientConnection, response: MCPResponse): void {
    try {
      client.socket.write(JSON.stringify(response) + '\n');
    } catch (error) {
      this.log.error('Failed to send response', {
        clientId: client.id,
        error: String(error),
      });
    }
  }
}
