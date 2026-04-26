/**
 * Unix Socket Bridge — Production ToolContext implementation
 *
 * Communicates with the Electron main process via NDJSON over Unix socket.
 * Socket path is injected via MCP_SOCKET_PATH environment variable,
 * ensuring isolation between multiple Electron instances.
 *
 * Protocol: newline-delimited JSON (NDJSON)
 * Request:  {"id":"uuid","method":"entity.search","params":{...}}
 * Response: {"id":"uuid","result":{...}} or {"id":"uuid","error":{"code":"...","message":"..."}}
 */

import * as net from 'node:net';
import { randomUUID } from 'node:crypto';
import type { BaseEntity, EntityTypeSummary } from '@tryvienna/sdk';
import type { ToolContext, GraphqlOperationSummary, WorkstreamCreateResult, WorkstreamSendMessageResult, ReferenceResult } from './types';

const CONNECTION_TIMEOUT = 5_000;
const REQUEST_TIMEOUT = 10_000;

interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class BridgeToolContext implements ToolContext {
  private socket: net.Socket | null = null;
  private pending = new Map<string, PendingRequest>();
  private buffer = '';
  private connected = false;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly socketPath: string,
    private readonly workstreamId?: string,
  ) {}

  async connect(): Promise<void> {
    if (this.connected) return;
    // Coalesce concurrent connect() calls to avoid orphaned sockets
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.doConnect();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private doConnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Connection timeout after ${CONNECTION_TIMEOUT}ms`));
      }, CONNECTION_TIMEOUT);

      const socket = net.createConnection(this.socketPath, () => {
        clearTimeout(timer);
        this.connected = true;
        resolve();
      });

      socket.on('data', (data) => this.handleData(data.toString()));

      socket.on('error', (error) => {
        clearTimeout(timer);
        this.connected = false;
        // Reject all pending requests
        for (const [id, pending] of this.pending) {
          pending.reject(new Error(`Connection error: ${error.message}`));
          clearTimeout(pending.timer);
          this.pending.delete(id);
        }
        reject(error);
      });

      socket.on('close', () => {
        this.connected = false;
        this.socket = null;
        // Reject all pending requests
        for (const [id, pending] of this.pending) {
          pending.reject(new Error('Connection closed'));
          clearTimeout(pending.timer);
          this.pending.delete(id);
        }
      });

      this.socket = socket;
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.connected = false;
    }
  }

  // ── ToolContext Implementation ─────────────────────────────────────────────

  async getEntity(uri: string): Promise<BaseEntity | null> {
    const resp = await this.request<{ entity: BaseEntity | null }>('entity.get', { uri });
    return resp.entity;
  }

  async getEntityTypes(): Promise<EntityTypeSummary[]> {
    const resp = await this.request<{ types: EntityTypeSummary[] }>('entity.types', {});
    return resp.types;
  }

  async executeGraphql(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<unknown> {
    return this.request('graphql.execute', { query, variables });
  }

  async getGraphqlOperations(
    query?: string,
    kind?: 'query' | 'mutation'
  ): Promise<GraphqlOperationSummary[]> {
    const resp = await this.request<{ operations: GraphqlOperationSummary[] }>(
      'graphql.operations',
      { query, kind, ...(this.workstreamId ? { _workstreamId: this.workstreamId } : {}) }
    );
    return resp.operations;
  }

  async createWorkstream(input: {
    projectId: string;
    title: string;
    model?: string;
    groupId?: string;
    groupName?: string;
    createWorktrees?: boolean;
    branchName?: string;
    baseBranch?: string;
  }): Promise<WorkstreamCreateResult> {
    return this.request<WorkstreamCreateResult>('workstream.create', input);
  }

  async sendWorkstreamMessage(
    workstreamId: string,
    text: string,
  ): Promise<WorkstreamSendMessageResult> {
    return this.request<WorkstreamSendMessageResult>('workstream.sendMessage', {
      workstreamId,
      text,
    });
  }

  async addReference(input: {
    entityUri: string;
    entityType: string;
    entityTitle?: string;
  }): Promise<ReferenceResult> {
    return this.request<ReferenceResult>('reference.add', {
      ...input,
      workstreamId: this.workstreamId,
    });
  }

  async removeReference(entityUri: string): Promise<ReferenceResult> {
    return this.request<ReferenceResult>('reference.remove', {
      entityUri,
      workstreamId: this.workstreamId,
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async request<T>(method: string, params: unknown): Promise<T> {
    if (!this.connected) {
      await this.connect();
    }

    const id = randomUUID();

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms: ${method}`));
      }, REQUEST_TIMEOUT);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      if (!this.socket) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new Error('Socket disconnected before write'));
        return;
      }

      const message = JSON.stringify({ id, method, params }) + '\n';
      this.socket.write(message);
    });
  }

  private handleData(data: string): void {
    this.buffer += data;

    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (!line) continue;

      try {
        const response = JSON.parse(line) as {
          id: string;
          result?: unknown;
          error?: { code: string; message: string };
        };

        const pending = this.pending.get(response.id);
        if (!pending) continue;

        this.pending.delete(response.id);
        clearTimeout(pending.timer);

        if (response.error) {
          pending.reject(new Error(`${response.error.code}: ${response.error.message}`));
        } else {
          pending.resolve(response.result);
        }
      } catch (err) {
        // eslint-disable-next-line no-console -- MCP server process; no logger available in socket data handler
        console.error('Failed to parse bridge response:', line, err);
      }
    }
  }
}

/** Parse --workstream-id from process argv */
function parseWorkstreamId(): string | undefined {
  const idx = process.argv.indexOf('--workstream-id');
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

/** Create a BridgeToolContext from MCP_SOCKET_PATH environment variable */
export async function createBridgeContext(): Promise<BridgeToolContext> {
  const socketPath = process.env['MCP_SOCKET_PATH'];
  if (!socketPath) {
    throw new Error(
      'MCP_SOCKET_PATH environment variable is required. ' +
        'The Electron app must set this when configuring the MCP server.'
    );
  }

  const workstreamId = parseWorkstreamId();
  const bridge = new BridgeToolContext(socketPath, workstreamId);
  await bridge.connect();
  return bridge;
}
