/**
 * WorkstreamManager — Thin orchestrator binding workstreams to agent sessions
 *
 * Composes SessionManager for agent lifecycle, repositories for persistence,
 * and pure functions for status derivation and context building.
 *
 * Responsibilities:
 * - Start/stop agent sessions per workstream
 * - Route messages through the session layer
 * - Derive workstream status from agent events
 * - Manage workstream focus (which workstream is visible)
 * - Emit workstream-scoped events to the renderer
 *
 * NOT responsible for:
 * - Agent lifecycle details (SessionManager)
 * - Permission evaluation (PermissionEngine)
 * - Event persistence (EventRepository)
 * - Provider management (ProviderRegistry)
 *
 * @module main/workstream/WorkstreamManager
 */

import { dialog } from 'electron';
import type { AgentEvent, ImageAttachmentMeta, PermissionResponse } from '@vienna/agent-core';
import { ClaudeCodeProvider } from '@vienna/agent-providers';
import type {
  WorkstreamRepository,
  WorkstreamGroupRepository,
  WorkstreamDirectoryRepository,
  WorkstreamLinkedEntityRepository,
  GroupLinkedEntityRepository,
  BranchSelectionRepository,
  WorkstreamStatus,
  PermissionPolicyRepository,
  SettingsRepository,
  TagRepository,
} from '@vienna/app-db';
import { resolvePermissions } from '@vienna/app-db';
import { ShellEnvError } from '@vienna/agent-providers';
import type { EntityRegistry } from '@tryvienna/sdk';
import type { SessionRepository, EventRepository } from '@vienna/agent-db';
import type { Logger } from '@vienna/logger';
import type { SessionManager } from '../agent/SessionManager';
import { deriveWorkstreamStatus, markWorkstreamViewed } from './status-machine';
import { buildWorkstreamSessionConfig } from './context-builder';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Emitter for workstream-scoped events sent to the renderer */
export interface WorkstreamEventEmitter {
  onAgentEvent: (payload: {
    workstreamId: string;
    event: AgentEvent;
    isFromHistory?: boolean;
    dbEventId?: number;
  }) => void;
  onStatusChanged: (payload: {
    workstreamId: string;
    status: WorkstreamStatus;
    previousStatus: WorkstreamStatus;
  }) => void;
  onAgentStateChanged: (payload: {
    workstreamId: string;
    state: string;
  }) => void;
}

export interface WorkstreamManagerDeps {
  sessionManager: SessionManager;
  workstreamRepo: WorkstreamRepository;
  workstreamGroupRepo?: WorkstreamGroupRepository;
  workstreamDirRepo: WorkstreamDirectoryRepository;
  branchSelectionRepo: BranchSelectionRepository;
  linkedEntityRepo: WorkstreamLinkedEntityRepository;
  groupLinkedEntityRepo?: GroupLinkedEntityRepository;
  sessionRepo: SessionRepository;
  eventRepo: EventRepository;
  emitter: WorkstreamEventEmitter;
  logger: Logger;
  /** Default provider ID for new sessions (e.g., 'claude-code') */
  defaultProviderId: string;
  /** MCP server configs to pass to all sessions */
  mcpServers?: Record<string, { command: string; args?: string[]; env?: Record<string, string> }>;
  /** Entity registry for building entity discovery prompts */
  entityRegistry?: EntityRegistry;
  /** Read the auto-compact threshold percentage from settings (null = CLI default) */
  getAutoCompactPercent?: () => number | null;
  /** Permission policy repository for scoped overrides */
  permissionPolicyRepo?: PermissionPolicyRepository;
  /** Settings repository for global permission defaults */
  settingsRepo?: SettingsRepository;
  /** Tag repository for loading workstream tags (tag awareness in system prompt) */
  tagRepo?: TagRepository;
  /** Resolve rich context text for a linked entity URI (from entity definition's resolveContext) */
  resolveEntityContext?: (entityUri: string) => Promise<string | null>;
}

/** Maps workstreamId → sessionId for active agents */
interface ActiveAgent {
  sessionId: string;
  unsubscribe: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Manager
// ─────────────────────────────────────────────────────────────────────────────

/** Callback for workstream-level event listeners */
export type WorkstreamEventCallback = (workstreamId: string, event: AgentEvent) => void;

export class WorkstreamManager {
  private agents = new Map<string, ActiveAgent>();
  private pendingStarts = new Map<string, Promise<string>>();
  private focusedWorkstreamId: string | null = null;
  private deps: WorkstreamManagerDeps;
  private eventListeners = new Set<WorkstreamEventCallback>();
  /** Tracks workstreams currently retrying after a failed resume (prevents infinite loops) */
  // Tracks in-flight "resume failed, retrying without resume" attempts per
  // workstream. Storing the Promise (not a bare Set) gives us a single atomic
  // set-if-absent via Map.has/Map.set and lets callers await the retry if
  // needed. Only one retry per workstream is ever in flight; subsequent error
  // events are no-ops while it runs.
  private resumeRetryInFlight = new Map<string, Promise<void>>();
  private log: Logger;

  constructor(deps: WorkstreamManagerDeps) {
    this.deps = deps;
    this.log = deps.logger.child({ service: 'WorkstreamManager' });
  }

  /** Set MCP server configs (called after MCP socket server starts) */
  setMCPServers(
    mcpServers: Record<string, { command: string; args?: string[]; env?: Record<string, string> }>,
  ): void {
    this.deps.mcpServers = mcpServers;
    this.log.info('MCP servers configured', { servers: Object.keys(mcpServers) });
  }

  setEntityRegistry(entityRegistry: EntityRegistry): void {
    this.deps.entityRegistry = entityRegistry;
  }

  setResolveEntityContext(fn: (entityUri: string) => Promise<string | null>): void {
    this.deps.resolveEntityContext = fn;
  }

  /** Register a listener for all workstream events (e.g., RoutineExecutor) */
  addEventListener(callback: WorkstreamEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // Agent Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Ensure an agent is running for a workstream.
   * Idempotent — returns the sessionId if already running.
   * @param skipResume - If true, start a fresh session without resuming from a previous one
   */
  async ensureAgent(workstreamId: string, skipResume = false): Promise<string> {
    // Coalesce concurrent starts for the same workstream
    const pending = this.pendingStarts.get(workstreamId);
    if (pending) return pending;

    const promise = this.doEnsureAgent(workstreamId, skipResume).finally(() => {
      this.pendingStarts.delete(workstreamId);
    });
    this.pendingStarts.set(workstreamId, promise);
    return promise;
  }

  private async doEnsureAgent(workstreamId: string, skipResume: boolean): Promise<string> {
    const log = this.log.child({ workstreamId });

    // Already active?
    const existing = this.agents.get(workstreamId);
    if (existing && this.deps.sessionManager.isSessionActive(existing.sessionId)) {
      log.debug('Agent already active', { sessionId: existing.sessionId });
      return existing.sessionId;
    }

    // Clean up stale entry if process died
    if (existing) {
      log.warn('Cleaning up stale agent entry', { sessionId: existing.sessionId });
      existing.unsubscribe();
      this.agents.delete(workstreamId);
    }

    // Load workstream data
    const workstream = this.deps.workstreamRepo.getById(workstreamId);
    if (!workstream) throw new Error(`Workstream ${workstreamId} not found`);

    const directories = this.deps.branchSelectionRepo.getDirectoriesWithBranchInfo(workstreamId);
    const linkedEntities = this.deps.linkedEntityRepo.getByWorkstream(workstreamId);

    // Load group context if workstream belongs to a group
    const group = workstream.groupId && this.deps.workstreamGroupRepo
      ? this.deps.workstreamGroupRepo.getById(workstream.groupId)
      : null;
    const groupLinkedEntities = group && this.deps.groupLinkedEntityRepo
      ? this.deps.groupLinkedEntityRepo.getByGroup(group.id)
      : [];
    const siblingWorkstreams = group
      ? this.deps.workstreamRepo.getByGroup(group.id)
          .filter((ws) => ws.id !== workstreamId)
          .map((ws) => ({ id: ws.id, title: ws.title, status: ws.status }))
      : [];

    // Check for a previous session to resume (any status, as long as it has a provider session ID)
    const previousSession = skipResume ? null : this.deps.sessionRepo.getResumableByWorkstream(workstreamId);
    const providerSessionId = previousSession?.providerSessionId ?? undefined;

    // Build session config from workstream state
    const hasMcpServers = !!this.deps.mcpServers && Object.keys(this.deps.mcpServers).length > 0;
    log.info('Building session config', {
      hasMcpServers,
      mcpServerNames: hasMcpServers ? Object.keys(this.deps.mcpServers!) : [],
      directoryCount: directories.length,
      linkedEntityCount: linkedEntities.length,
      groupId: group?.id,
      groupLinkedEntityCount: groupLinkedEntities.length,
      siblingCount: siblingWorkstreams.length,
      isResume: !!providerSessionId,
    });
    // Build env overrides from settings
    const envOverrides: Record<string, string> = {};
    const autoCompactPct = this.deps.getAutoCompactPercent?.();
    if (autoCompactPct != null) {
      envOverrides.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = String(autoCompactPct);
    }

    // Load tags applied to this workstream (for system prompt awareness)
    const workstreamTags = this.deps.tagRepo?.getWorkstreamTags(workstreamId) ?? [];

    // Pre-resolve rich context for linked entities (from entity definitions)
    let resolvedEntityContexts: Map<string, string> | undefined;
    if (this.deps.resolveEntityContext) {
      const allEntities = [
        ...linkedEntities,
        ...(groupLinkedEntities ?? []),
      ];
      // Only resolve entities without a user-edited contextOverride
      const toResolve = allEntities.filter((e) => !e.contextOverride);
      if (toResolve.length > 0) {
        resolvedEntityContexts = new Map();
        const results = await Promise.allSettled(
          toResolve.map(async (e) => {
            const ctx = await this.deps.resolveEntityContext!(e.entityUri);
            if (ctx) resolvedEntityContexts!.set(e.entityUri, ctx);
          }),
        );
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          log.warn('Some entity contexts failed to resolve', { failureCount: failures.length });
        }
      }
    }

    const config = buildWorkstreamSessionConfig({
      workstream,
      directories,
      linkedEntities,
      providerId: this.deps.defaultProviderId,
      providerSessionId,
      mcpServers: this.deps.mcpServers,
      entityTypeSummaries: this.deps.entityRegistry?.getTypeSummaries(),
      env: Object.keys(envOverrides).length > 0 ? envOverrides : undefined,
      group,
      groupLinkedEntities,
      siblingWorkstreams,
      workstreamTags,
      resolvedEntityContexts,
    });
    log.debug('Session config built', {
      hasMcpServers: !!config.mcpServers,
      mcpServerKeys: config.mcpServers ? Object.keys(config.mcpServers) : [],
    });

    // Check for pending rewind context (persisted to DB, survives app restart)
    const rewindContextRecord = this.deps.eventRepo.getRewindContextByWorkstream(workstreamId);
    if (rewindContextRecord) {
      const parsed = this.deps.eventRepo.parseEvents([rewindContextRecord]);
      const rewindEvent = parsed[0];
      if (rewindEvent?.type === 'rewind_context') {
        log.info('Injecting rewind context into session', { transcriptLength: rewindEvent.transcript.length });
        config.appendSystemPrompt = config.appendSystemPrompt
          ? `${config.appendSystemPrompt}\n\n${rewindEvent.transcript}`
          : rewindEvent.transcript;
        // Consume: delete the one-time event
        this.deps.eventRepo.deleteById(rewindContextRecord.id);
      }
    }

    // Resolve cascaded permission rules from settings + scoped overrides
    let permissionRules;
    if (this.deps.settingsRepo && this.deps.permissionPolicyRepo) {
      const globalPermSettings = this.deps.settingsRepo.get('permissions');
      const scopeChain: Array<{ scopeType: string; scopeId: string }> = [
        { scopeType: 'project', scopeId: workstream.projectId },
      ];
      if (workstream.groupId) {
        scopeChain.push({ scopeType: 'group', scopeId: workstream.groupId });
      }
      scopeChain.push({ scopeType: 'workstream', scopeId: workstreamId });

      const overrides = this.deps.permissionPolicyRepo.getForChain(scopeChain);
      permissionRules = resolvePermissions(globalPermSettings, overrides);
      log.info('Resolved permission rules', {
        globalPreset: globalPermSettings.activePreset,
        overrideCount: overrides.length,
        resolvedCount: permissionRules.length,
      });
    }

    // Start session via SessionManager (with workstream binding)
    let sessionId: string;
    try {
      sessionId = await this.deps.sessionManager.startSession(
        this.deps.defaultProviderId,
        {
          ...config,
          workstreamId,
          permissionRules,
        },
      );
    } catch (err) {
      if (err instanceof ShellEnvError) {
        log.error('Shell environment resolution failed', { shell: err.shell, cause: String(err.cause) });
        dialog.showErrorBox(
          'Shell Environment Error',
          `${err.message}\n\nShell: ${err.shell}\n\n` +
            'Vienna launches your login shell to inherit PATH and environment variables. ' +
            'If your shell config has errors or takes too long to start, this will fail.\n\n' +
            'Try running your shell manually to check for issues:\n' +
            `  ${err.shell} -ilc 'echo $PATH'`,
        );
      }
      throw err;
    }

    // Subscribe to session events for this workstream
    const unsubscribe = this.subscribeToSessionEvents(workstreamId, sessionId);

    this.agents.set(workstreamId, { sessionId, unsubscribe });

    // Update workstream with active session reference
    this.deps.workstreamRepo.update(workstreamId, { activeSessionId: sessionId });

    log.info('Agent started', { sessionId });
    return sessionId;
  }

  /** Stop the agent for a workstream */
  async stopAgent(workstreamId: string): Promise<void> {
    const agent = this.agents.get(workstreamId);
    if (!agent) return;

    this.log.info('Stopping agent', { workstreamId, sessionId: agent.sessionId });
    agent.unsubscribe();
    await this.deps.sessionManager.stopSession(agent.sessionId);
    this.agents.delete(workstreamId);

    // Only reset runtime-dependent statuses (processing/waiting_permission) to idle.
    // All other statuses are preserved — they represent meaningful state the user cares about.
    const current = this.deps.workstreamRepo.getById(workstreamId);
    const resetToIdle = current?.status === 'processing' || current?.status === 'waiting_permission';
    this.deps.workstreamRepo.update(workstreamId, {
      activeSessionId: null,
      ...(resetToIdle ? { status: 'idle' as const } : {}),
    });
  }

  /** Restart the agent for a workstream (stop + start, preserving resume when possible) */
  async restartAgent(workstreamId: string): Promise<string> {
    await this.stopAgent(workstreamId);
    return this.ensureAgent(workstreamId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Messaging
  // ─────────────────────────────────────────────────────────────────────────

  /** Send a message to a workstream's agent (auto-starts if needed) */
  async sendMessage(
    workstreamId: string,
    text: string,
    options?: {
      contentBlocks?: Array<{ type: string; source?: { type: string; media_type: string; data: string } }>;
      imageAttachments?: ImageAttachmentMeta[];
      /** When true, sends text to provider without showing a user message bubble in chat. */
      silent?: boolean;
    },
  ): Promise<void> {
    this.log.info('Sending message to workstream', {
      workstreamId,
      textLength: text.length,
      imageCount: options?.imageAttachments?.length ?? 0,
    });
    const sessionId = await this.ensureAgent(workstreamId);
    const sent = this.deps.sessionManager.sendMessage(sessionId, text, options);
    if (!sent) {
      throw new Error(`Failed to send message — agent session ${sessionId} is not active`);
    }
    this.deps.workstreamRepo.incrementMessageCount(workstreamId);
  }

  /** Respond to a permission request in a workstream's agent */
  respondPermission(
    workstreamId: string,
    requestId: string,
    response: PermissionResponse,
  ): void {
    const agent = this.agents.get(workstreamId);
    if (!agent) {
      this.log.error('respondPermission: no agent found for workstream', {
        workstreamId,
        requestId,
        availableWorkstreams: [...this.agents.keys()],
      });
      throw new Error('No active agent session for this workstream. Send a new message to start a session.');
    }
    this.log.info('Forwarding permission response', {
      workstreamId,
      requestId,
      sessionId: agent.sessionId,
      behavior: response.behavior,
      scope: response.scope,
    });
    const result = this.deps.sessionManager.respondPermission(agent.sessionId, requestId, response);
    this.log.info('SessionManager.respondPermission returned', { workstreamId, requestId, result });
  }

  /**
   * Hot-reload permission rules for all running sessions affected by a scope change.
   * Called when permission policies are updated via the settings UI.
   */
  reloadPermissionsForScope(scopeType: string, scopeId: string): void {
    if (!this.deps.settingsRepo || !this.deps.permissionPolicyRepo) return;

    const log = this.log.child({ method: 'reloadPermissionsForScope', scopeType, scopeId });

    // Find affected workstreams based on scope type
    const affectedWorkstreamIds: string[] = [];

    if (scopeType === 'workstream') {
      // Direct match — only this workstream
      if (this.agents.has(scopeId)) {
        affectedWorkstreamIds.push(scopeId);
      }
    } else if (scopeType === 'group') {
      // All running workstreams in this group
      for (const [wsId] of this.agents) {
        const ws = this.deps.workstreamRepo.getById(wsId);
        if (ws?.groupId === scopeId) {
          affectedWorkstreamIds.push(wsId);
        }
      }
    } else if (scopeType === 'project') {
      // All running workstreams in this project
      for (const [wsId] of this.agents) {
        const ws = this.deps.workstreamRepo.getById(wsId);
        if (ws?.projectId === scopeId) {
          affectedWorkstreamIds.push(wsId);
        }
      }
    } else if (scopeType === 'global') {
      // All running workstreams
      affectedWorkstreamIds.push(...this.agents.keys());
    }

    if (affectedWorkstreamIds.length === 0) {
      log.debug('No running sessions affected');
      return;
    }

    log.info('Reloading permissions for affected sessions', {
      affectedCount: affectedWorkstreamIds.length,
    });

    for (const wsId of affectedWorkstreamIds) {
      const agent = this.agents.get(wsId);
      if (!agent) continue;

      const ws = this.deps.workstreamRepo.getById(wsId);
      if (!ws) continue;

      // Re-resolve the full permission chain
      const globalPermSettings = this.deps.settingsRepo!.get('permissions');
      const scopeChain: Array<{ scopeType: string; scopeId: string }> = [
        { scopeType: 'project', scopeId: ws.projectId },
      ];
      if (ws.groupId) {
        scopeChain.push({ scopeType: 'group', scopeId: ws.groupId });
      }
      scopeChain.push({ scopeType: 'workstream', scopeId: wsId });

      const overrides = this.deps.permissionPolicyRepo!.getForChain(scopeChain);
      const rules = resolvePermissions(globalPermSettings, overrides);

      // Push to engine via SessionManager
      this.deps.sessionManager.reloadPermissionRules(agent.sessionId, rules);

      log.info('Reloaded permissions for workstream', {
        workstreamId: wsId,
        sessionId: agent.sessionId,
        resolvedRuleCount: rules.length,
      });
    }
  }

  /** Revoke a permission rule for a workstream's agent */
  revokePermissionRule(workstreamId: string, toolName: string, scope: 'session' | 'persistent'): boolean {
    const agent = this.agents.get(workstreamId);
    if (!agent) return false;
    this.log.info('Revoking permission rule', { workstreamId, toolName, scope });
    return this.deps.sessionManager.revokePermissionRule(agent.sessionId, toolName, scope);
  }

  /** Interrupt the agent's current generation */
  interrupt(workstreamId: string): void {
    const agent = this.agents.get(workstreamId);
    if (!agent) return;
    this.log.info('Interrupting workstream agent', { workstreamId });
    this.deps.sessionManager.interrupt(agent.sessionId);
  }

  /** Trigger context compaction for a workstream's agent (resumes agent if needed) */
  async compactConversation(workstreamId: string, instructions?: string): Promise<boolean> {
    // If no agent is running, only start one if there's a session to resume
    // (compacting an empty conversation is pointless)
    if (!this.agents.has(workstreamId)) {
      const resumable = this.deps.sessionRepo.getResumableByWorkstream(workstreamId);
      if (!resumable) return false;
    }
    const sessionId = await this.ensureAgent(workstreamId);
    return this.deps.sessionManager.compactConversation(sessionId, instructions);
  }

  /** Clear conversation — stop agent, break resume chain, and notify renderer to reset chat UI */
  async clearConversation(workstreamId: string): Promise<void> {
    this.log.info('Clearing conversation', { workstreamId });
    // Clear provider session ID on the most recent session so ensureAgent won't resume it
    const sessions = this.deps.sessionRepo.getByWorkstream(workstreamId);
    for (const session of sessions) {
      if (session.providerSessionId) {
        this.deps.sessionRepo.clearProviderSessionId(session.id);
      }
    }
    await this.stopAgent(workstreamId);
    // Emit directly on workstream channel (not persisted — purely a UI signal)
    this.deps.emitter.onAgentEvent({
      workstreamId,
      event: { type: 'conversation_cleared' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Conversation rewind
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Rewind a workstream to a specific point in conversation history.
   *
   * Ordering: stop agent → rewind files → delete events → persist context → break resume → UI reset.
   * If file rewind fails, no DB changes are made.
   */
  async rewindConversation(workstreamId: string, targetEventId: number, role?: string): Promise<void> {
    const log = this.log.child({ workstreamId, targetEventId, role, method: 'rewindConversation' });

    // Guard: reject if agent is busy (streaming/processing)
    const agent = this.agents.get(workstreamId);
    if (agent && this.deps.sessionManager.isSessionActive(agent.sessionId)) {
      const ws = this.deps.workstreamRepo.getById(workstreamId);
      if (ws?.status === 'processing' || ws?.status === 'waiting_permission') {
        throw new Error('Cannot rewind while agent is processing. Interrupt or wait for it to finish.');
      }
    }

    // Find the checkpoint event for file rewind.
    // - For user messages: checkpoint at or before target (file state before Claude processed this message)
    // - For assistant messages: checkpoint after target (file state after Claude finished responding)
    const checkpointRecords = this.deps.eventRepo.getCheckpointsByWorkstream(workstreamId);
    const checkpointEvents = this.deps.eventRepo.parseEvents(checkpointRecords);

    let checkpoint: { checkpointId: string; providerSessionId: string; dbEventId: number } | null = null;
    if (role === 'assistant') {
      // For assistant messages, find the first checkpoint AFTER the target event.
      // This checkpoint captures file state after the assistant response completed.
      // checkpointRecords are newest-first, so iterate in reverse to find the first after target.
      for (let i = checkpointRecords.length - 1; i >= 0; i--) {
        const record = checkpointRecords[i]!;
        if (record.id > targetEventId) {
          const parsed = checkpointEvents[i]!;
          if (parsed.type === 'checkpoint') {
            checkpoint = {
              checkpointId: parsed.checkpointId,
              providerSessionId: parsed.providerSessionId,
              dbEventId: record.id,
            };
            break; // First match (smallest id > target) is the closest
          }
        }
      }
    } else {
      // For user messages (default): checkpoint at or before target
      for (let i = 0; i < checkpointRecords.length; i++) {
        const record = checkpointRecords[i]!;
        if (record.id <= targetEventId) {
          const parsed = checkpointEvents[i]!;
          if (parsed.type === 'checkpoint') {
            checkpoint = {
              checkpointId: parsed.checkpointId,
              providerSessionId: parsed.providerSessionId,
              dbEventId: record.id,
            };
            break; // Newest first, so first match is the closest
          }
        }
      }
    }

    // 1. Stop the running agent
    log.info('Stopping agent for rewind');
    await this.stopAgent(workstreamId);

    // 2. Rewind files FIRST (if checkpoint exists)
    if (checkpoint) {
      const directories = this.deps.branchSelectionRepo.getDirectoriesWithBranchInfo(workstreamId);
      const cwd = directories[0]?.effectivePath ?? process.env.HOME ?? '/tmp';

      log.info('Rewinding files', {
        checkpointId: checkpoint.checkpointId,
        providerSessionId: checkpoint.providerSessionId,
        cwd,
      });

      try {
        await ClaudeCodeProvider.rewindFiles({
          providerSessionId: checkpoint.providerSessionId,
          checkpointId: checkpoint.checkpointId,
          cwd,
        });
        log.info('File rewind succeeded');
      } catch (err) {
        log.error('File rewind failed — aborting rewind', { error: String(err) });
        throw new Error(`File rewind failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      log.warn('No checkpoint found for target event — skipping file rewind (conversation-only rewind)');
    }

    // 3. Delete events after the rewind point (only after file rewind succeeds)
    // For assistant messages with a checkpoint, delete after the checkpoint event
    // (preserves the full assistant response + checkpoint, removes everything after).
    // For user messages, delete after the target event itself.
    const deleteAfterEventId = (role === 'assistant' && checkpoint) ? checkpoint.dbEventId : targetEventId;
    const deletedCount = this.deps.eventRepo.deleteAfterForWorkstream(workstreamId, deleteAfterEventId);
    log.info('Deleted events after rewind point', { deletedCount, deleteAfterEventId });

    // 4. Build transcript from remaining events and persist as rewind_context
    const remainingRecords = this.deps.eventRepo.getByWorkstreamTail(workstreamId, 400);
    const remainingEvents = this.deps.eventRepo.parseEvents(remainingRecords);
    const transcript = this.buildRewindTranscript(remainingEvents);

    // Find sessions once — used for both context persistence and resume chain break
    const sessions = this.deps.sessionRepo.getByWorkstream(workstreamId);

    if (transcript) {
      const sessionId = sessions[0]?.id;
      if (sessionId) {
        const contextEvent: AgentEvent = {
          type: 'rewind_context',
          transcript,
          timestamp: Date.now(),
        };
        this.deps.eventRepo.insert(sessionId, contextEvent);
        log.info('Persisted rewind context', { transcriptLength: transcript.length });
      }
    }

    // 5. Break resume chain
    for (const session of sessions) {
      if (session.providerSessionId) {
        this.deps.sessionRepo.clearProviderSessionId(session.id);
      }
    }

    // 6. Emit conversation_cleared to trigger UI reset
    this.deps.emitter.onAgentEvent({
      workstreamId,
      event: { type: 'conversation_cleared' },
    });

    log.info('Rewind complete');
  }

  /**
   * Build a conversation transcript from events for rewind context injection.
   * Returns a formatted string suitable for appendSystemPrompt.
   */
  private buildRewindTranscript(events: AgentEvent[]): string | null {
    const parts: string[] = [];

    for (const event of events) {
      if (event.type === 'user_message') {
        parts.push(`User: ${event.text}`);
      } else if (event.type === 'text_done') {
        parts.push(`Assistant: ${event.fullText}`);
      } else if (event.type === 'tool_start') {
        const tool = event.tool;
        const inputSummary = tool.name === 'Edit' || tool.name === 'Write'
          ? (tool.input as { file_path?: string }).file_path ?? ''
          : tool.name === 'Bash'
          ? (tool.input as { command?: string }).command?.substring(0, 100) ?? ''
          : '';
        parts.push(`[Tool: ${tool.name}${inputSummary ? ` — ${inputSummary}` : ''}]`);
      }
    }

    if (parts.length === 0) return null;

    return [
      '<rewind-context>',
      'The conversation was rewound to this point. Below is a transcript of the conversation before the rewind.',
      'You should continue from where this conversation left off. The user chose to rewind to undo messages that came after this point.',
      '',
      ...parts,
      '</rewind-context>',
    ].join('\n');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Focus (which workstream the user is viewing)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set which workstream is currently visible to the user.
   * Affects status derivation (completed_unviewed vs active).
   */
  setInFocus(workstreamId: string | null): void {
    this.log.debug('Focus changed', {
      from: this.focusedWorkstreamId,
      to: workstreamId,
    });
    this.focusedWorkstreamId = workstreamId;

    // If focusing on a workstream with unviewed results, mark as viewed
    if (workstreamId) {
      const ws = this.deps.workstreamRepo.getById(workstreamId);
      if (ws) {
        const newStatus = markWorkstreamViewed(ws.status);
        if (newStatus) {
          this.log.info('Marking workstream as viewed', {
            workstreamId,
            from: ws.status,
            to: newStatus,
          });
          this.updateStatus(workstreamId, newStatus);
        }
      }
    }
  }

  /** Get the currently focused workstream ID */
  getFocusedWorkstreamId(): string | null {
    return this.focusedWorkstreamId;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Model switching
  // ─────────────────────────────────────────────────────────────────────────

  /** Switch the model for a workstream's agent */
  async switchModel(workstreamId: string, model: string): Promise<void> {
    // Update workstream record
    const ws = this.deps.workstreamRepo.getById(workstreamId);
    if (!ws) return;

    const fromModel = ws.model ?? 'unknown';
    this.deps.workstreamRepo.update(workstreamId, { model });

    // Inject model_change event into the session (active or most recent)
    const agent = this.agents.get(workstreamId);
    const sessionId = agent?.sessionId
      ?? this.deps.sessionRepo.getByWorkstream(workstreamId)[0]?.id;

    if (sessionId) {
      this.deps.sessionManager.switchModel(sessionId, fromModel, model);

      // When no agent is running, session event callbacks aren't subscribed,
      // so the event won't be forwarded to the renderer automatically.
      // Emit it directly on the workstream channel.
      if (!agent) {
        const event: AgentEvent = { type: 'model_change', fromModel, toModel: model, timestamp: Date.now() };
        this.deps.emitter.onAgentEvent({ workstreamId, event });
      }
    }

    // If agent is running, restart with new model
    if (agent) {
      await this.restartAgent(workstreamId);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // History replay
  // ─────────────────────────────────────────────────────────────────────────

  /** Events per initial replay and per scroll-back page */
  private static readonly MAX_REPLAY_EVENTS = 400;

  /**
   * Trim leading events that belong to an incomplete message (no turn_start
   * in this batch). Without this, a batch boundary can cut a message lifecycle
   * in half, leaving tools stuck in "loading" state.
   *
   * Returns the trimmed slice start index so the caller can adjust oldestEventId.
   */
  private trimIncompleteLeadingMessage(
    events: import('@vienna/agent-core').AgentEvent[],
  ): number {
    if (events.length === 0) return 0;

    // Find the messageId of the first event (if it has one)
    const first = events[0]!;

    // user_message events are self-contained (no turn_start/turn_end lifecycle),
    // so they should never be trimmed as "incomplete".
    if (first.type === 'user_message') return 0;

    const firstMessageId = 'messageId' in first ? (first as { messageId: string }).messageId : null;
    if (!firstMessageId) return 0;

    // Check if this batch contains a turn_start for that message
    const hasTurnStart = events.some(
      (e) => e.type === 'turn_start' && 'messageId' in e && (e as { messageId: string }).messageId === firstMessageId,
    );
    if (hasTurnStart) return 0;

    // No turn_start — trim all events belonging to this incomplete message
    let trimIndex = 0;
    for (let i = 0; i < events.length; i++) {
      const mid = 'messageId' in events[i]! ? (events[i] as unknown as { messageId: string }).messageId : null;
      if (mid === firstMessageId) {
        trimIndex = i + 1;
      } else {
        break;
      }
    }
    return trimIndex;
  }

  /** Replay recent event history for a workstream across all its sessions */
  replayHistory(workstreamId: string): { hasMore: boolean; oldestEventId: number | null } {
    const limit = WorkstreamManager.MAX_REPLAY_EVENTS;
    const records = this.deps.eventRepo.getByWorkstreamTail(workstreamId, limit);
    const events = this.deps.eventRepo.parseEvents(records);

    // Trim incomplete leading message so tools don't appear stuck.
    // Use records[0] (un-trimmed) for cursor so the next page overlaps and
    // the store's deduplication handles the overlap — no events are lost.
    const trimIndex = this.trimIncompleteLeadingMessage(events);
    const trimmedEvents = trimIndex > 0 ? events.slice(trimIndex) : events;
    const trimmedRecords = trimIndex > 0 ? records.slice(trimIndex) : records;

    this.log.info('Replaying workstream history', {
      workstreamId,
      eventCount: trimmedEvents.length,
      trimmed: trimIndex,
      limit,
    });

    for (let i = 0; i < trimmedEvents.length; i++) {
      this.deps.emitter.onAgentEvent({
        workstreamId,
        event: trimmedEvents[i]!,
        isFromHistory: true,
        dbEventId: trimmedRecords[i]?.id,
      });
    }

    return {
      hasMore: records.length === limit,
      oldestEventId: records[0]?.id ?? null,
    };
  }

  /** Replay older events before a cursor for scroll-back pagination */
  replayHistoryBefore(
    workstreamId: string,
    beforeEventId: number,
    limit: number,
  ): { hasMore: boolean; oldestEventId: number | null } {
    const records = this.deps.eventRepo.getByWorkstreamBefore(workstreamId, beforeEventId, limit);
    const events = this.deps.eventRepo.parseEvents(records);

    // Trim incomplete leading message so tools don't appear stuck.
    // Use records[0] (un-trimmed) for cursor so the next page overlaps and
    // the store's deduplication handles the overlap — no events are lost.
    const trimIndex = this.trimIncompleteLeadingMessage(events);
    const trimmedEvents = trimIndex > 0 ? events.slice(trimIndex) : events;
    const trimmedRecords = trimIndex > 0 ? records.slice(trimIndex) : records;

    this.log.info('Replaying older workstream history', {
      workstreamId,
      beforeEventId,
      eventCount: trimmedEvents.length,
      trimmed: trimIndex,
      limit,
    });

    for (let i = 0; i < trimmedEvents.length; i++) {
      this.deps.emitter.onAgentEvent({
        workstreamId,
        event: trimmedEvents[i]!,
        isFromHistory: true,
        dbEventId: trimmedRecords[i]?.id,
      });
    }

    return {
      hasMore: records.length === limit,
      oldestEventId: records[0]?.id ?? null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User message history (for input up-arrow navigation)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get user-sent message texts for a workstream, newest first.
   *
   * Returns lightweight items (text + cursor metadata) suitable for
   * populating the chat input's up-arrow message history. Supports
   * cursor-based pagination via `beforeEventId`.
   */
  getUserMessageHistory(
    workstreamId: string,
    limit: number,
    beforeEventId?: number,
  ): { items: Array<{ eventId: number; text: string; timestamp: number }>; hasMore: boolean } {
    const items = beforeEventId != null
      ? this.deps.eventRepo.getUserMessagesByWorkstreamBefore(workstreamId, beforeEventId, limit)
      : this.deps.eventRepo.getUserMessagesByWorkstreamTail(workstreamId, limit);
    return {
      items,
      hasMore: items.length === limit,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Entity linking (delegate to repo + inject event)
  // ─────────────────────────────────────────────────────────────────────────

  linkEntity(
    workstreamId: string,
    entityUri: string,
    entityType: string,
    entityTitle?: string,
  ): void {
    this.deps.linkedEntityRepo.link(workstreamId, entityUri, entityType, entityTitle);

    const agent = this.agents.get(workstreamId);
    if (agent) {
      this.deps.sessionManager.linkEntity(
        agent.sessionId,
        entityUri,
        entityType,
        entityTitle ?? '',
      );
    }
  }

  unlinkEntity(workstreamId: string, entityUri: string): void {
    this.deps.linkedEntityRepo.unlink(workstreamId, entityUri);

    const agent = this.agents.get(workstreamId);
    if (agent) {
      this.deps.sessionManager.unlinkEntity(agent.sessionId, entityUri);
    }
  }

  /**
   * Notify a running agent that an entity was linked, without persisting to
   * workstream_linked_entities. Used by group-level mutations to propagate
   * inherited entities to running agents without creating direct DB records.
   */
  notifyEntityLinked(
    workstreamId: string,
    entityUri: string,
    entityType: string,
    entityTitle?: string,
  ): void {
    const agent = this.agents.get(workstreamId);
    if (agent) {
      this.deps.sessionManager.linkEntity(
        agent.sessionId,
        entityUri,
        entityType,
        entityTitle ?? '',
      );
    }
  }

  /**
   * Notify a running agent that an entity was unlinked, without persisting.
   * Used by group-level mutations to propagate inherited entity removal.
   */
  notifyEntityUnlinked(workstreamId: string, entityUri: string): void {
    const agent = this.agents.get(workstreamId);
    if (agent) {
      this.deps.sessionManager.unlinkEntity(agent.sessionId, entityUri);
    }
  }

  /**
   * Inject an app-level event into a workstream's chat.
   * Used for system widgets (e.g. label execution) that don't come from the provider.
   */
  injectEvent(workstreamId: string, event: import('@vienna/agent-core').AgentEvent): void {
    const agent = this.agents.get(workstreamId);
    if (agent) {
      this.deps.sessionManager.injectEvent(agent.sessionId, event);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  isAgentRunning(workstreamId: string): boolean {
    const agent = this.agents.get(workstreamId);
    return agent !== undefined && this.deps.sessionManager.isSessionActive(agent.sessionId);
  }

  getSessionId(workstreamId: string): string | null {
    return this.agents.get(workstreamId)?.sessionId ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shutdown
  // ─────────────────────────────────────────────────────────────────────────

  async shutdown(): Promise<void> {
    this.log.info('Shutting down all workstream agents', { count: this.agents.size });
    const stops = [...this.agents.keys()].map((id) => this.stopAgent(id));
    await Promise.allSettled(stops);
    this.log.info('All workstream agents shut down');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal: Event subscription
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to session events and route them through the workstream layer.
   * Returns an unsubscribe function.
   */
  private subscribeToSessionEvents(workstreamId: string, sessionId: string): () => void {
    return this.deps.sessionManager.onSessionEvent(sessionId, (_sid, event, dbEventId) => {
      this.handleSessionEvent(workstreamId, event, dbEventId);
    });
  }

  /**
   * Handle an agent event for a workstream.
   * Called from the session event pipeline.
   */
  handleSessionEvent(workstreamId: string, event: AgentEvent, dbEventId?: number): void {
    this.log.debug('Session event received for workstream', {
      workstreamId,
      eventType: event.type,
      messageId: 'messageId' in event ? event.messageId : undefined,
      toolId: 'toolId' in event ? event.toolId : undefined,
    });

    // Detect failed resume: provider couldn't find the conversation to resume.
    // This happens when the CLI process was killed and the conversation state is stale.
    // Gracefully fall back to a fresh start (context is lost only when resume isn't possible).
    if (
      event.type === 'error' &&
      'message' in event &&
      typeof event.message === 'string' &&
      event.message.includes('No conversation found with session ID') &&
      !this.resumeRetryInFlight.has(workstreamId)
    ) {
      this.log.warn('Resume failed — retrying without resume', { workstreamId, error: event.message });
      // Build the retry promise first, then register it in the Map. Because
      // Map.has + Map.set above are synchronous and this handler is the only
      // writer, no second retry can be enqueued for the same workstream until
      // finally() removes the entry.
      const retry = this.stopAgent(workstreamId)
        .then(() => this.ensureAgent(workstreamId, /* skipResume */ true))
        .catch((err) => this.log.error('Retry without resume failed', { workstreamId, error: String(err) }))
        .finally(() => this.resumeRetryInFlight.delete(workstreamId));
      this.resumeRetryInFlight.set(workstreamId, retry);
      return; // Don't forward this error to the UI
    }

    // Derive new workstream status
    const isInFocus = this.focusedWorkstreamId === workstreamId;
    const ws = this.deps.workstreamRepo.getById(workstreamId);
    if (!ws) {
      // Workstream was deleted while its agent was still running (e.g., the agent
      // deleted itself via deleteWorkstream mutation). Skip status derivation but
      // still forward the event so the renderer receives pending tool results.
      this.log.warn('Workstream not found — forwarding event without status update', {
        workstreamId,
        eventType: event.type,
      });
      this.deps.emitter.onAgentEvent({ workstreamId, event, dbEventId });
      return;
    }

    // Archived workstreams still receive agent events (the agent may still be
    // running when the user archives), but we skip status derivation since
    // archived state is orthogonal to runtime status.
    const newStatus = ws.archivedAt != null
      ? null
      : deriveWorkstreamStatus(ws.status, event, isInFocus);
    if (newStatus) {
      this.log.info('Workstream status transition', {
        workstreamId,
        from: ws.status,
        to: newStatus,
        triggerEvent: event.type,
      });
      this.updateStatus(workstreamId, newStatus);
    }

    // Forward event as workstream-scoped event
    this.log.debug('Emitting workstream agent event', {
      workstreamId,
      eventType: event.type,
    });
    this.deps.emitter.onAgentEvent({ workstreamId, event, dbEventId });

    // Notify external listeners (e.g., RoutineExecutor for run completion tracking)
    for (const listener of this.eventListeners) {
      try {
        listener(workstreamId, event);
      } catch (err) {
        this.log.error('Event listener threw', { workstreamId, error: String(err) });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fork
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Fork a workstream at a specific message, creating a new workstream with
   * conversation context up to that point.
   */
  async forkWorkstream(input: {
    sourceWorkstreamId: string;
    messageId?: string;
    providerUuid?: string;
    title?: string;
    createWorktrees?: boolean;
  }): Promise<{
    workstream: { id: string; title: string; status: string; model: string | null };
    worktrees?: Array<{ directoryPath: string; branch: string; worktreePath?: string; error?: string }>;
  }> {
    const log = this.log.child({ sourceWorkstreamId: input.sourceWorkstreamId });
    log.info('Forking workstream', { messageId: input.messageId, providerUuid: input.providerUuid });

    // 1. Load source workstream
    const source = this.deps.workstreamRepo.getById(input.sourceWorkstreamId);
    if (!source) throw new Error(`Source workstream ${input.sourceWorkstreamId} not found`);

    const title = input.title ?? `Fork of ${source.title}`;

    // 2. Get source's resumable session for provider session ID and cwd
    const previousSession = this.deps.sessionRepo.getResumableByWorkstream(input.sourceWorkstreamId);

    // 3. Fork the JSONL session file (if session exists)
    let newProviderSessionId: string | undefined;
    if (previousSession?.providerSessionId) {
      try {
        const { findSessionFile, forkSessionAtUuid, copySessionWithNewId } = await import(
          '@vienna/agent-providers/claude-code/session-fork'
        );
        const { randomUUID } = await import('node:crypto');

        const sourcePath = findSessionFile(previousSession.providerSessionId);
        if (!sourcePath) {
          throw new Error(`Session file not found for provider session: ${previousSession.providerSessionId}`);
        }

        newProviderSessionId = randomUUID();

        if (input.providerUuid) {
          // Fork at a specific message
          const result = await forkSessionAtUuid(sourcePath, input.providerUuid, newProviderSessionId, input.messageId);
          log.info('JSONL session forked at message', {
            sourcePath,
            targetPath: result.targetPath,
            lineCount: result.lineCount,
          });
        } else {
          // Fork entire session (no specific fork point)
          const result = await copySessionWithNewId(sourcePath, newProviderSessionId);
          log.info('JSONL session copied (full fork)', {
            sourcePath,
            targetPath: result.targetPath,
            lineCount: result.lineCount,
          });
        }
      } catch (err) {
        log.warn('Failed to fork JSONL session file (fork will proceed without provider history)', {
          error: err instanceof Error ? err.message : String(err),
        });
        newProviderSessionId = undefined;
      }
    }

    // 4. Create new workstream (same project, same group)
    const newWorkstream = this.deps.workstreamRepo.create({
      projectId: source.projectId,
      groupId: source.groupId,
      title,
      model: source.model,
      forkedFromWorkstreamId: input.sourceWorkstreamId,
      forkedAtMessageId: input.messageId ?? null,
    });
    log.info('Fork workstream created', { newWorkstreamId: newWorkstream.id });

    // 5. Copy directories from source workstream
    const sourceDirs = this.deps.workstreamDirRepo.getByWorkstream(input.sourceWorkstreamId);
    for (const dir of sourceDirs) {
      this.deps.workstreamDirRepo.add(newWorkstream.id, dir.path, dir.label ?? undefined, dir.isInherited);
    }

    // 6. Copy branch selections or create new worktrees
    const sourceBranches = this.deps.branchSelectionRepo.list(input.sourceWorkstreamId);
    type WorktreeResult = { directoryPath: string; branch: string; worktreePath?: string; error?: string };
    let worktrees: WorktreeResult[] | undefined;

    if (input.createWorktrees && sourceBranches.length > 0) {
      // Create new worktrees with unique branch names per directory
      worktrees = [];
      const branchSuffix = newWorkstream.id.slice(0, 8);
      for (let idx = 0; idx < sourceBranches.length; idx++) {
        const sel = sourceBranches[idx]!;
        const branchName = sourceBranches.length > 1
          ? `fork-${branchSuffix}-${idx}`
          : `fork-${branchSuffix}`;
        try {
          // Use the source branch as the base for the new worktree
          this.deps.branchSelectionRepo.set({
            workstreamId: newWorkstream.id,
            directoryPath: sel.directoryPath,
            branch: branchName,
            baseBranch: sel.branch ?? sel.baseBranch,
          });
          worktrees.push({ directoryPath: sel.directoryPath, branch: branchName });
        } catch (err) {
          worktrees.push({
            directoryPath: sel.directoryPath,
            branch: branchName,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } else {
      // Share existing branch selections (same worktree paths)
      for (const sel of sourceBranches) {
        this.deps.branchSelectionRepo.set({
          workstreamId: newWorkstream.id,
          directoryPath: sel.directoryPath,
          branch: sel.branch,
          worktreePath: sel.worktreePath,
          baseBranch: sel.baseBranch,
        });
      }
    }

    // 7. Create a session for the fork and copy events up to the fork point.
    //    This runs regardless of whether the JSONL fork succeeded — the user
    //    should see conversation history in the UI even without provider context.
    if (previousSession) {
      const { randomUUID } = await import('node:crypto');
      const newSessionId = randomUUID();
      this.deps.sessionRepo.create({
        id: newSessionId,
        providerId: this.deps.defaultProviderId,
        model: source.model,
        cwd: previousSession.cwd,
        providerSessionId: newProviderSessionId ?? null,
        workstreamId: newWorkstream.id,
        status: 'completed',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCostCents: 0,
      });

      // 8. Copy events from source workstream up to the fork point.
      //    Must query across ALL sessions (not just the resumable one) since a
      //    workstream's conversation may span multiple sessions.
      const allEvents = this.deps.eventRepo.getByWorkstreamTail(
        input.sourceWorkstreamId,
        100_000, // effectively unlimited — fork slices to the fork point below
      );
      const parsed = this.deps.eventRepo.parseEvents(allEvents);

      // Find the fork point: keep events up to and including the turn that contains messageId.
      // If no messageId provided, copy ALL events (full fork).
      let forkIndex = parsed.length;
      if (input.messageId) {
        let found = false;
        for (let i = 0; i < parsed.length; i++) {
          const evt = parsed[i];
          if ('messageId' in evt && evt.messageId === input.messageId) {
            found = true;
            // Find the turn_end for this message
            for (let j = i; j < parsed.length; j++) {
              if (parsed[j].type === 'turn_end' && 'messageId' in parsed[j] && (parsed[j] as { messageId: string }).messageId === input.messageId) {
                forkIndex = j + 1;
                break;
              }
            }
            if (forkIndex === parsed.length) {
              // No turn_end found — just include up to the last event referencing this message
              forkIndex = i + 1;
            }
            break;
          }
        }
        if (!found) {
          log.warn('Fork messageId not found in events — copying all events as fallback', {
            messageId: input.messageId,
            totalEvents: parsed.length,
          });
        }
      }

      const eventsToFork = parsed.slice(0, forkIndex);
      if (eventsToFork.length > 0) {
        this.deps.eventRepo.insertBatch(newSessionId, eventsToFork);
        log.info('Events copied to fork', { eventCount: eventsToFork.length });
      }
    }

    return {
      workstream: {
        id: newWorkstream.id,
        title: newWorkstream.title,
        status: newWorkstream.status,
        model: newWorkstream.model,
      },
      worktrees,
    };
  }

  /** Update workstream status and emit change event */
  private updateStatus(workstreamId: string, newStatus: WorkstreamStatus): void {
    const ws = this.deps.workstreamRepo.getById(workstreamId);
    if (!ws || ws.status === newStatus) return;

    const previousStatus = ws.status;
    this.deps.workstreamRepo.update(workstreamId, { status: newStatus });

    this.deps.emitter.onStatusChanged({
      workstreamId,
      status: newStatus,
      previousStatus,
    });

  }
}
