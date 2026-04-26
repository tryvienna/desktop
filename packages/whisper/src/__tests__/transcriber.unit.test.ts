import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Transcriber } from '../transcriber';

// Mock @huggingface/transformers
const mockPipeline = vi.fn();
vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => mockPipeline(...args),
  env: {
    cacheDir: '',
    allowLocalModels: true,
  },
}));

describe('Transcriber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs with default config', () => {
    const t = new Transcriber();
    expect(t.isReady()).toBe(false);
  });

  it('constructs with custom config', () => {
    const t = new Transcriber({ model: 'base', language: 'fr' });
    expect(t.isReady()).toBe(false);
  });

  it('initializes lazily on first transcribe', async () => {
    const pipelineFn = vi.fn().mockResolvedValue({ text: 'hello world', chunks: [] });
    mockPipeline.mockResolvedValue(pipelineFn);

    const t = new Transcriber({ model: 'tiny' });
    expect(t.isReady()).toBe(false);

    const result = await t.transcribe(new Float32Array(16000), 16000);

    expect(t.isReady()).toBe(true);
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    expect(result.text).toBe('hello world');
  });

  it('does not re-initialize on subsequent calls', async () => {
    const pipelineFn = vi.fn().mockResolvedValue({ text: 'test', chunks: [] });
    mockPipeline.mockResolvedValue(pipelineFn);

    const t = new Transcriber({ model: 'tiny' });
    await t.transcribe(new Float32Array(16000), 16000);
    await t.transcribe(new Float32Array(16000), 16000);

    // Pipeline created only once
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    // But invoked twice
    expect(pipelineFn).toHaveBeenCalledTimes(2);
  });

  it('sets cacheDir on transformers env when provided', async () => {
    const pipelineFn = vi.fn().mockResolvedValue({ text: 'test', chunks: [] });
    mockPipeline.mockResolvedValue(pipelineFn);

    const t = new Transcriber({ model: 'tiny', cacheDir: '/tmp/whisper-cache' });
    await t.transcribe(new Float32Array(16000), 16000);

    // Pipeline should be called with cache_dir option
    expect(mockPipeline).toHaveBeenCalledWith(
      'automatic-speech-recognition',
      expect.any(String),
      expect.objectContaining({ cache_dir: '/tmp/whisper-cache' }),
    );
  });

  it('returns duration based on audio length', async () => {
    const pipelineFn = vi.fn().mockResolvedValue({ text: 'test', chunks: [] });
    mockPipeline.mockResolvedValue(pipelineFn);

    const t = new Transcriber({ model: 'tiny' });
    // 32000 samples at 16kHz = 2 seconds
    const result = await t.transcribe(new Float32Array(32000), 16000);
    expect(result.duration).toBeCloseTo(2.0);
  });

  it('enables chunking for long audio (>30s)', async () => {
    const pipelineFn = vi.fn().mockResolvedValue({ text: 'long transcription', chunks: [] });
    mockPipeline.mockResolvedValue(pipelineFn);

    const t = new Transcriber({ model: 'tiny' });
    // 60s of audio at 16kHz
    const longAudio = new Float32Array(16000 * 60);
    await t.transcribe(longAudio, 16000);

    expect(pipelineFn).toHaveBeenCalledWith(
      expect.any(Float32Array),
      expect.objectContaining({
        chunk_length_s: 30,
        stride_length_s: 5,
      }),
    );
  });

  it('passes language option to pipeline', async () => {
    const pipelineFn = vi.fn().mockResolvedValue({ text: 'bonjour', chunks: [] });
    mockPipeline.mockResolvedValue(pipelineFn);

    const t = new Transcriber({ model: 'tiny' });
    await t.transcribe(new Float32Array(16000), 16000, { language: 'fr' });

    expect(pipelineFn).toHaveBeenCalledWith(
      expect.any(Float32Array),
      expect.objectContaining({ language: 'fr' }),
    );
  });

  it('parses timestamped chunks into segments', async () => {
    const pipelineFn = vi.fn().mockResolvedValue({
      text: 'hello world',
      chunks: [
        { text: 'hello', timestamp: [0, 0.5] },
        { text: 'world', timestamp: [0.5, 1.0] },
      ],
    });
    mockPipeline.mockResolvedValue(pipelineFn);

    const t = new Transcriber({ model: 'tiny', timestamps: true });
    const result = await t.transcribe(new Float32Array(16000), 16000);

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({ start: 0, end: 0.5, text: 'hello' });
    expect(result.segments[1]).toEqual({ start: 0.5, end: 1.0, text: 'world' });
  });

  it('dispose resets ready state', async () => {
    const pipelineFn = vi.fn().mockResolvedValue({ text: 'test', chunks: [] });
    mockPipeline.mockResolvedValue(pipelineFn);

    const t = new Transcriber({ model: 'tiny' });
    await t.transcribe(new Float32Array(16000), 16000);
    expect(t.isReady()).toBe(true);

    await t.dispose();
    expect(t.isReady()).toBe(false);
  });

  it('dispose calls pipeline.dispose() if available', async () => {
    const disposeFn = vi.fn();
    const pipelineFn = Object.assign(vi.fn().mockResolvedValue({ text: 'test', chunks: [] }), { dispose: disposeFn });
    mockPipeline.mockResolvedValue(pipelineFn);

    const t = new Transcriber({ model: 'tiny' });
    await t.transcribe(new Float32Array(16000), 16000);
    await t.dispose();

    expect(disposeFn).toHaveBeenCalled();
    expect(t.isReady()).toBe(false);
  });

  it('propagates pipeline initialization errors', async () => {
    mockPipeline.mockRejectedValue(new Error('ONNX load failed'));

    const t = new Transcriber({ model: 'tiny' });
    await expect(t.transcribe(new Float32Array(16000), 16000))
      .rejects.toThrow('ONNX load failed');
    expect(t.isReady()).toBe(false);
  });

  it('retries on Protobuf parsing failure when cacheDir is set', async () => {
    const pipelineFn = vi.fn().mockResolvedValue({ text: 'recovered', chunks: [] });
    let callCount = 0;
    mockPipeline.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Protobuf parsing failed');
      return pipelineFn;
    });

    const t = new Transcriber({ model: 'tiny', cacheDir: '/tmp/test-cache' });
    const result = await t.transcribe(new Float32Array(16000), 16000);

    expect(result.text).toBe('recovered');
    expect(callCount).toBe(2);
  });

  it('handles concurrent initialize calls', async () => {
    const pipelineFn = vi.fn().mockResolvedValue({ text: 'test', chunks: [] });
    mockPipeline.mockResolvedValue(pipelineFn);

    const t = new Transcriber({ model: 'tiny' });
    // Start two transcriptions concurrently
    const [r1, r2] = await Promise.all([
      t.transcribe(new Float32Array(16000), 16000),
      t.transcribe(new Float32Array(16000), 16000),
    ]);

    // Pipeline should only be created once despite concurrent calls
    expect(mockPipeline).toHaveBeenCalledTimes(1);
    expect(r1.text).toBe('test');
    expect(r2.text).toBe('test');
  });
});
