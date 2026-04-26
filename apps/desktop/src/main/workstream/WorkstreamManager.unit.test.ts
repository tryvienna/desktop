import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentEvent, PermissionResponse, SessionRecord } from '@vienna/agent-core';
import type {
  WorkstreamRepository,
  WorkstreamDirectoryRepository,
  WorkstreamLinkedEntityRepository,
  BranchSelectionRepository,
  WorkstreamRecord,
} from '@vienna/app-db';
import type { SessionRepository, EventRepository } from '@vienna/agent-db';
import type { Logger } from '@vienna/logger';
import type { SessionManager } from '../agent/SessionManager';
import {
  WorkstreamManager,
  type WorkstreamManagerDeps,
  type WorkstreamEventEmitter,
} from './WorkstreamManager';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const WS_RECORD: WorkstreamRecord = {
  id: 'ws-1',
  projectId: 'proj-1',
  groupId: null,
  title: 'Test WS',
  status: 'idle',
  model: 'sonnet',
  isPinned: false,
  isRoutineWorkstream: false,
  activeSessionId: null,
  messageCount: 0,
  lastActivityAt: 1000,
  archivedAt: null,
  createdAt: 1000,
  updatedAt: 1000,
};

function makeSessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const now = Date.now();
  return {
    id: 'sess-1',
    providerId: 'test-provider',
    model: 'sonnet',
    cwd: '/tmp',
    providerSessionId: null,
    workstreamId: 'ws-1',
    status: 'active',
    createdAt: now,
    lastActivityAt: now,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostCents: 0,
    ...overrides,
  };
}


// ─── Mock factories ─────────────────────────────────────────────────────────

function createMockLogger(): Logger {
  const logger: Logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    flush: vi.fn().mockResolvedValue(undefined),
  };
  return logger;
}

function createMockSessionManager(): SessionManager {
  return {
    startSession: vi.fn().mockResolvedValue('session-1'),
    stopSession: vi.fn().mockResolvedValue(true),
    sendMessage: vi.fn(),
    respondPermission: vi.fn(),
    interrupt: vi.fn(),
    isSessionActive: vi.fn().mockReturnValue(true),
    getSession: vi.fn(),
    onSessionEvent: vi.fn().mockReturnValue(() => {}),
    replaySession: vi.fn(),
    switchModel: vi.fn(),
    linkEntity: vi.fn(),
    unlinkEntity: vi.fn(),
    injectEvent: vi.fn(),
    compactConversation: vi.fn().mockReturnValue(true),
  } as unknown as SessionManager;
}

function createMockEmitter(): WorkstreamEventEmitter {
  return {
    onAgentEvent: vi.fn(),
    onStatusChanged: vi.fn(),
    onAgentStateChanged: vi.fn(),
  };
}

function createDeps(overrides?: Partial<WorkstreamManagerDeps>): WorkstreamManagerDeps {
  return {
    sessionManager: createMockSessionManager(),
    workstreamRepo: {
      getById: vi.fn().mockReturnValue(WS_RECORD),
      update: vi.fn(),
      incrementMessageCount: vi.fn(),
    } as unknown as WorkstreamRepository,
    workstreamDirRepo: {
      getByWorkstream: vi.fn().mockReturnValue([]),
    } as unknown as WorkstreamDirectoryRepository,
    branchSelectionRepo: {
      getDirectoriesWithBranchInfo: vi.fn().mockReturnValue([]),
    } as unknown as BranchSelectionRepository,
    linkedEntityRepo: {
      getByWorkstream: vi.fn().mockReturnValue([]),
      link: vi.fn(),
      unlink: vi.fn(),
    } as unknown as WorkstreamLinkedEntityRepository,
    sessionRepo: {
      getActiveByWorkstream: vi.fn().mockReturnValue(null),
      getResumableByWorkstream: vi.fn().mockReturnValue(null),
      getByWorkstream: vi.fn().mockReturnValue([]),
    } as unknown as SessionRepository,
    eventRepo: {
      getBySession: vi.fn().mockReturnValue([]),
      parseEvents: vi.fn().mockReturnValue([]),
    } as unknown as EventRepository,
    emitter: createMockEmitter(),
    logger: createMockLogger(),
    defaultProviderId: 'test-provider',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('WorkstreamManager', () => {
  let deps: WorkstreamManagerDeps;
  let manager: WorkstreamManager;

  beforeEach(() => {
    deps = createDeps();
    manager = new WorkstreamManager(deps);
  });

  // ── Agent Lifecycle ────────────────────────────────────────────────────

  describe('ensureAgent', () => {
    it('starts a new session and registers it', async () => {
      const sessionId = await manager.ensureAgent('ws-1');

      expect(sessionId).toBe('session-1');
      expect(deps.sessionManager.startSession).toHaveBeenCalled();
      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', {
        activeSessionId: 'session-1',
      });
    });

    it('returns existing session if already active', async () => {
      await manager.ensureAgent('ws-1');
      const sessionId = await manager.ensureAgent('ws-1');

      expect(sessionId).toBe('session-1');
      expect(deps.sessionManager.startSession).toHaveBeenCalledTimes(1);
    });

    it('cleans up stale entry if session is no longer active', async () => {
      await manager.ensureAgent('ws-1');
      vi.mocked(deps.sessionManager.isSessionActive).mockReturnValue(false);
      vi.mocked(deps.sessionManager.startSession).mockResolvedValue('session-2');

      const sessionId = await manager.ensureAgent('ws-1');

      expect(sessionId).toBe('session-2');
      expect(deps.sessionManager.startSession).toHaveBeenCalledTimes(2);
    });

    it('throws if workstream not found', async () => {
      vi.mocked(deps.workstreamRepo.getById).mockReturnValue(null as never);

      await expect(manager.ensureAgent('missing')).rejects.toThrow('Workstream missing not found');
    });

    it('resumes a completed session via getResumableByWorkstream', async () => {
      vi.mocked(deps.sessionRepo.getResumableByWorkstream).mockReturnValue(
        makeSessionRecord({
          id: 'prev-session',
          providerSessionId: 'provider-123',
          status: 'completed',
        })
      );

      await manager.ensureAgent('ws-1');

      expect(deps.sessionRepo.getResumableByWorkstream).toHaveBeenCalledWith('ws-1');
      expect(deps.sessionManager.startSession).toHaveBeenCalledWith(
        'test-provider',
        expect.objectContaining({ sessionId: 'provider-123' }),
      );
    });

    it('does not pass a sessionId when no resumable session exists', async () => {
      vi.mocked(deps.sessionRepo.getResumableByWorkstream).mockReturnValue(null);

      await manager.ensureAgent('ws-1');

      expect(deps.sessionManager.startSession).toHaveBeenCalledWith(
        'test-provider',
        expect.objectContaining({ sessionId: undefined }),
      );
    });

    it('does not use getActiveByWorkstream for resume lookup', async () => {
      await manager.ensureAgent('ws-1');

      // getResumableByWorkstream should be called, NOT getActiveByWorkstream
      expect(deps.sessionRepo.getResumableByWorkstream).toHaveBeenCalledWith('ws-1');
      // getActiveByWorkstream should NOT be called during ensureAgent
      expect(deps.sessionRepo.getActiveByWorkstream).not.toHaveBeenCalled();
    });
  });

  describe('stopAgent', () => {
    it('stops the session and cleans up', async () => {
      await manager.ensureAgent('ws-1');
      await manager.stopAgent('ws-1');

      expect(deps.sessionManager.stopSession).toHaveBeenCalledWith('session-1');
      // Idle status is preserved (not a runtime-dependent status), so only activeSessionId is cleared
      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', {
        activeSessionId: null,
      });
    });

    it('is a no-op if no agent running', async () => {
      await manager.stopAgent('ws-1');
      expect(deps.sessionManager.stopSession).not.toHaveBeenCalled();
    });

    it('preserves completed_unviewed status instead of resetting to idle', async () => {
      await manager.ensureAgent('ws-1');

      // Simulate workstream completing while agent is still running
      vi.mocked(deps.workstreamRepo.getById).mockReturnValue({
        ...WS_RECORD,
        status: 'completed_unviewed',
      });

      await manager.stopAgent('ws-1');

      // Only activeSessionId is cleared; status is NOT reset because it's not a runtime status
      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', {
        activeSessionId: null,
      });
    });

    it('resets processing status to idle on stopAgent', async () => {
      await manager.ensureAgent('ws-1');

      vi.mocked(deps.workstreamRepo.getById).mockReturnValue({
        ...WS_RECORD,
        status: 'processing',
      });

      await manager.stopAgent('ws-1');

      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', {
        activeSessionId: null,
        status: 'idle',
      });
    });
  });

  describe('restartAgent', () => {
    it('stops then starts agent', async () => {
      await manager.ensureAgent('ws-1');
      vi.mocked(deps.sessionManager.startSession).mockResolvedValue('session-2');

      const sessionId = await manager.restartAgent('ws-1');

      expect(deps.sessionManager.stopSession).toHaveBeenCalled();
      expect(sessionId).toBe('session-2');
    });
  });

  // ── Messaging ──────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('auto-starts agent and sends message', async () => {
      await manager.sendMessage('ws-1', 'hello');

      expect(deps.sessionManager.startSession).toHaveBeenCalled();
      expect(deps.sessionManager.sendMessage).toHaveBeenCalledWith('session-1', 'hello');
      expect(deps.workstreamRepo.incrementMessageCount).toHaveBeenCalledWith('ws-1');
    });
  });

  describe('respondPermission', () => {
    it('delegates to session manager', async () => {
      await manager.ensureAgent('ws-1');
      manager.respondPermission('ws-1', 'req-1', 'allow' as unknown as PermissionResponse);

      expect(deps.sessionManager.respondPermission).toHaveBeenCalledWith(
        'session-1',
        'req-1',
        'allow',
      );
    });

    it('is a no-op if no agent running', () => {
      manager.respondPermission('ws-1', 'req-1', 'allow' as unknown as PermissionResponse);
      expect(deps.sessionManager.respondPermission).not.toHaveBeenCalled();
    });
  });

  describe('interrupt', () => {
    it('delegates to session manager', async () => {
      await manager.ensureAgent('ws-1');
      manager.interrupt('ws-1');

      expect(deps.sessionManager.interrupt).toHaveBeenCalledWith('session-1');
    });

    it('is a no-op if no agent running', () => {
      manager.interrupt('ws-1');
      expect(deps.sessionManager.interrupt).not.toHaveBeenCalled();
    });
  });

  describe('compactConversation', () => {
    it('delegates to SessionManager.compactConversation', async () => {
      await manager.ensureAgent('ws-1');
      const result = await manager.compactConversation('ws-1');

      expect(result).toBe(true);
      expect(deps.sessionManager.compactConversation).toHaveBeenCalledWith('session-1', undefined);
    });

    it('passes instructions to SessionManager', async () => {
      await manager.ensureAgent('ws-1');
      await manager.compactConversation('ws-1', 'Focus on the API discussion');

      expect(deps.sessionManager.compactConversation).toHaveBeenCalledWith(
        'session-1',
        'Focus on the API discussion',
      );
    });

    it('resumes agent and compacts if resumable session exists', async () => {
      vi.mocked(deps.sessionRepo.getResumableByWorkstream).mockReturnValue(
        { id: 'prev-session', workstreamId: 'ws-1', providerSessionId: 'provider-123' } as unknown as SessionRecord,
      );
      const result = await manager.compactConversation('ws-1');

      expect(result).toBe(true);
      expect(deps.sessionManager.startSession).toHaveBeenCalled();
      expect(deps.sessionManager.compactConversation).toHaveBeenCalledWith('session-1', undefined);
    });

    it('returns false if no agent running and no resumable session', async () => {
      const result = await manager.compactConversation('ws-1');

      expect(result).toBe(false);
      expect(deps.sessionManager.startSession).not.toHaveBeenCalled();
    });
  });

  // ── Focus ──────────────────────────────────────────────────────────────

  describe('setInFocus / getFocusedWorkstreamId', () => {
    it('tracks the focused workstream', () => {
      manager.setInFocus('ws-1');
      expect(manager.getFocusedWorkstreamId()).toBe('ws-1');
    });

    it('can be set to null', () => {
      manager.setInFocus('ws-1');
      manager.setInFocus(null);
      expect(manager.getFocusedWorkstreamId()).toBeNull();
    });

    it('marks completed_unviewed as viewed and emits status change', () => {
      vi.mocked(deps.workstreamRepo.getById).mockReturnValue({
        ...WS_RECORD,
        status: 'completed_unviewed',
      });

      manager.setInFocus('ws-1');

      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', { status: 'active' });
      expect(deps.emitter.onStatusChanged).toHaveBeenCalledWith({
        workstreamId: 'ws-1',
        status: 'active',
        previousStatus: 'completed_unviewed',
      });
    });

    it('does not update status when focusing an idle workstream', () => {
      manager.setInFocus('ws-1');

      expect(deps.workstreamRepo.update).not.toHaveBeenCalled();
      expect(deps.emitter.onStatusChanged).not.toHaveBeenCalled();
    });

    it('does not update status when focusing a non-existent workstream', () => {
      vi.mocked(deps.workstreamRepo.getById).mockReturnValue(null as never);
      manager.setInFocus('missing');

      expect(deps.workstreamRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── Model switching ────────────────────────────────────────────────────

  describe('switchModel', () => {
    it('updates workstream and restarts agent', async () => {
      await manager.ensureAgent('ws-1');
      vi.mocked(deps.sessionManager.startSession).mockResolvedValue('session-2');

      await manager.switchModel('ws-1', 'opus');

      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', { model: 'opus' });
      expect(deps.sessionManager.switchModel).toHaveBeenCalledWith('session-1', 'sonnet', 'opus');
    });

    it('is a no-op if workstream not found', async () => {
      vi.mocked(deps.workstreamRepo.getById).mockReturnValue(null as never);

      await manager.switchModel('missing', 'opus');

      expect(deps.sessionManager.switchModel).not.toHaveBeenCalled();
    });
  });

  // ── History replay ─────────────────────────────────────────────────────

  describe('replayHistory', () => {
    it('replays active session events', async () => {
      const events = [{ type: 'text' }] as unknown as AgentEvent[];
      vi.mocked(deps.eventRepo.getBySession).mockReturnValue([]);
      vi.mocked(deps.eventRepo.parseEvents).mockReturnValue(events);

      await manager.ensureAgent('ws-1');
      manager.replayHistory('ws-1');

      expect(deps.emitter.onAgentEvent).toHaveBeenCalledWith({
        workstreamId: 'ws-1',
        event: events[0],
        isFromHistory: true,
      });
    });

    it('replays recent sessions in chronological order when no agent active', () => {
      vi.mocked(deps.sessionRepo.getByWorkstream).mockReturnValue([
        makeSessionRecord({ id: 'newer-session' }),
        makeSessionRecord({ id: 'older-session' }),
      ]);
      vi.mocked(deps.eventRepo.parseEvents).mockReturnValue([]);

      manager.replayHistory('ws-1');

      // Should replay oldest first, then newest
      expect(deps.eventRepo.getBySession).toHaveBeenCalledTimes(2);
      expect(deps.eventRepo.getBySession).toHaveBeenNthCalledWith(1, 'older-session');
      expect(deps.eventRepo.getBySession).toHaveBeenNthCalledWith(2, 'newer-session');
    });

    it('does nothing if no sessions at all', () => {
      vi.mocked(deps.sessionRepo.getByWorkstream).mockReturnValue([]);

      manager.replayHistory('ws-1');

      expect(deps.eventRepo.getBySession).not.toHaveBeenCalled();
    });
  });

  // ── Entity linking ─────────────────────────────────────────────────────

  describe('linkEntity', () => {
    it('links via repo and notifies session', async () => {
      await manager.ensureAgent('ws-1');
      manager.linkEntity('ws-1', 'uri-1', 'issue', 'Bug #1');

      expect(deps.linkedEntityRepo.link).toHaveBeenCalledWith('ws-1', 'uri-1', 'issue', 'Bug #1');
      expect(deps.sessionManager.linkEntity).toHaveBeenCalledWith(
        'session-1',
        'uri-1',
        'issue',
        'Bug #1',
      );
    });

    it('links via repo even without agent', () => {
      manager.linkEntity('ws-1', 'uri-1', 'issue');

      expect(deps.linkedEntityRepo.link).toHaveBeenCalled();
      expect(deps.sessionManager.linkEntity).not.toHaveBeenCalled();
    });
  });

  describe('unlinkEntity', () => {
    it('unlinks via repo and notifies session', async () => {
      await manager.ensureAgent('ws-1');
      manager.unlinkEntity('ws-1', 'uri-1');

      expect(deps.linkedEntityRepo.unlink).toHaveBeenCalledWith('ws-1', 'uri-1');
      expect(deps.sessionManager.unlinkEntity).toHaveBeenCalledWith('session-1', 'uri-1');
    });
  });

  // ── Queries ────────────────────────────────────────────────────────────

  describe('isAgentRunning', () => {
    it('returns true when agent active', async () => {
      await manager.ensureAgent('ws-1');
      expect(manager.isAgentRunning('ws-1')).toBe(true);
    });

    it('returns false when no agent', () => {
      expect(manager.isAgentRunning('ws-1')).toBe(false);
    });
  });

  describe('getSessionId', () => {
    it('returns session ID when running', async () => {
      await manager.ensureAgent('ws-1');
      expect(manager.getSessionId('ws-1')).toBe('session-1');
    });

    it('returns null when no agent', () => {
      expect(manager.getSessionId('ws-1')).toBeNull();
    });
  });

  // ── Shutdown ───────────────────────────────────────────────────────────

  describe('shutdown', () => {
    it('stops all agents', async () => {
      await manager.ensureAgent('ws-1');
      await manager.shutdown();

      expect(deps.sessionManager.stopSession).toHaveBeenCalledWith('session-1');
    });
  });

  // ── Event handling & status derivation ──────────────────────────────

  describe('handleSessionEvent', () => {
    it('emits workstream-scoped event', () => {
      const event = { type: 'text_delta' } as AgentEvent;
      manager.handleSessionEvent('ws-1', event);

      expect(deps.emitter.onAgentEvent).toHaveBeenCalledWith({
        workstreamId: 'ws-1',
        event,
      });
    });

    it('notifies external listeners', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      const event = { type: 'text_delta' } as AgentEvent;
      manager.handleSessionEvent('ws-1', event);

      expect(listener).toHaveBeenCalledWith('ws-1', event);
    });

    it('no-ops if workstream not found', () => {
      vi.mocked(deps.workstreamRepo.getById).mockReturnValue(null as never);

      const event = { type: 'text_delta' } as AgentEvent;
      manager.handleSessionEvent('ws-1', event);

      expect(deps.emitter.onAgentEvent).not.toHaveBeenCalled();
    });

    it('transitions to processing on turn_start', () => {
      manager.handleSessionEvent('ws-1', { type: 'turn_start' } as AgentEvent);

      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', { status: 'processing' });
      expect(deps.emitter.onStatusChanged).toHaveBeenCalledWith({
        workstreamId: 'ws-1',
        status: 'processing',
        previousStatus: 'idle',
      });
    });

    it('transitions to completed_unviewed on turn_end when not in focus', () => {
      // WS is not in focus (default)
      vi.mocked(deps.workstreamRepo.getById).mockReturnValue({
        ...WS_RECORD,
        status: 'processing',
      } as never);

      manager.handleSessionEvent('ws-1', { type: 'turn_end' } as AgentEvent);

      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', {
        status: 'completed_unviewed',
      });
    });

    it('transitions to active on turn_end when in focus', () => {
      manager.setInFocus('ws-1');
      // Clear mocks from setInFocus side effects
      vi.mocked(deps.workstreamRepo.update).mockClear();
      vi.mocked(deps.emitter.onStatusChanged).mockClear();

      vi.mocked(deps.workstreamRepo.getById).mockReturnValue({
        ...WS_RECORD,
        status: 'processing',
      } as never);

      manager.handleSessionEvent('ws-1', { type: 'turn_end' } as AgentEvent);

      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', { status: 'active' });
    });

    it('transitions to waiting_permission on tool_permission_needed', () => {
      manager.handleSessionEvent('ws-1', {
        type: 'tool_permission_needed',
      } as AgentEvent);

      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', {
        status: 'waiting_permission',
      });
    });

    it('transitions back to processing from waiting_permission on tool_running', () => {
      vi.mocked(deps.workstreamRepo.getById).mockReturnValue({
        ...WS_RECORD,
        status: 'waiting_permission',
      } as never);

      manager.handleSessionEvent('ws-1', { type: 'tool_running' } as AgentEvent);

      expect(deps.workstreamRepo.update).toHaveBeenCalledWith('ws-1', { status: 'processing' });
    });

    it('does not emit status change for events that do not affect status', () => {
      manager.handleSessionEvent('ws-1', { type: 'text_delta' } as AgentEvent);

      expect(deps.emitter.onStatusChanged).not.toHaveBeenCalled();
    });

    it('does not update status for archived workstreams but still emits events', () => {
      vi.mocked(deps.workstreamRepo.getById).mockReturnValue({
        ...WS_RECORD,
        archivedAt: Date.now(),
      } as never);

      manager.handleSessionEvent('ws-1', { type: 'turn_start' } as AgentEvent);

      // Archived workstreams skip status derivation
      expect(deps.emitter.onStatusChanged).not.toHaveBeenCalled();
      // But agent events are still forwarded (agent may still be running)
      expect(deps.emitter.onAgentEvent).toHaveBeenCalledWith({
        workstreamId: 'ws-1',
        event: { type: 'turn_start' },
      });
    });

    it('does not emit status change when status is already the same', () => {
      vi.mocked(deps.workstreamRepo.getById).mockReturnValue({
        ...WS_RECORD,
        status: 'processing',
      } as never);

      manager.handleSessionEvent('ws-1', { type: 'turn_start' } as AgentEvent);

      // deriveWorkstreamStatus returns null when already processing
      expect(deps.emitter.onStatusChanged).not.toHaveBeenCalled();
    });
  });

  describe('addEventListener', () => {
    it('returns an unsubscribe function', () => {
      const listener = vi.fn();
      const unsub = manager.addEventListener(listener);

      manager.handleSessionEvent('ws-1', { type: 'text_delta' } as AgentEvent);
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      manager.handleSessionEvent('ws-1', { type: 'text_delta' } as AgentEvent);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
