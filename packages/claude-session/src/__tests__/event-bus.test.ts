import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionEventBus } from '../event-bus';
import type { SessionStartedPayload, TurnStartedPayload } from '../types';

const makeSessionStarted = (): SessionStartedPayload => ({
  sessionId: 'sess-1',
  projectPath: '/Users/will/dev/foo',
  cwd: '/Users/will/dev/foo',
  version: '2.1.0',
  gitBranch: 'main',
  entrypoint: 'cli',
  timestamp: '2026-04-09T12:00:00Z',
});

const makeTurnStarted = (): TurnStartedPayload => ({
  sessionId: 'sess-1',
  projectPath: '/Users/will/dev/foo',
  promptId: 'prompt-1',
  cwd: '/Users/will/dev/foo',
  gitBranch: 'main',
  prompt: 'Hello',
  timestamp: '2026-04-09T12:01:00Z',
});

describe('SessionEventBus', () => {
  let bus: SessionEventBus;

  beforeEach(() => {
    bus = new SessionEventBus();
  });

  it('delivers events to exact-match subscribers', () => {
    const handler = vi.fn();
    bus.on('session.started', handler);
    const payload = makeSessionStarted();
    bus.emit('session.started', payload);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('does not deliver unrelated events', () => {
    const handler = vi.fn();
    bus.on('session.started', handler);
    bus.emit('turn.started', makeTurnStarted());

    expect(handler).not.toHaveBeenCalled();
  });

  it('onAny receives all events', () => {
    const handler = vi.fn();
    bus.onAny(handler);
    bus.emit('session.started', makeSessionStarted());
    bus.emit('turn.started', makeTurnStarted());

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith('session.started', expect.objectContaining({ sessionId: 'sess-1' }));
    expect(handler).toHaveBeenCalledWith('turn.started', expect.objectContaining({ prompt: 'Hello' }));
  });

  it('unsubscribe removes the handler', () => {
    const handler = vi.fn();
    const unsub = bus.on('session.started', handler);
    bus.emit('session.started', makeSessionStarted());
    expect(handler).toHaveBeenCalledOnce();

    unsub();
    bus.emit('session.started', makeSessionStarted());
    expect(handler).toHaveBeenCalledOnce();
  });

  it('unsubscribe works for onAny', () => {
    const handler = vi.fn();
    const unsub = bus.onAny(handler);
    bus.emit('session.started', makeSessionStarted());
    unsub();
    bus.emit('turn.started', makeTurnStarted());

    expect(handler).toHaveBeenCalledOnce();
  });

  it('supports multiple handlers for the same event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('session.started', h1);
    bus.on('session.started', h2);
    bus.emit('session.started', makeSessionStarted());

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('listenerCount returns correct count', () => {
    expect(bus.listenerCount('session.started')).toBe(0);
    const unsub = bus.on('session.started', vi.fn());
    expect(bus.listenerCount('session.started')).toBe(1);
    unsub();
    expect(bus.listenerCount('session.started')).toBe(0);
  });

  it('clear removes all handlers', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('session.started', h1);
    bus.onAny(h2);
    bus.clear();
    bus.emit('session.started', makeSessionStarted());

    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });
});
