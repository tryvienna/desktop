/**
 * Shell Execution Unit Tests
 *
 * Tests that the chat store correctly handles shell execution content blocks
 * within user messages (addUserMessage with shellExecution parameter).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createChatStore, type ChatStore } from '../store/chat-store';

type Store = ReturnType<typeof createChatStore>;

let store: Store;

function state(): ChatStore {
  return store.getState();
}

beforeEach(() => {
  store = createChatStore();
});

const shellResult = {
  command: 'git status',
  cwd: '/home/user/project',
  stdout: 'On branch main\nnothing to commit',
  stderr: '',
  exitCode: 0,
  durationMs: 42,
};

describe('addUserMessage with shell execution', () => {
  it('adds shell_execution content block after text', () => {
    state().addUserMessage('! git status', undefined, undefined, undefined, shellResult);

    const messages = state().getMessages();
    expect(messages).toHaveLength(1);

    const msg = messages[0];
    expect(msg.role).toBe('user');
    expect(msg.content).toHaveLength(2);
    expect(msg.content[0].type).toBe('text');
    expect(msg.content[1].type).toBe('shell_execution');
  });

  it('shell_execution block contains all result data', () => {
    state().addUserMessage('! git status', undefined, undefined, undefined, shellResult);

    const msg = state().getMessages()[0];
    const block = msg.content[1] as typeof shellResult & { type: string };
    expect(block.type).toBe('shell_execution');
    expect(block.command).toBe('git status');
    expect(block.cwd).toBe('/home/user/project');
    expect(block.stdout).toBe('On branch main\nnothing to commit');
    expect(block.stderr).toBe('');
    expect(block.exitCode).toBe(0);
    expect(block.durationMs).toBe(42);
  });

  it('handles null exitCode for timed-out commands', () => {
    const timedOut = { ...shellResult, exitCode: null, stderr: 'Command timed out after 30000ms' };
    state().addUserMessage('! sleep 60', undefined, undefined, undefined, timedOut);

    const msg = state().getMessages()[0];
    const block = msg.content[1] as typeof timedOut & { type: string };
    expect(block.exitCode).toBeNull();
    expect(block.stderr).toContain('timed out');
  });

  it('does not add shell_execution block when not provided', () => {
    state().addUserMessage('hello world');

    const msg = state().getMessages()[0];
    expect(msg.content).toHaveLength(1);
    expect(msg.content[0].type).toBe('text');
  });

  it('coexists with skill activations', () => {
    const skills = [{ id: 'commit', name: 'commit' }];
    state().addUserMessage('! git log', undefined, undefined, skills, shellResult);

    const msg = state().getMessages()[0];
    expect(msg.content).toHaveLength(3);
    expect(msg.content[0].type).toBe('skill_activation');
    expect(msg.content[1].type).toBe('text');
    expect(msg.content[2].type).toBe('shell_execution');
  });

  it('preserves matchText for deduplication', () => {
    const fullText = '<shell-execution>...</shell-execution>';
    state().addUserMessage('! pwd', fullText, undefined, undefined, shellResult);

    const msg = state().getMessages()[0];
    expect(msg._matchText).toBe(fullText);
  });
});
