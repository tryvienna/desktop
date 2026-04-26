/**
 * Skill Activation Unit Tests
 *
 * Tests that the chat store correctly handles skill activation content blocks
 * within user messages (addUserMessage with skillActivations parameter).
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

describe('addUserMessage with skill activations', () => {
  it('adds skill_activation content block before text', () => {
    state().addUserMessage('hello', undefined, undefined, [
      { id: 'commit', name: 'commit', body: 'Commit instructions' },
    ]);

    const messages = state().getMessages();
    expect(messages).toHaveLength(1);

    const msg = messages[0];
    expect(msg.role).toBe('user');
    expect(msg.content).toHaveLength(2);
    expect(msg.content[0].type).toBe('skill_activation');
    expect(msg.content[1].type).toBe('text');
  });

  it('skill_activation block contains skill data', () => {
    const skills = [
      { id: 'commit', name: 'commit', body: 'Commit body' },
      { id: 'review-pr', name: 'review-pr', body: 'Review body' },
    ];

    state().addUserMessage('my message', undefined, undefined, skills);

    const msg = state().getMessages()[0];
    const block = msg.content[0];
    expect(block.type).toBe('skill_activation');
    expect((block as { skills: typeof skills }).skills).toEqual(skills);
  });

  it('text block uses displayText, not matchText', () => {
    state().addUserMessage('clean text', '<skill>injected</skill>\n\nclean text', undefined, [
      { id: 'test', name: 'test' },
    ]);

    const msg = state().getMessages()[0];
    const textBlock = msg.content.find((b) => b.type === 'text');
    expect(textBlock).toBeDefined();
    expect((textBlock as { text: string }).text).toBe('clean text');
  });

  it('sets _matchText when matchText differs from displayText', () => {
    state().addUserMessage('display', 'match', undefined, [
      { id: 'skill', name: 'skill' },
    ]);

    const msg = state().getMessages()[0];
    expect((msg as { _matchText?: string })._matchText).toBe('match');
  });

  it('does not add skill_activation block when no skills provided', () => {
    state().addUserMessage('plain message');

    const msg = state().getMessages()[0];
    expect(msg.content).toHaveLength(1);
    expect(msg.content[0].type).toBe('text');
  });

  it('does not add skill_activation block for empty array', () => {
    state().addUserMessage('plain message', undefined, undefined, []);

    const msg = state().getMessages()[0];
    expect(msg.content).toHaveLength(1);
    expect(msg.content[0].type).toBe('text');
  });

  it('combines skill activations with image attachments', () => {
    state().addUserMessage(
      'with images',
      undefined,
      [{ name: 'photo.png', mimeType: 'image/png', size: 1024, previewUrl: 'data:...' }],
      [{ id: 'commit', name: 'commit' }],
    );

    const msg = state().getMessages()[0];
    const types = msg.content.map((b) => b.type);
    expect(types).toContain('skill_activation');
    expect(types).toContain('text');
    expect(types).toContain('image_attachment');
  });

  it('skill_activation comes before text and image_attachment', () => {
    state().addUserMessage(
      'msg',
      undefined,
      [{ name: 'img.png', mimeType: 'image/png', size: 100, previewUrl: 'data:...' }],
      [{ id: 's1', name: 's1' }],
    );

    const msg = state().getMessages()[0];
    expect(msg.content[0].type).toBe('skill_activation');
    expect(msg.content[1].type).toBe('text');
    expect(msg.content[2].type).toBe('image_attachment');
  });

  it('sets isPreparingResponse after adding user message', () => {
    state().addUserMessage('waiting for response', undefined, undefined, [
      { id: 'skill', name: 'skill' },
    ]);

    expect(state().isAgentBusy).toBe(true);
  });
});

describe('skill_activation via processEvent', () => {
  it('creates a system message for skill_activation event', () => {
    state().processEvent({
      type: 'skill_activation',
      skills: [{ id: 'commit', name: 'commit' }],
      timestamp: Date.now(),
    });

    const messages = state().getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('system');

    // The content block should be a typed skill_activation block
    const block = messages[0].content[0];
    expect(block.type).toBe('skill_activation');
  });
});
