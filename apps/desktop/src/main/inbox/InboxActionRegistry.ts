/**
 * InboxActionRegistry — Coroutine-style inbox action handlers with form prompts.
 *
 * Handlers can:
 * - Call `ctx.prompt(formSpec)` to show a form and wait for answers
 * - Call `ctx.showResult(resultSpec)` to show a success/error result screen
 *   and wait for the user to click an action button
 *
 * @module desktop/main/inbox/InboxActionRegistry
 */

import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { Logger } from '@vienna/logger';
import type { InboxActionFormSpec, InboxActionResultSpec } from '../../ipc/inbox-action/contract';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Context provided to action handlers at execution time. */
export interface InboxActionContext {
  logger: Logger;
  /** Suspend and show a form. Returns answers on submit, throws on cancel. */
  prompt: (form: InboxActionFormSpec) => Promise<Record<string, string>>;
  /** Show a result screen (success/error). Returns the action ID the user clicked, or 'dismiss'. */
  showResult: (result: InboxActionResultSpec) => Promise<string>;
}

/** A registered inbox action handler. */
export interface InboxActionDefinition {
  id: string;
  schema: z.ZodType;
  handler: (payload: unknown, ctx: InboxActionContext) => Promise<void>;
}

/** Emitter for sending events to the renderer via IPC. */
export interface InboxActionEmitter {
  onPrompt: (payload: { sessionId: string; form: InboxActionFormSpec }) => void;
  onResult: (payload: { sessionId: string; result: InboxActionResultSpec }) => void;
  onComplete: (payload: { sessionId: string }) => void;
  onError: (payload: { sessionId: string; error: string }) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

interface PendingCallback {
  resolve: (value: Record<string, string>) => void;
  reject: (err: Error) => void;
}

interface PendingResultCallback {
  resolve: (actionId: string) => void;
  reject: (err: Error) => void;
}

interface ActionSession {
  id: string;
  actionId: string;
  pendingPrompt: PendingCallback | null;
  pendingResult: PendingResultCallback | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

/** Default handler timeout: 10 minutes. */
const DEFAULT_HANDLER_TIMEOUT_MS = 10 * 60 * 1000;

export class InboxActionRegistry {
  private readonly handlers = new Map<string, InboxActionDefinition>();
  private readonly sessions = new Map<string, ActionSession>();
  private readonly logger: Logger;
  private readonly handlerTimeoutMs: number;
  private emitter: InboxActionEmitter | null = null;

  constructor(logger: Logger, opts?: { handlerTimeoutMs?: number }) {
    this.logger = logger.child({ module: 'InboxActionRegistry' });
    this.handlerTimeoutMs = opts?.handlerTimeoutMs ?? DEFAULT_HANDLER_TIMEOUT_MS;
  }

  setEmitter(emitter: InboxActionEmitter): void {
    this.emitter = emitter;
  }

  register(definition: InboxActionDefinition): void {
    if (this.handlers.has(definition.id)) {
      throw new Error(`Inbox action "${definition.id}" is already registered`);
    }
    this.handlers.set(definition.id, definition);
    this.logger.debug('Registered inbox action', { actionId: definition.id });
  }

  unregister(actionId: string): boolean {
    const existed = this.handlers.delete(actionId);
    if (existed) this.logger.debug('Unregistered inbox action', { actionId });
    return existed;
  }

  hasAction(actionId: string): boolean {
    return this.handlers.has(actionId);
  }

  list(): string[] {
    return Array.from(this.handlers.keys());
  }

  execute(actionId: string, payload: unknown): string {
    const definition = this.handlers.get(actionId);
    if (!definition) throw new Error(`Unknown inbox action: ${actionId}`);

    const parsed = definition.schema.parse(payload);
    const sessionId = randomUUID();

    const session: ActionSession = { id: sessionId, actionId, pendingPrompt: null, pendingResult: null };
    this.sessions.set(sessionId, session);

    const ctx: InboxActionContext = {
      logger: this.logger.child({ actionId, sessionId }),
      prompt: (form) => this.prompt(sessionId, form),
      showResult: (result) => this.showResult(sessionId, result),
    };

    void this.runHandler(sessionId, definition, parsed, ctx);
    return sessionId;
  }

  /** Resume a form prompt with answers. */
  respond(sessionId: string, answers: Record<string, string>): void {
    const session = this.sessions.get(sessionId);
    if (!session?.pendingPrompt) return;
    const { resolve } = session.pendingPrompt;
    session.pendingPrompt = null;
    resolve(answers);
  }

  /** Resume a result screen with the clicked action ID. */
  respondResult(sessionId: string, actionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session?.pendingResult) return;
    const { resolve } = session.pendingResult;
    session.pendingResult = null;
    resolve(actionId);
  }

  /** Cancel a pending prompt or result (user dismissed). */
  cancel(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const pending = session.pendingPrompt ?? session.pendingResult;
    if (pending) {
      session.pendingPrompt = null;
      session.pendingResult = null;
      pending.reject(new Error('User cancelled'));
    }
    this.sessions.delete(sessionId);
  }

  /** Cancel all active sessions. Called on app quit to release resources. */
  shutdown(): void {
    const count = this.sessions.size;
    if (count > 0) {
      this.logger.info('Shutting down — cancelling active sessions', { count });
    }
    for (const sessionId of [...this.sessions.keys()]) {
      this.cancel(sessionId);
    }
  }

  // ── Private ────────────────────────────────────────────────────────────

  private prompt(sessionId: string, form: InboxActionFormSpec): Promise<Record<string, string>> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Unknown session: ${sessionId}`);
    if (!this.emitter) throw new Error('Emitter not configured');

    return new Promise<Record<string, string>>((resolve, reject) => {
      session.pendingPrompt = { resolve, reject };
      this.emitter!.onPrompt({ sessionId, form });
    });
  }

  private showResult(sessionId: string, result: InboxActionResultSpec): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Unknown session: ${sessionId}`);
    if (!this.emitter) throw new Error('Emitter not configured');

    return new Promise<string>((resolve, reject) => {
      session.pendingResult = { resolve, reject };
      this.emitter!.onResult({ sessionId, result });
    });
  }

  private async runHandler(
    sessionId: string,
    definition: InboxActionDefinition,
    payload: unknown,
    ctx: InboxActionContext,
  ): Promise<void> {
    try {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Handler timed out after ${this.handlerTimeoutMs / 1000}s`)),
          this.handlerTimeoutMs,
        );
      });
      await Promise.race([definition.handler(payload, ctx), timeout]);
      this.emitter?.onComplete({ sessionId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message !== 'User cancelled') {
        this.logger.error('Inbox action handler failed', {
          actionId: definition.id, sessionId, error: message,
        });
      }
      this.emitter?.onError({ sessionId, error: message });
    } finally {
      this.sessions.delete(sessionId);
    }
  }
}
