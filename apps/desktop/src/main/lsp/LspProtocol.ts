/**
 * LSP Protocol Handler
 *
 * Implements JSON-RPC 2.0 wire protocol for LSP communication.
 * Handles Content-Length headers, message framing, and request/response tracking.
 *
 * @module main/lsp/LspProtocol
 */

import type { Logger } from '@vienna/logger';
import type { LspMessage, LspError } from './LspTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  method: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Protocol Handler
// ---------------------------------------------------------------------------

export class LspProtocol {
  private buffer = '';
  private contentLength = -1;
  private readonly pendingRequests = new Map<number, PendingRequest>();
  private nextId = 1;

  constructor(
    private readonly send: (data: string) => void,
    private readonly onNotification: (method: string, params: unknown) => void,
    private readonly logger: Logger,
    private readonly onRequest?: (method: string, params: unknown, id: number | string) => void,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Sending
  // ─────────────────────────────────────────────────────────────────────────

  async request<T>(method: string, params: unknown, timeout = 30_000): Promise<T> {
    const id = this.nextId++;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          reject(new Error(`LSP request '${method}' timed out after ${timeout}ms`));
        }
      }, timeout);

      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result as T);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        method,
        timestamp: Date.now(),
      });

      const message: LspMessage = { jsonrpc: '2.0', id, method, params };
      this.sendMessage(message);
    });
  }

  notify(method: string, params: unknown): void {
    this.sendMessage({ jsonrpc: '2.0', method, params });
  }

  respond(id: number | string, result: unknown, error?: LspError): void {
    const message: LspMessage = { jsonrpc: '2.0', id };
    if (error) {
      message.error = error;
    } else {
      message.result = result;
    }
    this.sendMessage(message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Receiving
  // ─────────────────────────────────────────────────────────────────────────

  handleData(data: string): void {
    this.buffer += data;

    while (true) {
      if (this.contentLength === -1) {
        const headerEnd = this.buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;

        const header = this.buffer.slice(0, headerEnd);
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          this.logger.error('Invalid LSP header, missing Content-Length', { header });
          this.buffer = this.buffer.slice(headerEnd + 4);
          continue;
        }

        this.contentLength = parseInt(match[1]!, 10);
        this.buffer = this.buffer.slice(headerEnd + 4);
      }

      if (Buffer.byteLength(this.buffer, 'utf8') < this.contentLength) break;

      const messageBytes = Buffer.from(this.buffer, 'utf8').subarray(0, this.contentLength);
      const messageStr = messageBytes.toString('utf8');

      const remainingBytes = Buffer.from(this.buffer, 'utf8').subarray(this.contentLength);
      this.buffer = remainingBytes.toString('utf8');
      this.contentLength = -1;

      try {
        const message = JSON.parse(messageStr) as LspMessage;
        this.handleMessage(message);
      } catch (err) {
        this.logger.error('Failed to parse LSP message', {
          error: (err as Error).message,
          rawPreview: messageStr.slice(0, 200),
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Message Handling
  // ─────────────────────────────────────────────────────────────────────────

  private handleMessage(message: LspMessage): void {
    // Response to our request
    if (message.id !== undefined && !message.method) {
      const pending = this.pendingRequests.get(message.id as number);
      if (pending) {
        this.pendingRequests.delete(message.id as number);
        if (message.error) {
          pending.reject(new Error(`LSP error [${message.error.code}]: ${message.error.message}`));
        } else {
          pending.resolve(message.result);
        }
      } else {
        this.logger.warn('Received response for unknown LSP request', { id: message.id });
      }
      return;
    }

    // Request from server (needs response)
    if (message.id !== undefined && message.method) {
      if (this.onRequest) {
        this.onRequest(message.method, message.params, message.id);
      } else {
        this.respond(message.id, null, {
          code: -32601,
          message: `Method not found: ${message.method}`,
        });
      }
      return;
    }

    // Notification from server
    if (message.method) {
      this.onNotification(message.method, message.params);
    }
  }

  private sendMessage(message: LspMessage): void {
    const content = JSON.stringify(message);
    const contentLength = Buffer.byteLength(content, 'utf8');
    this.send(`Content-Length: ${contentLength}\r\n\r\n${content}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Management
  // ─────────────────────────────────────────────────────────────────────────

  cancelRequest(id: number): void {
    const pending = this.pendingRequests.get(id);
    if (pending) {
      this.pendingRequests.delete(id);
      pending.reject(new Error('Request cancelled'));
      this.notify('$/cancelRequest', { id });
    }
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  clearPending(reason: string): void {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  reset(): void {
    this.buffer = '';
    this.contentLength = -1;
    this.clearPending('Protocol reset');
    this.nextId = 1;
  }
}
