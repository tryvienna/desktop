import { describe, it, expect, vi } from 'vitest';
import {
  tokenizeWords,
  computeWordPatches,
  applyPatches,
  TwoPassTranscriber,
} from '../two-pass-transcriber';
import type { TranscriberLike } from '../transcriber';

// ─── tokenizeWords ───────────────────────────────────────────────────────────

describe('tokenizeWords', () => {
  it('splits simple text into word tokens', () => {
    const tokens = tokenizeWords('hello world');
    expect(tokens).toEqual([
      { word: 'hello', start: 0, end: 5 },
      { word: 'world', start: 6, end: 11 },
    ]);
  });

  it('handles punctuation attached to words', () => {
    const tokens = tokenizeWords('Hello, world!');
    expect(tokens).toEqual([
      { word: 'Hello,', start: 0, end: 6 },
      { word: 'world!', start: 7, end: 13 },
    ]);
  });

  it('handles multiple spaces', () => {
    const tokens = tokenizeWords('hello   world');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]!.word).toBe('hello');
    expect(tokens[1]!.word).toBe('world');
  });

  it('returns empty for empty string', () => {
    expect(tokenizeWords('')).toEqual([]);
  });

  it('returns empty for whitespace-only string', () => {
    expect(tokenizeWords('   ')).toEqual([]);
  });
});

// ─── computeWordPatches ──────────────────────────────────────────────────────

describe('computeWordPatches', () => {
  it('returns empty patches for identical texts', () => {
    expect(computeWordPatches('hello world', 'hello world')).toEqual([]);
  });

  it('returns empty patches for both empty', () => {
    expect(computeWordPatches('', '')).toEqual([]);
  });

  it('detects a single word substitution', () => {
    const patches = computeWordPatches('the cat sat', 'the dog sat');
    expect(patches).toHaveLength(1);
    expect(patches[0]!.insert).toBe('dog');
    // The patch should target "cat"
    expect(patches[0]!.offset).toBe(4);
    expect(patches[0]!.removeLength).toBe(3);
  });

  it('detects word insertion', () => {
    const patches = computeWordPatches('hello world', 'hello beautiful world');
    expect(patches).toHaveLength(1);
    expect(patches[0]!.insert).toContain('beautiful');
    expect(patches[0]!.removeLength).toBe(0);
  });

  it('detects word deletion', () => {
    const patches = computeWordPatches('hello beautiful world', 'hello world');
    expect(patches).toHaveLength(1);
    expect(patches[0]!.insert).toBe('');
    // Should remove "beautiful" and its adjacent space
  });

  it('handles complete replacement (no common words)', () => {
    const patches = computeWordPatches('foo bar', 'baz qux');
    expect(patches.length).toBeGreaterThan(0);
    const result = applyPatches('foo bar', patches);
    expect(result).toBe('baz qux');
  });

  it('handles hot text empty', () => {
    const patches = computeWordPatches('', 'hello world');
    expect(patches).toHaveLength(1);
    expect(patches[0]!.insert).toBe('hello world');
  });

  it('handles cold text empty', () => {
    const patches = computeWordPatches('hello world', '');
    expect(patches).toHaveLength(1);
    expect(patches[0]!.insert).toBe('');
  });
});

// ─── applyPatches ────────────────────────────────────────────────────────────

describe('applyPatches', () => {
  it('returns original text when no patches', () => {
    expect(applyPatches('hello world', [])).toBe('hello world');
  });

  it('applies a substitution patch correctly', () => {
    const patches = computeWordPatches('the cat sat', 'the dog sat');
    const result = applyPatches('the cat sat', patches);
    expect(result).toBe('the dog sat');
  });

  it('applies insertion patches correctly', () => {
    const patches = computeWordPatches('hello world', 'hello beautiful world');
    const result = applyPatches('hello world', patches);
    expect(result).toBe('hello beautiful world');
  });

  it('applies deletion patches correctly', () => {
    const patches = computeWordPatches('hello beautiful world', 'hello world');
    const result = applyPatches('hello beautiful world', patches);
    expect(result).toBe('hello world');
  });

  it('applies multiple patches correctly', () => {
    const hot = 'I think the cat is very big';
    const cold = 'I know the dog is quite small';
    const patches = computeWordPatches(hot, cold);
    const result = applyPatches(hot, patches);
    expect(result).toBe(cold);
  });
});

// ─── TwoPassTranscriber ──────────────────────────────────────────────────────

function createMockTranscriber(text: string): TranscriberLike {
  return {
    transcribe: vi.fn().mockResolvedValue({ text, duration: 1.0 }),
  };
}

describe('TwoPassTranscriber', () => {
  it('runs hot then cold and returns both texts', async () => {
    const hot = createMockTranscriber('hello wrold');
    const cold = createMockTranscriber('hello world');
    const tp = new TwoPassTranscriber(hot, cold);

    const audio = new Float32Array(16000);
    const result = await tp.transcribe(audio, 16000);

    expect(result.hotText).toBe('hello wrold');
    expect(result.coldText).toBe('hello world');
    expect(hot.transcribe).toHaveBeenCalledOnce();
    expect(cold.transcribe).toHaveBeenCalledOnce();
  });

  it('returns patches when texts differ', async () => {
    const hot = createMockTranscriber('the cat sat');
    const cold = createMockTranscriber('the dog sat');
    const tp = new TwoPassTranscriber(hot, cold);

    const result = await tp.transcribe(new Float32Array(16000), 16000);
    expect(result.patches.length).toBeGreaterThan(0);
    expect(applyPatches(result.hotText, result.patches)).toBe(result.coldText);
  });

  it('returns empty patches when texts are identical', async () => {
    const hot = createMockTranscriber('hello world');
    const cold = createMockTranscriber('hello world');
    const tp = new TwoPassTranscriber(hot, cold);

    const result = await tp.transcribe(new Float32Array(16000), 16000);
    expect(result.patches).toEqual([]);
  });

  it('emits hotComplete and coldComplete events', async () => {
    const hot = createMockTranscriber('draft');
    const cold = createMockTranscriber('final');
    const tp = new TwoPassTranscriber(hot, cold);

    const hotComplete = vi.fn();
    const coldComplete = vi.fn();
    tp.on('hotComplete', hotComplete);
    tp.on('coldComplete', coldComplete);

    await tp.transcribe(new Float32Array(16000), 16000);

    expect(hotComplete).toHaveBeenCalledWith({ text: 'draft' });
    expect(coldComplete).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'final' }),
    );
  });

  it('emits correction event when patches exist', async () => {
    const hot = createMockTranscriber('cat');
    const cold = createMockTranscriber('dog');
    const tp = new TwoPassTranscriber(hot, cold);

    const correction = vi.fn();
    tp.on('correction', correction);

    await tp.transcribe(new Float32Array(16000), 16000);
    expect(correction).toHaveBeenCalledTimes(1);
  });

  it('does not emit correction when texts match', async () => {
    const hot = createMockTranscriber('same');
    const cold = createMockTranscriber('same');
    const tp = new TwoPassTranscriber(hot, cold);

    const correction = vi.fn();
    tp.on('correction', correction);

    await tp.transcribe(new Float32Array(16000), 16000);
    expect(correction).not.toHaveBeenCalled();
  });

  it('falls back to hot text on cold error', async () => {
    const hot = createMockTranscriber('hot text');
    const cold: TranscriberLike = {
      transcribe: vi.fn().mockRejectedValue(new Error('cold failed')),
    };
    const tp = new TwoPassTranscriber(hot, cold);

    const errorHandler = vi.fn();
    tp.on('error', errorHandler);

    const result = await tp.transcribe(new Float32Array(16000), 16000);
    expect(result.coldText).toBe('hot text');
    expect(result.patches).toEqual([]);
    expect(errorHandler).toHaveBeenCalled();
  });

  it('throws on hot error', async () => {
    const hot: TranscriberLike = {
      transcribe: vi.fn().mockRejectedValue(new Error('hot failed')),
    };
    const cold = createMockTranscriber('cold');
    const tp = new TwoPassTranscriber(hot, cold);

    await expect(tp.transcribe(new Float32Array(16000), 16000)).rejects.toThrow('hot failed');
  });

  it('cancelCold skips cold result', async () => {
    let resolveCold!: (value: { text: string; duration: number }) => void;
    const hot = createMockTranscriber('hot text');
    const cold: TranscriberLike = {
      transcribe: vi.fn().mockImplementation(
        () => new Promise((resolve) => { resolveCold = resolve; }),
      ),
    };
    const tp = new TwoPassTranscriber(hot, cold);

    const promise = tp.transcribe(new Float32Array(16000), 16000);

    // Wait for hot to complete, then cancel cold
    await new Promise((r) => setTimeout(r, 10));
    tp.cancelCold();

    // Resolve the cold promise after cancellation
    resolveCold({ text: 'cold text', duration: 1.0 });
    const result = await promise;

    // Cold text is returned but patches should be empty (generation mismatch)
    expect(result.hotText).toBe('hot text');
    expect(result.patches).toEqual([]);
  });
});
