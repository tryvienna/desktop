/**
 * SessionManager — Agent session orchestration
 *
 * Manages the lifecycle of agent sessions, binding providers to sessions,
 * routing events through the permission engine, persisting to SQLite,
 * and emitting to the renderer via IPC.
 *
 * Responsibilities:
 * - Create/destroy provider instances per session
 * - Route messages between renderer and provider
 * - Run permission checks (auto-allow/deny/ask)
 * - Persist events to SQLite
 * - Emit events to renderer via IPC
 * - Inject app-level events (model switch, entity link, etc.)
 *
 * @module main/agent/SessionManager
 */

import { randomUUID } from 'node:crypto';
import type { AgentEvent, ImageAttachmentMeta, PermissionResponse, AgentProvider, ProviderState } from '@vienna/agent-core';
import type { PermissionRuleConfig } from '@vienna/app-db';
import { AgentEventSchema } from '@vienna/agent-core';
import type { ProviderRegistry } from '@vienna/agent-providers';
import type { PermissionEngine } from '@vienna/agent-permissions';
import type { EventRepository, SessionRepository, DirectoryRepository, PermissionRuleRepository } from '@vienna/agent-db';
import type { Logger } from '@vienna/logger';
import { parseMutationName } from '../mcp/schema-utils';

// ─── Paste Markup Decoding ─────────────────────────────────────────────────
// Inline helper to decode [paste://id?preview=b64&content=b64&chars=N&lines=N]
// markup back to plain text. Avoids importing @vienna/chat-ui in the main process.

const PASTE_URI_RE = /\[paste:\/\/[a-zA-Z0-9_-]+\?([^\]]*)\]/g;

function decodePasteMarkup(text: string): string {
  PASTE_URI_RE.lastIndex = 0;
  if (!PASTE_URI_RE.test(text)) return text;
  PASTE_URI_RE.lastIndex = 0;
  return text.replace(PASTE_URI_RE, (_match, queryString) => {
    const params = new URLSearchParams(queryString);
    const b64 = params.get('content') ?? '';
    try {
      return Buffer.from(b64, 'base64').toString('utf-8');
    } catch {
      return '';
    }
  });
}

/** Emitter interface matching createEmitter() output for the agent events group */
export interface AgentEventEmitter {
  onEvent: (payload: {
    sessionId: string;
    event: AgentEvent;
    isFromHistory?: boolean;
    timestamp?: number;
  }) => void;
  onStateChange: (payload: { sessionId: string; state: ProviderState }) => void;
  onError: (payload: { sessionId: string; error: string }) => void;
}

export interface SessionManagerDeps {
  registry: ProviderRegistry;
  permissionEngine: PermissionEngine;
  permissionRuleRepo: PermissionRuleRepository;
  eventRepo: EventRepository;
  sessionRepo: SessionRepository;
  directoryRepo: DirectoryRepository;
  emitter: AgentEventEmitter;
  logger: Logger;
}

interface ActiveSession {
  sessionId: string;
  providerId: string;
  provider: AgentProvider;
  cwd: string;
  unsubscribe: () => void;
}

export type SessionEventCallback = (sessionId: string, event: AgentEvent, dbEventId?: number) => void;

/** Context stored when a permission request is forwarded to the renderer for manual approval */
interface PendingPermission {
  toolName: string;
  input: Record<string, unknown>;
  sessionId: string;
  /** Needed for persisting tool_running/tool_result lifecycle events on approval/denial */
  messageId: string;
  toolId: string;
}

export class SessionManager {
  private sessions = new Map<string, ActiveSession>();
  private deps: SessionManagerDeps;
  private sessionCallbacks = new Map<string, Set<SessionEventCallback>>();
  /** Maps requestId → permission context for tool permissions awaiting manual UI approval. */
  private pendingPermissions = new Map<string, PendingPermission>();
  /** Tracks tool names loaded from permission settings per session (for approval method display). */
  private settingsPolicyTools = new Map<string, Set<string>>();
  private log: Logger;

  constructor(deps: SessionManagerDeps) {
    this.deps = deps;
    this.log = deps.logger.child({ service: 'SessionManager' });
  }

  /**
   * Subscribe to events for a specific session.
   * Returns an unsubscribe function.
   */
  onSessionEvent(sessionId: string, callback: SessionEventCallback): () => void {
    let callbacks = this.sessionCallbacks.get(sessionId);
    if (!callbacks) {
      callbacks = new Set();
      this.sessionCallbacks.set(sessionId, callbacks);
    }
    callbacks.add(callback);
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.sessionCallbacks.delete(sessionId);
      }
    };
  }

  /**
   * Load persistent permission rules from DB into the engine.
   * Call once at app startup — NOT per session, to avoid duplicate accumulation.
   */
  loadPersistentRules(): void {
    const persistentRules = this.deps.permissionRuleRepo.getPersistent();
    if (persistentRules.length > 0) {
      for (const rule of persistentRules) {
        this.deps.permissionEngine.addRule(rule);
      }
      this.log.info('Loaded persistent permission rules', { count: persistentRules.length });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Session lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  async startSession(
    providerId: string,
    config: {
      sessionId?: string;
      model?: string;
      cwd: string;
      directories: string[];
      systemPrompt?: string;
      appendSystemPrompt?: string;
      mcpServers?: Record<string, unknown>;
      env?: Record<string, string>;
      timeout?: number;
      workstreamId?: string;
      /** Resolved permission rules from settings (allow rules loaded into engine) */
      permissionRules?: PermissionRuleConfig[];
    }
  ): Promise<string> {
    // Always generate a fresh UUID for the DB record.
    // config.sessionId is the provider's session ID for resume — it must NOT
    // be reused as the DB primary key, or a second resume hits UNIQUE constraint.
    const sessionId = randomUUID();
    const log = this.log.child({ sessionId });

    const hasMcpServers = !!config.mcpServers && Object.keys(config.mcpServers).length > 0;
    log.info('Starting session', {
      providerId,
      model: config.model,
      cwd: config.cwd,
      directories: config.directories,
      workstreamId: config.workstreamId,
      isResume: !!config.sessionId,
      hasMcpServers,
      mcpServerNames: hasMcpServers ? Object.keys(config.mcpServers!) : [],
    });

    // Create provider instance
    const provider = this.deps.registry.create(providerId);

    // Persist session record
    this.deps.sessionRepo.create({
      id: sessionId,
      providerId,
      model: config.model ?? null,
      cwd: config.cwd,
      providerSessionId: null,
      workstreamId: config.workstreamId ?? null,
      status: 'active',
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostCents: 0,
    });

    // Persist directories
    if (config.directories.length > 0) {
      this.deps.directoryRepo.addMany(sessionId, config.directories);
    }

    // Load settings-based permission rules into the engine (allow rules only)
    if (config.permissionRules && config.permissionRules.length > 0) {
      const policyTools = new Set<string>();
      let loadedCount = 0;
      for (const rule of config.permissionRules) {
        if (rule.behavior === 'allow') {
          this.deps.permissionEngine.addRule({
            toolName: rule.tool,
            behavior: 'allow',
            scope: 'session',
            sessionId,
            directoryPattern: null,
            createdAt: Date.now(),
          });
          policyTools.add(rule.tool);
          loadedCount++;
        }
      }
      this.settingsPolicyTools.set(sessionId, policyTools);
      if (loadedCount > 0) {
        log.info('Loaded settings permission rules into engine', { count: loadedCount });
      }
    }

    // Subscribe to provider events
    const unsubEvent = provider.onEvent((event) => {
      this.handleProviderEvent(sessionId, event);
    });

    // Store active session
    this.sessions.set(sessionId, {
      sessionId,
      providerId,
      provider,
      cwd: config.cwd,
      unsubscribe: unsubEvent,
    });

    // Start the provider
    await provider.start({
      sessionId: config.sessionId, // Resume if provided
      model: config.model,
      cwd: config.cwd,
      directories: config.directories,
      systemPrompt: config.systemPrompt,
      appendSystemPrompt: config.appendSystemPrompt,
      mcpServers: config.mcpServers as Record<
        string,
        { command: string; args?: string[]; env?: Record<string, string> }
      >,
      env: config.env,
      timeout: config.timeout,
    });

    this.deps.emitter.onStateChange({ sessionId, state: provider.state });
    log.info('Session started', { providerState: provider.state });
    return sessionId;
  }

  async stopSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.log.warn('Stop requested for unknown session', { sessionId });
      return false;
    }

    this.log.info('Stopping session', { sessionId });
    session.unsubscribe();
    await session.provider.stop();

    this.deps.sessionRepo.updateStatus(sessionId, 'completed');
    this.deps.emitter.onStateChange({ sessionId, state: 'stopped' });

    // Clean up session-scoped permission rules and tracking
    this.deps.permissionEngine.clearSessionRules(sessionId);
    this.settingsPolicyTools.delete(sessionId);

    // Clean up pending permissions for this session
    for (const [reqId, pending] of this.pendingPermissions) {
      if (pending.sessionId === sessionId) {
        this.pendingPermissions.delete(reqId);
      }
    }

    this.sessions.delete(sessionId);
    this.sessionCallbacks.delete(sessionId);
    this.log.info('Session stopped', { sessionId });
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Messaging
  // ─────────────────────────────────────────────────────────────────────────

  sendMessage(
    sessionId: string,
    text: string,
    options?: {
      contentBlocks?: Array<{ type: string; source?: { type: string; media_type: string; data: string } }>;
      imageAttachments?: ImageAttachmentMeta[];
      /** When true, sends text to provider without emitting a user_message event (no chat bubble). */
      silent?: boolean;
    },
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.provider.state !== 'running') {
      this.log.warn('sendMessage failed — session not active', {
        sessionId,
        exists: !!session,
        state: session?.provider.state,
      });
      return false;
    }

    const messageId = `user-${Date.now()}-${randomUUID().slice(0, 8)}`;
    this.log.info('Sending user message to provider', {
      sessionId,
      messageId,
      textLength: text.length,
      imageCount: options?.imageAttachments?.length ?? 0,
      silent: options?.silent ?? false,
    });

    // Persist user message as an event so it appears during replay.
    // Skip for silent messages (e.g. label instructions shown via a dedicated widget).
    if (!options?.silent) {
      this.persistAndEmit(sessionId, {
        type: 'user_message',
        messageId,
        text,
        timestamp: Date.now(),
        ...(options?.imageAttachments?.length ? { imageAttachments: options.imageAttachments } : {}),
      });
    }

    // Decode paste markup to plain text before sending to the AI provider.
    // The provider should see the actual pasted content, not the markup wrapper.
    const decodedText = decodePasteMarkup(text);

    // Convert content blocks from Claude API format ({ source: { media_type, data } })
    // to agent-core format ({ mimeType, data })
    const providerContentBlocks = options?.contentBlocks
      ?.filter((b) => b.type === 'image' && b.source)
      .map((b) => ({
        type: 'image' as const,
        mimeType: b.source!.media_type,
        data: b.source!.data,
      }));

    session.provider.sendMessage({
      text: decodedText,
      ...(providerContentBlocks?.length ? { contentBlocks: providerContentBlocks } : {}),
    });
    this.deps.sessionRepo.updateActivity(sessionId, Date.now());
    return true;
  }

  respondPermission(sessionId: string, requestId: string, response: PermissionResponse): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.log.error('respondPermission: session not found', {
        sessionId,
        requestId,
        activeSessions: [...this.sessions.keys()],
      });
      return false;
    }

    this.log.info('Permission response received', {
      sessionId,
      requestId,
      behavior: response.behavior,
      scope: response.scope,
      pendingCount: this.pendingPermissions.size,
      pendingKeys: [...this.pendingPermissions.keys()],
    });

    // Create permission rule for session/permanent approvals
    const pending = this.pendingPermissions.get(requestId);
    this.log.info('Pending permission lookup', {
      requestId,
      found: !!pending,
      toolName: pending?.toolName,
    });
    if (response.behavior === 'allow' && response.scope !== 'once') {
      if (pending) {
        // Map UI scope ('permanent') to engine scope ('persistent')
        const engineScope = response.scope === 'permanent' ? 'persistent' as const : 'session' as const;

        this.deps.permissionEngine.allowTool(
          pending.toolName,
          engineScope,
          engineScope === 'session' ? sessionId : null,
        );

        // Persist persistent rules to DB so they survive app restart
        if (engineScope === 'persistent') {
          this.deps.permissionRuleRepo.add(
            pending.toolName,
            'allow',
            'persistent',
            null,
          );
        }

        this.log.info('Permission rule created', {
          sessionId,
          toolName: pending.toolName,
          scope: engineScope,
        });
      } else {
        this.log.warn('No pending permission context for rule creation', { requestId });
      }
    }

    this.log.info('Forwarding permission response to provider', {
      sessionId,
      requestId,
      behavior: response.behavior,
      scope: response.scope,
      providerState: session.provider.state,
    });
    // Forward to provider BEFORE removing the pending entry. Any event the
    // provider emits synchronously while handling the response (e.g. another
    // permission_required) can still look up context for this requestId
    // instead of seeing a half-cleaned map.
    session.provider.respondPermission(requestId, response);

    // Clean up pending entry after the provider has accepted the response.
    this.pendingPermissions.delete(requestId);

    // Persist tool lifecycle event so replay knows this permission was resolved.
    // Without this, replay would re-show the permission prompt for already-handled requests.
    if (pending) {
      if (response.behavior === 'allow') {
        const approvalMethod = response.scope === 'once' ? 'manual'
          : response.scope === 'session' ? 'session_rule' : 'persistent_rule';
        this.persistAndEmit(sessionId, {
          type: 'tool_running',
          messageId: pending.messageId,
          toolId: pending.toolId,
          approvalMethod,
        });
      } else {
        this.persistAndEmit(sessionId, {
          type: 'tool_result',
          messageId: pending.messageId,
          toolId: pending.toolId,
          result: { success: false, error: response.message || 'Permission denied by user' },
        });
      }
    }

    return true;
  }

  revokePermissionRule(sessionId: string, toolName: string, scope: 'session' | 'persistent'): boolean {
    this.log.info('Revoking permission rule', { sessionId, toolName, scope });

    const removed = this.deps.permissionEngine.removeRules({
      toolName,
      scope,
      ...(scope === 'session' ? { sessionId } : {}),
    });

    if (scope === 'persistent') {
      // Also remove from DB in a single query
      this.deps.permissionRuleRepo.deleteByToolNameAndScope(toolName, 'persistent');
    }

    this.log.info('Permission rule revoked', { sessionId, toolName, scope, removedCount: removed });
    return removed > 0;
  }

  /**
   * Hot-reload permission rules for a running session.
   * Clears existing session-scoped settings rules and loads new ones.
   * Does NOT affect user-granted session rules or persistent rules.
   */
  reloadPermissionRules(sessionId: string, rules: PermissionRuleConfig[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const log = this.log.child({ sessionId });

    // Remove only the settings-based session rules (not user-granted ones).
    // Settings rules have scope='session' and match this sessionId.
    // We clear all session rules and re-add both settings rules and any
    // user-granted rules. But since user-granted rules are also session-scoped,
    // we need to preserve them. The simplest approach: clear session rules,
    // then re-add the new settings rules. User-granted rules from respondPermission
    // are also session-scoped but stored in the DB — we can reload those too.
    this.deps.permissionEngine.clearSessionRules(sessionId);

    // Re-add settings-based rules
    const policyTools = new Set<string>();
    let loadedCount = 0;
    for (const rule of rules) {
      if (rule.behavior === 'allow') {
        this.deps.permissionEngine.addRule({
          toolName: rule.tool,
          behavior: 'allow',
          scope: 'session',
          sessionId,
          directoryPattern: null,
          createdAt: Date.now(),
        });
        policyTools.add(rule.tool);
        loadedCount++;
      }
    }
    this.settingsPolicyTools.set(sessionId, policyTools);

    // Re-add user-granted session rules from DB
    const userSessionRules = this.deps.permissionRuleRepo.getBySession(sessionId);
    for (const rule of userSessionRules) {
      this.deps.permissionEngine.addRule(rule);
    }

    log.info('Permission rules hot-reloaded', {
      settingsRules: loadedCount,
      userSessionRules: userSessionRules.length,
    });
  }

  interrupt(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.log.info('Interrupting session', { sessionId });
    session.provider.interrupt();
    this.injectEvent(sessionId, { type: 'interrupted', timestamp: Date.now() });
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event pipeline
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handle an event from the provider.
   *
   * Pipeline: provider event → permission check (if needed) → persist → emit
   */
  private handleProviderEvent(sessionId: string, event: AgentEvent): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.log.debug('Provider event received', {
      sessionId,
      eventType: event.type,
      messageId: 'messageId' in event ? event.messageId : undefined,
      toolId: 'toolId' in event ? event.toolId : undefined,
      // Tool result details for debugging permission/execution failures
      ...(event.type === 'tool_result' ? { success: event.result.success, resultError: event.result.error, resultOutput: event.result.output?.substring(0, 300) } : {}),
      ...(event.type === 'error' ? { errorCode: event.code, errorMessage: event.message.substring(0, 300) } : {}),
    });

    // Permission check for tool_permission_needed events
    if (event.type === 'tool_permission_needed') {
      // Mutation-aware rewrite: when graphql_execute runs a mutation,
      // check permission for the specific mutation first, then fall back.
      let effectiveToolName = event.toolName;
      if (event.toolName === 'mcp__vienna-entities__graphql_execute') {
        const mutationName = parseMutationName(event.input?.query);
        if (mutationName) {
          effectiveToolName = `entity_mutation:${mutationName}`;
        }
      }

      let checkResult = this.deps.permissionEngine.check({
        toolName: effectiveToolName,
        input: event.input,
        sessionId,
        providerId: session.providerId,
        cwd: session.cwd,
      });

      // Fall back to the general tool check if no mutation-specific rule matched
      if (checkResult.reason === 'no_match' && effectiveToolName !== event.toolName) {
        checkResult = this.deps.permissionEngine.check({
          toolName: event.toolName,
          input: event.input,
          sessionId,
          providerId: session.providerId,
          cwd: session.cwd,
        });
      }

      // AskUserQuestion always requires manual approval — it must show the UI
      // to the user regardless of the permission policy (including autonomous mode).
      const isInteractiveTool =
        event.toolName === 'AskUserQuestion' ||
        event.toolName.endsWith('__AskUserQuestion');

      if (checkResult.reason === 'rule_match' && !isInteractiveTool) {
        if (checkResult.allowed) {
          // Auto-allow
          this.log.debug('Auto-allowing tool permission', {
            sessionId,
            toolName: event.toolName,
            requestId: event.requestId,
          });
          session.provider.respondPermission(event.requestId, {
            behavior: 'allow',
            scope: 'once',
          });
          // Emit tool_running instead of tool_permission_needed
          // Distinguish settings-based rules (auto_policy) from user-granted rules
          const matchedRule = checkResult.matchedRule;
          const policyTools = this.settingsPolicyTools.get(sessionId);
          const isSettingsPolicy = policyTools?.has(event.toolName) &&
            matchedRule?.scope === 'session';
          const approvalMethod = isSettingsPolicy
            ? 'auto_policy'
            : matchedRule?.scope === 'persistent'
              ? 'persistent_rule'
              : 'session_rule';
          this.persistAndEmit(sessionId, {
            type: 'tool_running',
            messageId: event.messageId,
            toolId: event.toolId,
            approvalMethod,
          });
          return;
        } else {
          // Auto-deny
          this.log.debug('Auto-denying tool permission', {
            sessionId,
            toolName: event.toolName,
            requestId: event.requestId,
          });
          session.provider.respondPermission(event.requestId, {
            behavior: 'deny',
            scope: 'once',
          });
          this.persistAndEmit(sessionId, {
            type: 'tool_result',
            messageId: event.messageId,
            toolId: event.toolId,
            result: { success: false, error: 'Permission denied by policy' },
          });
          return;
        }
      }

      // No matching rule → store context and pass to renderer for manual approval
      // Use effectiveToolName so mutation-specific rules get created on approval
      this.pendingPermissions.set(event.requestId, {
        toolName: effectiveToolName,
        input: event.input,
        sessionId,
        messageId: event.messageId,
        toolId: event.toolId,
      });
      this.log.info('Stored pending permission for manual approval', {
        requestId: event.requestId,
        toolName: event.toolName,
        sessionId,
        pendingCount: this.pendingPermissions.size,
      });
    }

    // Extract session ID from init event
    if (event.type === 'session_init' && event.sessionId) {
      this.deps.sessionRepo.setProviderSessionId(sessionId, event.sessionId);
    }

    // Track usage from turn_end
    if (event.type === 'turn_end') {
      this.deps.sessionRepo.addUsage(
        sessionId,
        event.usage.inputTokens,
        event.usage.outputTokens,
        Math.round((event.usage.totalCostUsd ?? 0) * 100)
      );
      this.deps.sessionRepo.updateActivity(sessionId, Date.now());
    }

    this.persistAndEmit(sessionId, event);
  }

  /**
   * Inject an app-level event into a session's event stream.
   * Persisted and emitted identically to provider events.
   */
  injectEvent(sessionId: string, event: AgentEvent): void {
    this.log.debug('Injecting app event', { sessionId, eventType: event.type });
    AgentEventSchema.parse(event); // Validate
    this.persistAndEmit(sessionId, event);
  }

  /** Persist to SQLite, emit to renderer, and notify per-session callbacks */
  private persistAndEmit(sessionId: string, event: AgentEvent): void {
    this.log.debug('Persisting and emitting event', {
      sessionId,
      eventType: event.type,
      messageId: 'messageId' in event ? event.messageId : undefined,
    });

    const dbEventId = this.deps.eventRepo.insert(sessionId, event);
    this.deps.emitter.onEvent({ sessionId, event, timestamp: Date.now() });

    // Notify per-session subscribers (e.g., WorkstreamManager)
    const callbacks = this.sessionCallbacks.get(sessionId);
    if (callbacks) {
      this.log.debug('Notifying session callbacks', {
        sessionId,
        eventType: event.type,
        callbackCount: callbacks.size,
      });
      for (const cb of callbacks) {
        cb(sessionId, event, dbEventId);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Replay
  // ─────────────────────────────────────────────────────────────────────────

  /** Replay events for a session from the DB (limited to last N events) */
  replaySession(sessionId: string, limit = 800): void {
    const records = this.deps.eventRepo.getBySessionTail(sessionId, limit);
    const events = this.deps.eventRepo.parseEvents(records);

    this.log.info('Replaying session events', {
      sessionId,
      eventCount: events.length,
      limit,
    });

    for (const event of events) {
      this.deps.emitter.onEvent({
        sessionId,
        event,
        isFromHistory: true,
        timestamp: Date.now(),
      });
    }

    this.log.debug('Session replay complete', { sessionId });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // App-injected events
  // ─────────────────────────────────────────────────────────────────────────

  switchModel(sessionId: string, fromModel: string, toModel: string): void {
    this.injectEvent(sessionId, {
      type: 'model_change',
      fromModel,
      toModel,
      timestamp: Date.now(),
    });
  }

  linkEntity(sessionId: string, entityUri: string, entityType: string, entityTitle: string): void {
    this.injectEvent(sessionId, {
      type: 'entity_link',
      action: 'linked',
      entityUri,
      entityType,
      entityTitle,
      timestamp: Date.now(),
    });
  }

  unlinkEntity(sessionId: string, entityUri: string): void {
    this.injectEvent(sessionId, {
      type: 'entity_link',
      action: 'unlinked',
      entityUri,
      entityType: '',
      entityTitle: '',
      timestamp: Date.now(),
    });
  }

  compactConversation(sessionId: string, instructions?: string): boolean {
    // Send /compact command — the CLI emits a status:compacting message (normalizer
    // converts it to a compact_boundary spinner) followed by the real compact_boundary
    // event on completion. No synthetic injection needed here.
    const command = instructions ? `/compact ${instructions}` : '/compact';
    return this.sendMessage(sessionId, command);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session !== undefined && session.provider.state === 'running';
  }

  /** Shutdown all active sessions (e.g., on app quit) */
  async shutdown(): Promise<void> {
    this.log.info('Shutting down all sessions', { count: this.sessions.size });
    const stops = [...this.sessions.keys()].map((id) => this.stopSession(id));
    await Promise.allSettled(stops);
    this.log.info('All sessions shut down');
  }
}
