import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';

// Mock @vienna/whisper
const mockTranscribe = vi.fn();
const mockTwoPassTranscribe = vi.fn();
const mockIsReady = vi.fn();
const mockInitialize = vi.fn().mockResolvedValue(undefined);
const mockDispose = vi.fn().mockResolvedValue(undefined);

vi.mock('@vienna/whisper', () => {
  class MockTranscriber {
    transcribe = mockTranscribe;
    isReady = mockIsReady;
    initialize = mockInitialize;
    dispose = mockDispose;
  }
  class MockTwoPassTranscriber {
    transcribe = mockTwoPassTranscribe;
  }
  return {
    Transcriber: MockTranscriber,
    TwoPassTranscriber: MockTwoPassTranscriber,
    WHISPER_SAMPLE_RATE: 16000,
    WHISPER_MODELS: {
      tiny: { name: 'tiny', hfModelId: 'onnx-community/whisper-tiny', parameterCount: '39M', approximateSize: 75_000_000 },
      base: { name: 'base', hfModelId: 'onnx-community/whisper-base', parameterCount: '74M', approximateSize: 150_000_000 },
    },
  };
});

// Mock electron
const mockGetMediaAccessStatus = vi.fn();
const mockAskForMediaAccess = vi.fn();
vi.mock('electron', () => ({
  systemPreferences: {
    getMediaAccessStatus: (...args: unknown[]) => mockGetMediaAccessStatus(...args),
    askForMediaAccess: (...args: unknown[]) => mockAskForMediaAccess(...args),
  },
}));

const mockLogger = {
  child: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const mockPaths = {
  whisperModels: '/tmp/whisper-models',
};

/** Encode a Float32Array as base64 (mirrors renderer-side encoding) */
function encodeAudioBase64(audio: Float32Array): string {
  return Buffer.from(audio.buffer, audio.byteOffset, audio.byteLength).toString('base64');
}

async function freshHandlers(emitter?: { onDownloadProgress: ReturnType<typeof vi.fn> }) {
  vi.resetModules();
  const mod = await import('../handlers');
  return mod.createWhisperHandlers(mockLogger as never, mockPaths as never, emitter);
}

describe('createWhisperHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the correct handler shape', async () => {
    const handlers = await freshHandlers();
    expect(handlers.whisper).toBeDefined();
    expect(handlers.whisper.transcribe).toBeTypeOf('function');
    expect(handlers.whisper.twoPassTranscribe).toBeTypeOf('function');
    expect(handlers.whisper.getStatus).toBeTypeOf('function');
    expect(handlers.whisper.checkMicrophonePermission).toBeTypeOf('function');
    expect(handlers.whisper.requestMicrophonePermission).toBeTypeOf('function');
    expect(handlers.whisper.checkModelsReady).toBeTypeOf('function');
    expect(handlers.whisper.downloadModel).toBeTypeOf('function');
  });

  describe('whisper.transcribe', () => {
    it('transcribes audio and returns text + duration', async () => {
      mockTranscribe.mockResolvedValue({ text: 'hello world', duration: 1.0 });
      const handlers = await freshHandlers();
      const audio = new Float32Array(16000);

      const result = await handlers.whisper.transcribe({
        audioBase64: encodeAudioBase64(audio),
        sampleRate: 16000,
      });

      expect(result.text).toBe('hello world');
      expect(result.duration).toBe(1.0);
      expect(mockTranscribe).toHaveBeenCalled();
    });

    it('decodes base64 audio correctly', async () => {
      mockTranscribe.mockResolvedValue({ text: 'test', duration: 0.5 });
      const handlers = await freshHandlers();

      // Create audio with known values
      const audio = new Float32Array([0.5, -0.5, 1.0, -1.0]);
      await handlers.whisper.transcribe({
        audioBase64: encodeAudioBase64(audio),
        sampleRate: 16000,
      });

      // Verify the Float32Array passed to transcribe has the correct values
      const callArgs = mockTranscribe.mock.calls[0]!;
      const passedAudio = callArgs[0] as Float32Array;
      expect(passedAudio[0]).toBeCloseTo(0.5);
      expect(passedAudio[1]).toBeCloseTo(-0.5);
      expect(passedAudio[2]).toBeCloseTo(1.0);
      expect(passedAudio[3]).toBeCloseTo(-1.0);
    });
  });

  describe('whisper.twoPassTranscribe', () => {
    it('returns hot text, cold text, patches, and duration', async () => {
      mockTwoPassTranscribe.mockResolvedValue({
        hotText: 'hello wrold',
        coldText: 'hello world',
        patches: [{ offset: 6, removeLength: 5, insert: 'world' }],
      });

      const handlers = await freshHandlers();
      const audio = new Float32Array(16000);
      const result = await handlers.whisper.twoPassTranscribe({
        audioBase64: encodeAudioBase64(audio),
        sampleRate: 16000,
      });

      expect(result.hotText).toBe('hello wrold');
      expect(result.coldText).toBe('hello world');
      expect(result.patches).toHaveLength(1);
      expect(result.duration).toBe(1.0); // 16000 samples / 16000 sample rate
    });

    it('calculates duration correctly for non-16kHz input', async () => {
      mockTwoPassTranscribe.mockResolvedValue({
        hotText: 'test',
        coldText: 'test',
        patches: [],
      });

      const handlers = await freshHandlers();
      // 48000 samples at 48kHz = 1 second
      const audio = new Float32Array(48000);
      const result = await handlers.whisper.twoPassTranscribe({
        audioBase64: encodeAudioBase64(audio),
        sampleRate: 48000,
      });

      expect(result.duration).toBeCloseTo(1.0);
    });
  });

  describe('whisper.getStatus', () => {
    it('returns ready state', async () => {
      mockIsReady.mockReturnValue(false);
      const handlers = await freshHandlers();
      const result = await handlers.whisper.getStatus();
      expect(result.ready).toBe(false);
      expect(result.model).toBe('tiny');
    });
  });

  describe('whisper.checkModelsReady', () => {
    it('reports missing models when cache dir is empty', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const handlers = await freshHandlers();
      const result = await handlers.whisper.checkModelsReady();

      expect(result.ready).toBe(false);
      expect(result.missing).toContain('tiny');
      expect(result.missing).toContain('base');
      expect(result.downloadSize).toBeGreaterThan(0);
    });

    it('reports ready when encoder ONNX files exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readdirSync').mockReturnValue(
        ['encoder_model.onnx', 'decoder_model.onnx'] as unknown as fs.Dirent[],
      );
      const handlers = await freshHandlers();
      const result = await handlers.whisper.checkModelsReady();

      expect(result.ready).toBe(true);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe('whisper.downloadModel', () => {
    it('initializes the correct transcriber for tiny model', async () => {
      const handlers = await freshHandlers();
      await handlers.whisper.downloadModel({ model: 'tiny' });
      expect(mockInitialize).toHaveBeenCalled();
    });

    it('initializes the correct transcriber for base model', async () => {
      const handlers = await freshHandlers();
      await handlers.whisper.downloadModel({ model: 'base' });
      expect(mockInitialize).toHaveBeenCalled();
    });

    it('forwards download progress events to emitter', async () => {
      const onDownloadProgress = vi.fn();
      const handlers = await freshHandlers({ onDownloadProgress });

      // Capture the progress callback passed to initialize
      mockInitialize.mockImplementation(async (cb?: (info: Record<string, unknown>) => void) => {
        if (cb) {
          cb({ status: 'progress', file: 'model.onnx', progress: 50, loaded: 500, total: 1000 });
        }
      });

      await handlers.whisper.downloadModel({ model: 'tiny', modelIndex: 0, totalModels: 2 });

      expect(onDownloadProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'tiny',
          file: 'model.onnx',
          progress: 50,
          modelIndex: 0,
          totalModels: 2,
        }),
      );
    });
  });

  describe('whisper.checkMicrophonePermission', () => {
    let originalPlatform: string;

    beforeEach(() => {
      originalPlatform = process.platform;
    });

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('returns TCC status on darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      mockGetMediaAccessStatus.mockReturnValue('granted');
      const handlers = await freshHandlers();
      const result = await handlers.whisper.checkMicrophonePermission();

      expect(result.isDarwin).toBe(true);
      expect(result.status).toBe('granted');
      expect(mockGetMediaAccessStatus).toHaveBeenCalledWith('microphone');
    });

    it('returns unknown status on non-darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const handlers = await freshHandlers();
      const result = await handlers.whisper.checkMicrophonePermission();

      expect(result.isDarwin).toBe(false);
      expect(result.status).toBe('unknown');
    });
  });

  describe('whisper.requestMicrophonePermission', () => {
    let originalPlatform: string;

    beforeEach(() => {
      originalPlatform = process.platform;
    });

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('requests and returns permission on darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      mockAskForMediaAccess.mockResolvedValue(true);
      mockGetMediaAccessStatus.mockReturnValue('granted');

      const handlers = await freshHandlers();
      const result = await handlers.whisper.requestMicrophonePermission();

      expect(result.granted).toBe(true);
      expect(result.status).toBe('granted');
    });

    it('returns granted on non-darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const handlers = await freshHandlers();
      const result = await handlers.whisper.requestMicrophonePermission();

      expect(result.granted).toBe(true);
      expect(result.status).toBe('granted');
    });
  });
});
