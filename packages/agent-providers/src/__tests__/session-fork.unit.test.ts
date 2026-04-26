/**
 * Tests for the session-fork utility.
 *
 * Covers:
 * - findSessionFile: locates JSONL files by session ID across project dirs
 * - forkSessionAtUuid: truncates a JSONL session at a target message UUID
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { findSessionFile, forkSessionAtUuid, copySessionWithNewId } from '../claude-code/session-fork';

// ─── Test Helpers ─────────────────────────────────────────────────────────

/** Create a temporary directory structure mimicking ~/.claude/projects/ */
function createTempProjectsDir(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'session-fork-test-'));
  return tmp;
}

/** Build a JSONL line from an object */
function jsonl(obj: Record<string, unknown>): string {
  return JSON.stringify(obj);
}

/**
 * Build a simple linear conversation as JSONL lines.
 * Returns lines for: user1 → assistant1 → user2 → assistant2 → ...
 */
function buildConversation(sessionId: string, turns: number): { lines: string[]; uuids: string[] } {
  const lines: string[] = [];
  const uuids: string[] = [];
  let parentUuid: string | undefined;

  for (let i = 0; i < turns; i++) {
    const role = i % 2 === 0 ? 'human' : 'assistant';
    const uuid = `uuid-${i}`;
    uuids.push(uuid);

    lines.push(jsonl({
      uuid,
      parentUuid: parentUuid ?? undefined,
      isSidechain: false,
      sessionId: sessionId,
      type: role,
      message: { role, content: `Turn ${i}` },
    }));

    parentUuid = uuid;
  }

  return { lines, uuids };
}

// ─── findSessionFile ──────────────────────────────────────────────────────

describe('findSessionFile', () => {
  let projectsDir: string;

  beforeEach(() => {
    projectsDir = createTempProjectsDir();
  });

  afterEach(() => {
    fs.rmSync(projectsDir, { recursive: true, force: true });
  });

  it('finds a session file in the correct project directory', () => {
    const projDir = path.join(projectsDir, '-Users-will-project');
    fs.mkdirSync(projDir, { recursive: true });
    fs.writeFileSync(path.join(projDir, 'abc-123.jsonl'), '{}');

    expect(findSessionFile('abc-123', projectsDir)).toBe(path.join(projDir, 'abc-123.jsonl'));
  });

  it('finds a session file across multiple project directories', () => {
    fs.mkdirSync(path.join(projectsDir, '-Users-will-projectA'), { recursive: true });
    fs.mkdirSync(path.join(projectsDir, '-Users-will-projectB'), { recursive: true });
    const targetDir = path.join(projectsDir, '-Users-will-projectC');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'session-xyz.jsonl'), '{}');

    expect(findSessionFile('session-xyz', projectsDir)).toBe(path.join(targetDir, 'session-xyz.jsonl'));
  });

  it('returns null when session file does not exist', () => {
    fs.mkdirSync(path.join(projectsDir, '-Users-will'), { recursive: true });
    expect(findSessionFile('nonexistent', projectsDir)).toBeNull();
  });

  it('returns null when projects directory does not exist', () => {
    expect(findSessionFile('anything', '/nonexistent/path')).toBeNull();
  });

  it('returns null when projects directory is empty', () => {
    expect(findSessionFile('anything', projectsDir)).toBeNull();
  });
});

// ─── forkSessionAtUuid ────────────────────────────────────────────────────

describe('forkSessionAtUuid', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempProjectsDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('forks a linear conversation at a specific message', async () => {
    const { lines, uuids } = buildConversation('session-1', 6);
    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    // Fork at turn 3 (assistant1) — should include turns 0,1,2,3
    const result = await forkSessionAtUuid(sourcePath, uuids[3]!, 'forked-session');

    expect(result.lineCount).toBe(4);
    expect(result.targetPath).toBe(path.join(tmpDir, 'forked-session.jsonl'));

    // Read and verify the forked file
    const forkedContent = fs.readFileSync(result.targetPath, 'utf-8');
    const forkedLines = forkedContent.trim().split('\n');
    expect(forkedLines).toHaveLength(4);

    // All lines should have the new sessionId
    for (const line of forkedLines) {
      const parsed = JSON.parse(line);
      expect(parsed.sessionId).toBe('forked-session');
    }

    // Verify the UUIDs are preserved and in order
    const forkedUuids = forkedLines.map((l) => JSON.parse(l).uuid);
    expect(forkedUuids).toEqual(['uuid-0', 'uuid-1', 'uuid-2', 'uuid-3']);
  });

  it('forks at the first message (single entry)', async () => {
    const { lines, uuids } = buildConversation('session-1', 4);
    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    const result = await forkSessionAtUuid(sourcePath, uuids[0]!, 'forked');

    expect(result.lineCount).toBe(1);
    const parsed = JSON.parse(fs.readFileSync(result.targetPath, 'utf-8').trim());
    expect(parsed.uuid).toBe('uuid-0');
    expect(parsed.sessionId).toBe('forked');
  });

  it('forks at the last message (full conversation)', async () => {
    const { lines, uuids } = buildConversation('session-1', 4);
    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    const result = await forkSessionAtUuid(sourcePath, uuids[3]!, 'forked');
    expect(result.lineCount).toBe(4);
  });

  it('excludes sidechain entries that are not ancestors', async () => {
    // Build a conversation with a sidechain branch:
    // uuid-0 (user) → uuid-1 (assistant) → uuid-2 (sidechain user) → uuid-3 (sidechain assistant)
    //                                     → uuid-4 (main user) → uuid-5 (main assistant)
    const sessionId = 'session-branch';
    const lines = [
      jsonl({ uuid: 'uuid-0', sessionId: sessionId, type: 'human', message: { content: 'hi' } }),
      jsonl({ uuid: 'uuid-1', parentUuid: 'uuid-0', sessionId: sessionId, type: 'assistant', message: { content: 'hello' } }),
      jsonl({ uuid: 'uuid-2', parentUuid: 'uuid-1', isSidechain: true, sessionId: sessionId, type: 'human', message: { content: 'sidechain' } }),
      jsonl({ uuid: 'uuid-3', parentUuid: 'uuid-2', isSidechain: true, sessionId: sessionId, type: 'assistant', message: { content: 'sidechain reply' } }),
      jsonl({ uuid: 'uuid-4', parentUuid: 'uuid-1', sessionId: sessionId, type: 'human', message: { content: 'main continue' } }),
      jsonl({ uuid: 'uuid-5', parentUuid: 'uuid-4', sessionId: sessionId, type: 'assistant', message: { content: 'main reply' } }),
    ];

    const sourcePath = path.join(tmpDir, `${sessionId}.jsonl`);
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    // Fork at uuid-5 (main branch) — should skip uuid-2 and uuid-3 (sidechain)
    const result = await forkSessionAtUuid(sourcePath, 'uuid-5', 'forked-main');

    expect(result.lineCount).toBe(4);
    const forkedLines = fs.readFileSync(result.targetPath, 'utf-8').trim().split('\n');
    const forkedUuids = forkedLines.map((l) => JSON.parse(l).uuid);
    expect(forkedUuids).toEqual(['uuid-0', 'uuid-1', 'uuid-4', 'uuid-5']);

    // No entry should be marked as a sidechain
    for (const line of forkedLines) {
      const parsed = JSON.parse(line);
      expect(parsed.isSidechain).not.toBe(true);
    }
  });

  it('includes metadata lines without uuids', async () => {
    const lines = [
      jsonl({ type: 'queue-operation', sessionId: 'session-1', action: 'start' }),
      jsonl({ uuid: 'uuid-0', sessionId: 'session-1', type: 'human', message: { content: 'hi' } }),
      jsonl({ uuid: 'uuid-1', parentUuid: 'uuid-0', sessionId: 'session-1', type: 'assistant', message: { content: 'hello' } }),
    ];

    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    const result = await forkSessionAtUuid(sourcePath, 'uuid-1', 'forked');
    expect(result.lineCount).toBe(3); // metadata + 2 messages
  });

  it('throws when source file does not exist', async () => {
    await expect(
      forkSessionAtUuid('/nonexistent/path.jsonl', 'uuid-0', 'forked'),
    ).rejects.toThrow('Session file not found');
  });

  it('throws when target UUID is not in the session', async () => {
    const { lines } = buildConversation('session-1', 2);
    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    await expect(
      forkSessionAtUuid(sourcePath, 'nonexistent-uuid', 'forked'),
    ).rejects.toThrow('Target UUID not found');
  });

  it('writes atomically (tmp file then rename)', async () => {
    const { lines, uuids } = buildConversation('session-1', 2);
    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    const result = await forkSessionAtUuid(sourcePath, uuids[1]!, 'forked');

    // The final file exists
    expect(fs.existsSync(result.targetPath)).toBe(true);
    // The tmp file was cleaned up
    expect(fs.existsSync(`${result.targetPath}.tmp`)).toBe(false);
  });

  it('falls back to message.id when uuid does not match (streaming uuid mismatch)', async () => {
    // During live streaming, the providerUuid captured from stream_event differs
    // from the JSONL entry's uuid. But both share the same Anthropic message.id.
    const lines = [
      jsonl({ uuid: 'uuid-0', sessionId: 'session-1', type: 'human', message: { role: 'user', content: 'hi' } }),
      jsonl({
        uuid: 'jsonl-uuid-1', // The REAL uuid in the JSONL file
        parentUuid: 'uuid-0',
        sessionId: 'session-1',
        type: 'assistant',
        message: { id: 'msg_01abc', role: 'assistant', content: 'hello' },
      }),
      jsonl({ uuid: 'uuid-2', parentUuid: 'jsonl-uuid-1', sessionId: 'session-1', type: 'human', message: { role: 'user', content: 'more' } }),
      jsonl({
        uuid: 'jsonl-uuid-3',
        parentUuid: 'uuid-2',
        sessionId: 'session-1',
        type: 'assistant',
        message: { id: 'msg_01def', role: 'assistant', content: 'more reply' },
      }),
    ];

    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    // The frontend captured 'stream-uuid-1' during streaming (wrong uuid),
    // but also has the Anthropic message.id 'msg_01abc'
    const result = await forkSessionAtUuid(
      sourcePath,
      'stream-uuid-1', // Does NOT match any JSONL uuid
      'forked',
      'msg_01abc', // Matches the message.id in the JSONL
    );

    expect(result.lineCount).toBe(2); // uuid-0 + jsonl-uuid-1
    const forkedLines = fs.readFileSync(result.targetPath, 'utf-8').trim().split('\n');
    const forkedUuids = forkedLines.map((l) => JSON.parse(l).uuid);
    expect(forkedUuids).toEqual(['uuid-0', 'jsonl-uuid-1']);
  });

  it('prefers uuid match over messageId fallback', async () => {
    const lines = [
      jsonl({ uuid: 'uuid-0', sessionId: 'session-1', type: 'human', message: { role: 'user', content: 'hi' } }),
      jsonl({
        uuid: 'uuid-1',
        parentUuid: 'uuid-0',
        sessionId: 'session-1',
        type: 'assistant',
        message: { id: 'msg_01abc', role: 'assistant', content: 'hello' },
      }),
    ];

    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    // uuid matches directly — messageId should not interfere
    const result = await forkSessionAtUuid(sourcePath, 'uuid-1', 'forked', 'msg_01abc');
    expect(result.lineCount).toBe(2);
  });

  it('skips malformed JSONL lines', async () => {
    const lines = [
      'not valid json',
      jsonl({ uuid: 'uuid-0', sessionId: 'session-1', type: 'human', message: { content: 'hi' } }),
      '{ broken',
      jsonl({ uuid: 'uuid-1', parentUuid: 'uuid-0', sessionId: 'session-1', type: 'assistant', message: { content: 'hello' } }),
    ];

    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    const result = await forkSessionAtUuid(sourcePath, 'uuid-1', 'forked');
    expect(result.lineCount).toBe(2); // Only the valid lines
  });

  it('replaces sessionId (camelCase) in forked entries', async () => {
    const lines = [
      jsonl({ uuid: 'uuid-0', sessionId: 'original-session', type: 'user', message: { role: 'user', content: 'hi' } }),
      jsonl({ uuid: 'uuid-1', parentUuid: 'uuid-0', sessionId: 'original-session', type: 'assistant', message: { id: 'msg_01', role: 'assistant', content: 'hello' } }),
    ];

    const sourcePath = path.join(tmpDir, 'original-session.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    const result = await forkSessionAtUuid(sourcePath, 'uuid-1', 'new-session-id');

    const forkedLines = fs.readFileSync(result.targetPath, 'utf-8').trim().split('\n');
    for (const line of forkedLines) {
      const parsed = JSON.parse(line);
      expect(parsed.sessionId).toBe('new-session-id');
      // Ensure old snake_case field is NOT present
      expect(parsed.session_id).toBeUndefined();
    }
  });

  it('strips last-prompt entries from the fork', async () => {
    const lines = [
      jsonl({ uuid: 'uuid-0', sessionId: 'session-1', type: 'user', message: { role: 'user', content: 'hi' } }),
      jsonl({ uuid: 'uuid-1', parentUuid: 'uuid-0', sessionId: 'session-1', type: 'assistant', message: { role: 'assistant', content: 'hello' } }),
      jsonl({ type: 'last-prompt', sessionId: 'session-1', lastPrompt: 'stale prompt' }),
    ];

    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    const result = await forkSessionAtUuid(sourcePath, 'uuid-1', 'forked');
    expect(result.lineCount).toBe(2); // last-prompt stripped

    const forkedLines = fs.readFileSync(result.targetPath, 'utf-8').trim().split('\n');
    for (const line of forkedLines) {
      const parsed = JSON.parse(line);
      expect(parsed.type).not.toBe('last-prompt');
    }
  });

  it('handles parentUuid cycles without infinite looping', async () => {
    // Corrupt JSONL with a cycle: uuid-0 → uuid-1 → uuid-0
    const lines = [
      jsonl({ uuid: 'uuid-0', parentUuid: 'uuid-1', sessionId: 'session-1', type: 'user', message: { content: 'hi' } }),
      jsonl({ uuid: 'uuid-1', parentUuid: 'uuid-0', sessionId: 'session-1', type: 'assistant', message: { content: 'hello' } }),
    ];

    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    // Should complete without hanging — cycle is broken by the visited set
    const result = await forkSessionAtUuid(sourcePath, 'uuid-1', 'forked');
    expect(result.lineCount).toBe(2);
  });

  it('forks at a user message (no turn_end expected)', async () => {
    const lines = [
      jsonl({ uuid: 'uuid-0', sessionId: 'session-1', type: 'user', message: { role: 'user', content: 'first' } }),
      jsonl({ uuid: 'uuid-1', parentUuid: 'uuid-0', sessionId: 'session-1', type: 'assistant', message: { role: 'assistant', content: 'reply' } }),
      jsonl({ uuid: 'uuid-2', parentUuid: 'uuid-1', sessionId: 'session-1', type: 'user', message: { role: 'user', content: 'second' } }),
      jsonl({ uuid: 'uuid-3', parentUuid: 'uuid-2', sessionId: 'session-1', type: 'assistant', message: { role: 'assistant', content: 'reply 2' } }),
    ];

    const sourcePath = path.join(tmpDir, 'session-1.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    // Fork at the second user message — should include it and everything before
    const result = await forkSessionAtUuid(sourcePath, 'uuid-2', 'forked');
    expect(result.lineCount).toBe(3); // uuid-0, uuid-1, uuid-2

    const forkedLines = fs.readFileSync(result.targetPath, 'utf-8').trim().split('\n');
    const forkedUuids = forkedLines.map((l) => JSON.parse(l).uuid);
    expect(forkedUuids).toEqual(['uuid-0', 'uuid-1', 'uuid-2']);
  });
});

// ─── copySessionWithNewId ──────────────────────────────────────────────────

describe('copySessionWithNewId', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempProjectsDir();
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('copies all entries with the new sessionId', async () => {
    const lines = [
      jsonl({ uuid: 'u1', sessionId: 'old-session', type: 'user', message: { role: 'user', content: 'hello' } }),
      jsonl({ uuid: 'u2', parentUuid: 'u1', sessionId: 'old-session', type: 'assistant', message: { role: 'assistant', content: 'hi' } }),
      jsonl({ uuid: 'u3', parentUuid: 'u2', sessionId: 'old-session', type: 'user', message: { role: 'user', content: 'bye' } }),
    ];
    const sourcePath = path.join(tmpDir, 'old-session.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    const result = await copySessionWithNewId(sourcePath, 'new-session');
    expect(result.lineCount).toBe(3);

    const copied = fs.readFileSync(result.targetPath, 'utf-8').trim().split('\n').map((l) => JSON.parse(l));
    expect(copied.every((e: Record<string, unknown>) => e.sessionId === 'new-session')).toBe(true);
    expect(copied.map((e: Record<string, unknown>) => e.uuid)).toEqual(['u1', 'u2', 'u3']);
  });

  it('strips last-prompt entries', async () => {
    const lines = [
      jsonl({ uuid: 'u1', sessionId: 'old', type: 'user', message: { role: 'user', content: 'hello' } }),
      jsonl({ uuid: 'u2', parentUuid: 'u1', sessionId: 'old', type: 'last-prompt' }),
      jsonl({ uuid: 'u3', parentUuid: 'u1', sessionId: 'old', type: 'assistant', message: { role: 'assistant', content: 'hi' } }),
    ];
    const sourcePath = path.join(tmpDir, 'old.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    const result = await copySessionWithNewId(sourcePath, 'new');
    expect(result.lineCount).toBe(2);

    const copied = fs.readFileSync(result.targetPath, 'utf-8').trim().split('\n').map((l) => JSON.parse(l));
    expect(copied.map((e: Record<string, unknown>) => e.type)).toEqual(['user', 'assistant']);
  });

  it('clears isSidechain flags', async () => {
    const lines = [
      jsonl({ uuid: 'u1', sessionId: 'old', type: 'user', isSidechain: false }),
      jsonl({ uuid: 'u2', parentUuid: 'u1', sessionId: 'old', type: 'assistant', isSidechain: true }),
    ];
    const sourcePath = path.join(tmpDir, 'old.jsonl');
    fs.writeFileSync(sourcePath, lines.join('\n') + '\n');

    const result = await copySessionWithNewId(sourcePath, 'new');
    const copied = fs.readFileSync(result.targetPath, 'utf-8').trim().split('\n').map((l) => JSON.parse(l));
    expect(copied.every((e: Record<string, unknown>) => e.isSidechain === false)).toBe(true);
  });

  it('throws if source file does not exist', async () => {
    await expect(copySessionWithNewId('/nonexistent/file.jsonl', 'new')).rejects.toThrow('Session file not found');
  });
});
