import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionManager } from '../../main/agent/SessionManager';
import type { ProviderRegistry } from '@vienna/agent-providers';
import { createAgentHandlers } from './handlers';

function createMockSessionManager(): SessionManager {
  return {
    startSession: vi.fn().mockResolvedValue('session-1'),
    stopSession: vi.fn().mockResolvedValue(true),
    sendMessage: vi.fn().mockReturnValue(true),
    respondPermission: vi.fn().mockReturnValue(true),
    interrupt: vi.fn().mockReturnValue(true),
    getSession: vi.fn().mockReturnValue({ id: 'session-1' }),
    replaySession: vi.fn(),
    switchModel: vi.fn(),
    linkEntity: vi.fn(),
    unlinkEntity: vi.fn(),
    injectEvent: vi.fn(),
    compactConversation: vi.fn().mockReturnValue(true),
  } as unknown as SessionManager;
}

function createMockRegistry(): ProviderRegistry {
  return {
    listProviders: vi.fn().mockResolvedValue([{ id: 'test', name: 'Test' }]),
    checkProvider: vi.fn().mockResolvedValue({ available: true }),
  } as unknown as ProviderRegistry;
}

describe('createAgentHandlers', () => {
  let sm: SessionManager;
  let registry: ProviderRegistry;
  let handlers: ReturnType<typeof createAgentHandlers>;

  beforeEach(() => {
    sm = createMockSessionManager();
    registry = createMockRegistry();
    handlers = createAgentHandlers(sm, registry);
  });

  it('startSession delegates to SessionManager', async () => {
    const result = await handlers.agent.startSession({
      providerId: 'test',
      config: {} as never,
    });
    expect(result).toEqual({ sessionId: 'session-1' });
  });

  it('stopSession delegates to SessionManager', async () => {
    const result = await handlers.agent.stopSession({ sessionId: 'session-1' });
    expect(result).toEqual({ stopped: true });
  });

  it('sendMessage delegates to SessionManager', () => {
    const result = handlers.agent.sendMessage({ sessionId: 'session-1', text: 'hello' });
    expect(result).toEqual({ accepted: true });
    expect(sm.sendMessage).toHaveBeenCalledWith('session-1', 'hello');
  });

  it('respondPermission delegates to SessionManager', () => {
    const result = handlers.agent.respondPermission({
      sessionId: 'session-1',
      requestId: 'req-1',
      response: 'allow' as never,
    });
    expect(result).toEqual({ accepted: true });
  });

  it('interrupt delegates to SessionManager', () => {
    const result = handlers.agent.interrupt({ sessionId: 'session-1' });
    expect(result).toEqual({ interrupted: true });
  });

  it('getHistory replays and returns empty events', () => {
    const result = handlers.agent.getHistory({ sessionId: 'session-1' });
    expect(result).toEqual({ events: [] });
    expect(sm.replaySession).toHaveBeenCalledWith('session-1');
  });

  it('listProviders delegates to registry', async () => {
    const result = await handlers.agent.listProviders({});
    expect(result).toEqual({ providers: [{ id: 'test', name: 'Test' }] });
  });

  it('checkProvider delegates to registry', async () => {
    const result = await handlers.agent.checkProvider({ providerId: 'test' });
    expect(result).toEqual({ available: true });
  });

  it('switchModel returns restarted: true when session exists', () => {
    const result = handlers.agent.switchModel({ sessionId: 'session-1', toModel: 'opus' });
    expect(result).toEqual({ restarted: true });
    expect(sm.switchModel).toHaveBeenCalledWith('session-1', 'unknown', 'opus');
  });

  it('switchModel returns restarted: false when session missing', () => {
    vi.mocked(sm.getSession).mockReturnValueOnce(null as never);
    const result = handlers.agent.switchModel({ sessionId: 'missing', toModel: 'opus' });
    expect(result).toEqual({ restarted: false });
  });

  it('linkEntity delegates to SessionManager', () => {
    const result = handlers.agent.linkEntity({
      sessionId: 'session-1',
      entityUri: 'uri-1',
      entityType: 'issue',
      entityTitle: 'Bug',
    });
    expect(result).toEqual({ linked: true });
  });

  it('unlinkEntity delegates to SessionManager', () => {
    const result = handlers.agent.unlinkEntity({
      sessionId: 'session-1',
      entityUri: 'uri-1',
    });
    expect(result).toEqual({ unlinked: true });
  });

  it('compactConversation delegates to SessionManager', () => {
    const result = handlers.agent.compactConversation({ sessionId: 'session-1' });
    expect(result).toEqual({ accepted: true });
    expect(sm.compactConversation).toHaveBeenCalledWith('session-1', undefined);
  });

  it('compactConversation passes instructions to SessionManager', () => {
    handlers.agent.compactConversation({ sessionId: 'session-1', instructions: 'Focus on the API' });
    expect(sm.compactConversation).toHaveBeenCalledWith('session-1', 'Focus on the API');
  });
});
