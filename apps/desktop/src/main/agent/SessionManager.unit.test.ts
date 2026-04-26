import { describe, it, expect, vi } from 'vitest';
import type { AgentEvent, AgentProvider, PermissionResponse } from '@vienna/agent-core';
import type { PermissionEngine } from '@vienna/agent-permissions';
import type { EventRepository, SessionRepository, DirectoryRepository, PermissionRuleRepository } from '@vienna/agent-db';
import type { ProviderRegistry } from '@vienna/agent-providers';
import { SessionManager, type AgentEventEmitter, type SessionManagerDeps } from './SessionManager';

// ─── Mock provider ──────────────────────────────────────────────────────────

function createMockProvider(overrides: Partial<AgentProvider> = {}): AgentProvider {
  let eventCallback: ((event: AgentEvent) => void) | null = null;

  return {
    id: 'test-provider',
    displayName: 'Test Provider',
    state: 'running',
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    checkAvailability: vi.fn().mockResolvedValue({ available: true }),
    sendMessage: vi.fn(),
    respondPermission: vi.fn(),
    interrupt: vi.fn(),
    onEvent: vi.fn((cb) => {
      eventCallback = cb;
      return () => {
        eventCallback = null;
      };
    }),
    onDebug: vi.fn(() => () => {}),
    isHealthy: vi.fn().mockReturnValue(true),
    // Helper to simulate events from provider
    _emit: (event: AgentEvent) => eventCallback?.(event),
    ...overrides,
  } as AgentProvider & { _emit: (event: AgentEvent) => void };
}

// ─── Mock deps ──────────────────────────────────────────────────────────────

function createMockDeps(providerOverrides?: Partial<AgentProvider>): {
  deps: SessionManagerDeps;
  provider: AgentProvider & { _emit: (event: AgentEvent) => void };
} {
  const provider = createMockProvider(providerOverrides) as AgentProvider & {
    _emit: (event: AgentEvent) => void;
  };

  const deps: SessionManagerDeps = {
    registry: {
      create: vi.fn().mockReturnValue(provider),
    } as unknown as ProviderRegistry,
    permissionEngine: {
      check: vi.fn().mockReturnValue({ reason: 'no_match' }),
      addRule: vi.fn(),
      allowTool: vi.fn(),
      removeRules: vi.fn().mockReturnValue(0),
      clearSessionRules: vi.fn(),
      loadRules: vi.fn(),
      getRules: vi.fn().mockReturnValue([]),
    } as unknown as PermissionEngine,
    permissionRuleRepo: {
      add: vi.fn().mockReturnValue(1),
      getPersistent: vi.fn().mockReturnValue([]),
      deleteById: vi.fn(),
      deleteBySession: vi.fn(),
      deleteByToolNameAndScope: vi.fn().mockReturnValue(0),
      getByTool: vi.fn().mockReturnValue([]),
      getBySession: vi.fn().mockReturnValue([]),
    } as unknown as PermissionRuleRepository,
    eventRepo: {
      insert: vi.fn(),
      getBySession: vi.fn().mockReturnValue([]),
      parseEvents: vi.fn().mockReturnValue([]),
    } as unknown as EventRepository,
    sessionRepo: {
      create: vi.fn(),
      updateStatus: vi.fn(),
      updateActivity: vi.fn(),
      setProviderSessionId: vi.fn(),
      addUsage: vi.fn(),
    } as unknown as SessionRepository,
    directoryRepo: {
      addMany: vi.fn(),
    } as unknown as DirectoryRepository,
    emitter: {
      onEvent: vi.fn(),
      onStateChange: vi.fn(),
      onError: vi.fn(),
    } as AgentEventEmitter,
    logger: {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis(),
      flush: vi.fn().mockResolvedValue(undefined),
    },
  };

  return { deps, provider };
}

const SESSION_CONFIG = {
  cwd: '/tmp/test',
  directories: ['/project'],
};

describe('SessionManager', () => {
  // ─── Session lifecycle ──────────────────────────────────────────────

  describe('startSession', () => {
    it('creates a provider, persists session, starts provider, and emits state', async () => {
      const { deps, provider } = createMockDeps();
      const manager = new SessionManager(deps);

      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      expect(sessionId).toBeDefined();
      expect(deps.registry.create).toHaveBeenCalledWith('test-provider');
      expect(deps.sessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: sessionId,
          providerId: 'test-provider',
          cwd: '/tmp/test',
          status: 'active',
        })
      );
      expect(deps.directoryRepo.addMany).toHaveBeenCalledWith(sessionId, ['/project']);
      expect(provider.start).toHaveBeenCalled();
      expect(deps.emitter.onStateChange).toHaveBeenCalledWith({
        sessionId,
        state: 'running',
      });
    });

    it('always generates a fresh sessionId for the DB record (even when resuming)', async () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);

      const sessionId = await manager.startSession('test-provider', {
        ...SESSION_CONFIG,
        sessionId: 'provider-session-to-resume',
      });

      // The DB record should get a fresh UUID, not the provider session ID
      expect(sessionId).not.toBe('provider-session-to-resume');
      expect(sessionId).toBeDefined();
    });

    it('skips directory persistence when no directories given', async () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);

      await manager.startSession('test-provider', { cwd: '/tmp', directories: [] });

      expect(deps.directoryRepo.addMany).not.toHaveBeenCalled();
    });
  });

  describe('stopSession', () => {
    it('stops provider, updates status, emits state, and cleans up', async () => {
      const { deps, provider } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      const result = await manager.stopSession(sessionId);

      expect(result).toBe(true);
      expect(provider.stop).toHaveBeenCalled();
      expect(deps.sessionRepo.updateStatus).toHaveBeenCalledWith(sessionId, 'completed');
      expect(deps.emitter.onStateChange).toHaveBeenCalledWith({
        sessionId,
        state: 'stopped',
      });
      expect(manager.getSession(sessionId)).toBeUndefined();
    });

    it('returns false for unknown session', async () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);

      expect(await manager.stopSession('nonexistent')).toBe(false);
    });
  });

  // ─── Messaging ──────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('forwards message to provider and updates activity', async () => {
      const { deps, provider } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      const result = manager.sendMessage(sessionId, 'hello');

      expect(result).toBe(true);
      expect(provider.sendMessage).toHaveBeenCalledWith({ text: 'hello' });
      expect(deps.sessionRepo.updateActivity).toHaveBeenCalled();
    });

    it('returns false for unknown session', async () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);

      expect(manager.sendMessage('nonexistent', 'hi')).toBe(false);
    });

    it('returns false if provider is not running', async () => {
      const { deps } = createMockDeps({ state: 'stopped' as const });
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      expect(manager.sendMessage(sessionId, 'hi')).toBe(false);
    });
  });

  describe('respondPermission', () => {
    it('forwards response to provider', async () => {
      const { deps, provider } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      const response: PermissionResponse = { behavior: 'allow', scope: 'once' };
      const result = manager.respondPermission(sessionId, 'req-1', response);

      expect(result).toBe(true);
      expect(provider.respondPermission).toHaveBeenCalledWith('req-1', response);
    });

    it('returns false for unknown session', () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);

      expect(manager.respondPermission('none', 'req', { behavior: 'deny', scope: 'once' })).toBe(
        false
      );
    });
  });

  // ─── Permission rule creation ──────────────────────────────────────

  describe('respondPermission — rule creation', () => {
    async function setupWithPendingPermission(deps: SessionManagerDeps, provider: AgentProvider & { _emit: (event: AgentEvent) => void }) {
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      // Simulate a tool_permission_needed event that falls through to renderer
      provider._emit({
        type: 'tool_permission_needed',
        messageId: 'm1',
        toolId: 't1',
        toolName: 'Bash',
        requestId: 'req-1',
        input: { command: 'ls' },
      } as AgentEvent);

      return { manager, sessionId };
    }

    it('creates a session rule in the engine when scope is session', async () => {
      const { deps, provider } = createMockDeps();
      const { manager, sessionId } = await setupWithPendingPermission(deps, provider);

      manager.respondPermission(sessionId, 'req-1', { behavior: 'allow', scope: 'session' });

      expect(deps.permissionEngine.allowTool).toHaveBeenCalledWith('Bash', 'session', sessionId);
      // Session rules should NOT be persisted to DB
      expect(deps.permissionRuleRepo.add).not.toHaveBeenCalled();
    });

    it('creates a persistent rule in the engine AND persists to DB when scope is permanent', async () => {
      const { deps, provider } = createMockDeps();
      const { manager, sessionId } = await setupWithPendingPermission(deps, provider);

      manager.respondPermission(sessionId, 'req-1', { behavior: 'allow', scope: 'permanent' });

      expect(deps.permissionEngine.allowTool).toHaveBeenCalledWith('Bash', 'persistent', null);
      expect(deps.permissionRuleRepo.add).toHaveBeenCalledWith('Bash', 'allow', 'persistent', null);
    });

    it('does not create a rule when scope is once', async () => {
      const { deps, provider } = createMockDeps();
      const { manager, sessionId } = await setupWithPendingPermission(deps, provider);

      manager.respondPermission(sessionId, 'req-1', { behavior: 'allow', scope: 'once' });

      expect(deps.permissionEngine.allowTool).not.toHaveBeenCalled();
      expect(deps.permissionRuleRepo.add).not.toHaveBeenCalled();
    });

    it('does not create a rule when behavior is deny', async () => {
      const { deps, provider } = createMockDeps();
      const { manager, sessionId } = await setupWithPendingPermission(deps, provider);

      manager.respondPermission(sessionId, 'req-1', { behavior: 'deny', scope: 'session' });

      expect(deps.permissionEngine.allowTool).not.toHaveBeenCalled();
    });

    it('persists tool_running lifecycle event on approval (for replay)', async () => {
      const { deps, provider } = createMockDeps();
      const { manager, sessionId } = await setupWithPendingPermission(deps, provider);

      manager.respondPermission(sessionId, 'req-1', { behavior: 'allow', scope: 'session' });

      // Should persist a tool_running event with messageId/toolId from the pending permission
      expect(deps.eventRepo.insert).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          type: 'tool_running',
          messageId: 'm1',
          toolId: 't1',
          approvalMethod: 'session_rule',
        })
      );
    });

    it('persists tool_result error event on denial (for replay)', async () => {
      const { deps, provider } = createMockDeps();
      const { manager, sessionId } = await setupWithPendingPermission(deps, provider);

      manager.respondPermission(sessionId, 'req-1', { behavior: 'deny', scope: 'once' });

      // Should persist a tool_result error event
      expect(deps.eventRepo.insert).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          type: 'tool_result',
          messageId: 'm1',
          toolId: 't1',
          result: expect.objectContaining({ success: false }),
        })
      );
    });

    it('handles missing pending permission gracefully', async () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      // No tool_permission_needed event was emitted, so no pending permission
      const result = manager.respondPermission(sessionId, 'unknown-req', { behavior: 'allow', scope: 'session' });

      expect(result).toBe(true); // Still forwards to provider
      expect(deps.permissionEngine.allowTool).not.toHaveBeenCalled();
    });

    it('auto-allows subsequent requests after session rule is created', async () => {
      const { deps, provider } = createMockDeps();
      const { manager, sessionId } = await setupWithPendingPermission(deps, provider);

      // Approve with session scope
      manager.respondPermission(sessionId, 'req-1', { behavior: 'allow', scope: 'session' });

      // Now simulate the engine returning a rule_match for next request
      (deps.permissionEngine.check as ReturnType<typeof vi.fn>).mockReturnValue({
        reason: 'rule_match',
        allowed: true,
        matchedRule: { scope: 'session' },
      });

      provider._emit({
        type: 'tool_permission_needed',
        messageId: 'm2',
        toolId: 't2',
        toolName: 'Bash',
        requestId: 'req-2',
        input: { command: 'pwd' },
      } as AgentEvent);

      // Should auto-allow without asking user
      expect(provider.respondPermission).toHaveBeenCalledWith('req-2', {
        behavior: 'allow',
        scope: 'once',
      });
    });
  });

  describe('revokePermissionRule', () => {
    it('removes session rules from engine', async () => {
      const { deps } = createMockDeps();
      (deps.permissionEngine.removeRules as ReturnType<typeof vi.fn>).mockReturnValue(1);
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      const result = manager.revokePermissionRule(sessionId, 'Bash', 'session');

      expect(result).toBe(true);
      expect(deps.permissionEngine.removeRules).toHaveBeenCalledWith({
        toolName: 'Bash',
        scope: 'session',
        sessionId,
      });
    });

    it('removes persistent rules from engine and DB', async () => {
      const { deps } = createMockDeps();
      (deps.permissionEngine.removeRules as ReturnType<typeof vi.fn>).mockReturnValue(1);
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      const result = manager.revokePermissionRule(sessionId, 'Bash', 'persistent');

      expect(result).toBe(true);
      expect(deps.permissionEngine.removeRules).toHaveBeenCalledWith({
        toolName: 'Bash',
        scope: 'persistent',
      });
      expect(deps.permissionRuleRepo.deleteByToolNameAndScope).toHaveBeenCalledWith('Bash', 'persistent');
    });

    it('returns false when no rules matched', async () => {
      const { deps } = createMockDeps();
      (deps.permissionEngine.removeRules as ReturnType<typeof vi.fn>).mockReturnValue(0);
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      const result = manager.revokePermissionRule(sessionId, 'Bash', 'session');

      expect(result).toBe(false);
    });
  });

  describe('session cleanup', () => {
    it('clears session rules and pending permissions on stop', async () => {
      const { deps, provider } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      // Create a pending permission
      provider._emit({
        type: 'tool_permission_needed',
        messageId: 'm1',
        toolId: 't1',
        toolName: 'Bash',
        requestId: 'req-1',
        input: {},
      } as AgentEvent);

      await manager.stopSession(sessionId);

      expect(deps.permissionEngine.clearSessionRules).toHaveBeenCalledWith(sessionId);
    });

    it('loads persistent rules via loadPersistentRules (called once at startup, not per session)', () => {
      const { deps } = createMockDeps();
      const persistentRule = {
        id: 1,
        toolName: 'Read',
        behavior: 'allow' as const,
        scope: 'persistent' as const,
        sessionId: null,
        directoryPattern: null,
        createdAt: Date.now(),
      };
      (deps.permissionRuleRepo.getPersistent as ReturnType<typeof vi.fn>).mockReturnValue([persistentRule]);

      const manager = new SessionManager(deps);
      manager.loadPersistentRules();

      expect(deps.permissionEngine.addRule).toHaveBeenCalledWith(persistentRule);
      expect(deps.permissionEngine.addRule).toHaveBeenCalledTimes(1);
    });

    it('does not load persistent rules inside startSession (avoids duplication)', async () => {
      const { deps } = createMockDeps();
      const persistentRule = {
        id: 1,
        toolName: 'Read',
        behavior: 'allow' as const,
        scope: 'persistent' as const,
        sessionId: null,
        directoryPattern: null,
        createdAt: Date.now(),
      };
      (deps.permissionRuleRepo.getPersistent as ReturnType<typeof vi.fn>).mockReturnValue([persistentRule]);

      const manager = new SessionManager(deps);
      await manager.startSession('test-provider', SESSION_CONFIG);
      await manager.startSession('test-provider', SESSION_CONFIG);

      // addRule should NOT have been called by startSession
      expect(deps.permissionEngine.addRule).not.toHaveBeenCalled();
    });
  });

  describe('interrupt', () => {
    it('calls provider.interrupt and injects interrupted event', async () => {
      const { deps, provider } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      const result = manager.interrupt(sessionId);

      expect(result).toBe(true);
      expect(provider.interrupt).toHaveBeenCalled();
      expect(deps.eventRepo.insert).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({ type: 'interrupted' })
      );
    });

    it('returns false for unknown session', () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);
      expect(manager.interrupt('none')).toBe(false);
    });
  });

  // ─── Event pipeline ─────────────────────────────────────────────────

  describe('handleProviderEvent', () => {
    it('persists and emits generic events', async () => {
      const { deps, provider } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      const event: AgentEvent = {
        type: 'text_delta',
        messageId: 'm1',
        text: 'hello',
      };
      provider._emit(event);

      expect(deps.eventRepo.insert).toHaveBeenCalledWith(sessionId, event);
      expect(deps.emitter.onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId, event })
      );
    });

    it('auto-allows permission when engine returns rule_match + allowed', async () => {
      const { deps, provider } = createMockDeps();
      (deps.permissionEngine.check as ReturnType<typeof vi.fn>).mockReturnValue({
        reason: 'rule_match',
        allowed: true,
      });
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      provider._emit({
        type: 'tool_permission_needed',
        messageId: 'm1',
        toolId: 't1',
        toolName: 'Bash',
        requestId: 'r1',
        input: {},
      } as AgentEvent);

      expect(provider.respondPermission).toHaveBeenCalledWith('r1', {
        behavior: 'allow',
        scope: 'once',
      });
      // Should emit tool_running, not tool_permission_needed
      expect(deps.eventRepo.insert).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({ type: 'tool_running', approvalMethod: 'session_rule' })
      );
    });

    it('auto-denies permission when engine returns rule_match + denied', async () => {
      const { deps, provider } = createMockDeps();
      (deps.permissionEngine.check as ReturnType<typeof vi.fn>).mockReturnValue({
        reason: 'rule_match',
        allowed: false,
      });
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      provider._emit({
        type: 'tool_permission_needed',
        messageId: 'm1',
        toolId: 't1',
        toolName: 'Bash',
        requestId: 'r1',
        input: {},
      } as AgentEvent);

      expect(provider.respondPermission).toHaveBeenCalledWith('r1', {
        behavior: 'deny',
        scope: 'once',
      });
      expect(deps.eventRepo.insert).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          type: 'tool_result',
          result: expect.objectContaining({ success: false }),
        })
      );
    });

    it('passes permission request to renderer when no matching rule', async () => {
      const { deps, provider } = createMockDeps();
      (deps.permissionEngine.check as ReturnType<typeof vi.fn>).mockReturnValue({
        reason: 'no_match',
      });
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      const event = {
        type: 'tool_permission_needed',
        messageId: 'm1',
        toolId: 't1',
        toolName: 'Bash',
        requestId: 'r1',
        input: {},
      } as AgentEvent;
      provider._emit(event);

      // Should persist and emit the permission_needed event as-is
      expect(deps.eventRepo.insert).toHaveBeenCalledWith(sessionId, event);
      expect(deps.emitter.onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId, event })
      );
    });

    it('extracts provider session ID from session_init event', async () => {
      const { deps, provider } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      provider._emit({
        type: 'session_init',
        sessionId: 'provider-session-123',
      } as AgentEvent);

      expect(deps.sessionRepo.setProviderSessionId).toHaveBeenCalledWith(
        sessionId,
        'provider-session-123'
      );
    });

    it('tracks token usage from turn_end event', async () => {
      const { deps, provider } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      provider._emit({
        type: 'turn_end',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          totalCostUsd: 0.015,
        },
      } as AgentEvent);

      expect(deps.sessionRepo.addUsage).toHaveBeenCalledWith(sessionId, 100, 50, 2); // 0.015 * 100 = 1.5, rounded = 2
      expect(deps.sessionRepo.updateActivity).toHaveBeenCalled();
    });
  });

  // ─── App-injected events ────────────────────────────────────────────

  describe('switchModel', () => {
    it('injects a model_change event', async () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      manager.switchModel(sessionId, 'opus', 'sonnet');

      expect(deps.eventRepo.insert).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          type: 'model_change',
          fromModel: 'opus',
          toModel: 'sonnet',
        })
      );
    });
  });

  describe('linkEntity / unlinkEntity', () => {
    it('injects entity_link linked event', async () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      manager.linkEntity(sessionId, '@vienna//github_pr/42', 'github_pr', 'Fix bug');

      expect(deps.eventRepo.insert).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          type: 'entity_link',
          action: 'linked',
          entityUri: '@vienna//github_pr/42',
          entityType: 'github_pr',
          entityTitle: 'Fix bug',
        })
      );
    });

    it('injects entity_link unlinked event', async () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      manager.unlinkEntity(sessionId, '@vienna//github_pr/42');

      expect(deps.eventRepo.insert).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          type: 'entity_link',
          action: 'unlinked',
          entityUri: '@vienna//github_pr/42',
        })
      );
    });
  });

  // ─── Replay ─────────────────────────────────────────────────────────

  describe('replaySession', () => {
    it('emits all events from DB with isFromHistory flag', () => {
      const { deps } = createMockDeps();
      const events: AgentEvent[] = [
        { type: 'text_delta', messageId: 'm1', text: 'a' } as AgentEvent,
        { type: 'text_delta', messageId: 'm1', text: 'b' } as AgentEvent,
      ];
      (deps.eventRepo.getBySession as ReturnType<typeof vi.fn>).mockReturnValue([{}, {}]);
      (deps.eventRepo.parseEvents as ReturnType<typeof vi.fn>).mockReturnValue(events);

      const manager = new SessionManager(deps);
      manager.replaySession('session-1');

      expect(deps.emitter.onEvent).toHaveBeenCalledTimes(2);
      expect(deps.emitter.onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          event: events[0],
          isFromHistory: true,
        })
      );
    });
  });

  // ─── Queries ────────────────────────────────────────────────────────

  describe('isSessionActive', () => {
    it('returns true when session exists and provider is running', async () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);
      const sessionId = await manager.startSession('test-provider', SESSION_CONFIG);

      expect(manager.isSessionActive(sessionId)).toBe(true);
    });

    it('returns false for unknown session', () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);

      expect(manager.isSessionActive('none')).toBe(false);
    });
  });

  // ─── Shutdown ───────────────────────────────────────────────────────

  describe('shutdown', () => {
    it('stops all active sessions', async () => {
      const { deps } = createMockDeps();
      const manager = new SessionManager(deps);

      const id1 = await manager.startSession('test-provider', SESSION_CONFIG);
      const id2 = await manager.startSession('test-provider', SESSION_CONFIG);

      await manager.shutdown();

      expect(manager.getSession(id1)).toBeUndefined();
      expect(manager.getSession(id2)).toBeUndefined();
    });
  });
});
