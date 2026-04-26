import { describe, it, expect, beforeEach } from 'vitest';
import { SessionTracker } from '../session-tracker';

describe('SessionTracker', () => {
  let tracker: SessionTracker;

  beforeEach(() => {
    tracker = new SessionTracker();
  });

  it('creates a new session state on first access', () => {
    const state = tracker.getOrCreate('/path/to/file.jsonl', 'sess-1', '/project');
    expect(state.filePath).toBe('/path/to/file.jsonl');
    expect(state.sessionId).toBe('sess-1');
    expect(state.projectPath).toBe('/project');
    expect(state.cwd).toBeNull();
    expect(state.hasEmittedStarted).toBe(false);
    expect(state.pendingPlan).toBeNull();
    expect(state.pendingTools.size).toBe(0);
  });

  it('returns the same state on subsequent access', () => {
    const first = tracker.getOrCreate('/path.jsonl', 'sess-1', '/p');
    first.cwd = '/updated';
    const second = tracker.getOrCreate('/path.jsonl', 'sess-1', '/p');
    expect(second.cwd).toBe('/updated');
    expect(second).toBe(first);
  });

  it('tracks multiple sessions independently', () => {
    tracker.getOrCreate('/a.jsonl', 'sess-a', '/a');
    tracker.getOrCreate('/b.jsonl', 'sess-b', '/b');
    expect(tracker.size).toBe(2);
  });

  it('removes a session', () => {
    tracker.getOrCreate('/a.jsonl', 'sess-a', '/a');
    tracker.remove('/a.jsonl');
    expect(tracker.size).toBe(0);
  });

  it('getAll returns all tracked sessions', () => {
    tracker.getOrCreate('/a.jsonl', 'sess-a', '/a');
    tracker.getOrCreate('/b.jsonl', 'sess-b', '/b');
    const all = tracker.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((s) => s.sessionId)).toContain('sess-a');
    expect(all.map((s) => s.sessionId)).toContain('sess-b');
  });

  it('clear removes all sessions', () => {
    tracker.getOrCreate('/a.jsonl', 'sess-a', '/a');
    tracker.getOrCreate('/b.jsonl', 'sess-b', '/b');
    tracker.clear();
    expect(tracker.size).toBe(0);
  });

  it('pending tools can be set and correlated', () => {
    const state = tracker.getOrCreate('/a.jsonl', 'sess-a', '/a');
    state.pendingTools.set('tool-1', { name: 'Bash', input: { command: 'ls' } });
    expect(state.pendingTools.get('tool-1')?.name).toBe('Bash');

    state.pendingTools.delete('tool-1');
    expect(state.pendingTools.size).toBe(0);
  });

  it('pending plan can be set and cleared', () => {
    const state = tracker.getOrCreate('/a.jsonl', 'sess-a', '/a');
    state.pendingPlan = { plan: '# Plan', planFilePath: '/p/plan.md', planName: 'plan' };
    expect(state.pendingPlan?.planName).toBe('plan');

    state.pendingPlan = null;
    expect(state.pendingPlan).toBeNull();
  });
});
