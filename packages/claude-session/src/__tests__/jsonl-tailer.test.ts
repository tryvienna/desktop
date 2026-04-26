import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { JsonlTailer } from '../jsonl-tailer';

function makeTmpDir() {
  return join(tmpdir(), `jsonl-tailer-test-${randomUUID()}`);
}

describe('JsonlTailer', () => {
  let dir: string;
  let tailer: JsonlTailer;

  beforeEach(async () => {
    dir = makeTmpDir();
    await mkdir(dir, { recursive: true });
    tailer = new JsonlTailer();
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads all lines from a new file', async () => {
    const file = join(dir, 'test.jsonl');
    await writeFile(file, '{"type":"user","data":"a"}\n{"type":"assistant","data":"b"}\n');

    const records = await tailer.readNewLines(file);
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({ type: 'user', data: 'a' });
    expect(records[1]).toEqual({ type: 'assistant', data: 'b' });
  });

  it('only reads new lines on subsequent calls', async () => {
    const file = join(dir, 'test.jsonl');
    await writeFile(file, '{"type":"user","v":1}\n');

    const first = await tailer.readNewLines(file);
    expect(first).toHaveLength(1);

    // Append more data
    const { appendFile } = await import('node:fs/promises');
    await appendFile(file, '{"type":"user","v":2}\n');

    const second = await tailer.readNewLines(file);
    expect(second).toHaveLength(1);
    expect(second[0]).toEqual({ type: 'user', v: 2 });
  });

  it('returns empty for non-existent file', async () => {
    const records = await tailer.readNewLines(join(dir, 'missing.jsonl'));
    expect(records).toEqual([]);
  });

  it('returns empty when no new data', async () => {
    const file = join(dir, 'test.jsonl');
    await writeFile(file, '{"type":"user"}\n');

    await tailer.readNewLines(file);
    const second = await tailer.readNewLines(file);
    expect(second).toEqual([]);
  });

  it('handles partial lines across reads', async () => {
    const file = join(dir, 'test.jsonl');
    // Write a complete line + start of an incomplete line
    await writeFile(file, '{"type":"complete"}\n{"type":"part');

    const first = await tailer.readNewLines(file);
    expect(first).toHaveLength(1);
    expect(first[0]).toEqual({ type: 'complete' });

    // Now append the rest
    const { appendFile } = await import('node:fs/promises');
    await appendFile(file, 'ial"}\n');

    const second = await tailer.readNewLines(file);
    expect(second).toHaveLength(1);
    expect(second[0]).toEqual({ type: 'partial' });
  });

  it('skips malformed JSON lines', async () => {
    const file = join(dir, 'test.jsonl');
    await writeFile(file, '{"type":"good"}\nnot-json\n{"type":"also-good"}\n');

    const records = await tailer.readNewLines(file);
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({ type: 'good' });
    expect(records[1]).toEqual({ type: 'also-good' });
  });

  it('skips empty lines', async () => {
    const file = join(dir, 'test.jsonl');
    await writeFile(file, '\n{"type":"a"}\n\n{"type":"b"}\n\n');

    const records = await tailer.readNewLines(file);
    expect(records).toHaveLength(2);
  });

  it('handles file truncation (reset)', async () => {
    const file = join(dir, 'test.jsonl');
    await writeFile(file, '{"type":"old1"}\n{"type":"old2"}\n');

    await tailer.readNewLines(file);

    // Truncate and write shorter content
    await writeFile(file, '{"type":"new"}\n');

    const records = await tailer.readNewLines(file);
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ type: 'new' });
  });

  it('respects setInitialOffset (skips existing content)', async () => {
    const file = join(dir, 'test.jsonl');
    const content = '{"type":"old"}\n{"type":"new"}\n';
    await writeFile(file, content);

    // Set offset to skip the first line
    const firstLineBytes = Buffer.byteLength('{"type":"old"}\n');
    tailer.setInitialOffset(file, firstLineBytes);

    const records = await tailer.readNewLines(file);
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ type: 'new' });
  });

  it('tracks multiple files independently', async () => {
    const file1 = join(dir, 'a.jsonl');
    const file2 = join(dir, 'b.jsonl');
    await writeFile(file1, '{"type":"a"}\n');
    await writeFile(file2, '{"type":"b"}\n');

    const r1 = await tailer.readNewLines(file1);
    const r2 = await tailer.readNewLines(file2);
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
    expect(r1[0]).toEqual({ type: 'a' });
    expect(r2[0]).toEqual({ type: 'b' });
  });

  it('remove stops tracking a file', async () => {
    const file = join(dir, 'test.jsonl');
    await writeFile(file, '{"type":"a"}\n');

    await tailer.readNewLines(file);
    expect(tailer.isTracking(file)).toBe(true);

    tailer.remove(file);
    expect(tailer.isTracking(file)).toBe(false);
    expect(tailer.size).toBe(0);
  });

  it('reports size correctly', async () => {
    expect(tailer.size).toBe(0);
    const file = join(dir, 'test.jsonl');
    await writeFile(file, '{"type":"a"}\n');
    await tailer.readNewLines(file);
    expect(tailer.size).toBe(1);
  });
});
