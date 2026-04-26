import { z } from 'zod';

// ─── Model Registry ──────────────────────────────────────────────────────────

/**
 * Model registry. Approximate sizes reflect q8 (int8 quantized) variants,
 * which are the default dtype for download and inference.
 */
export const WHISPER_MODELS = {
  tiny: {
    name: 'tiny',
    hfModelId: 'onnx-community/whisper-tiny',
    parameterCount: '39M',
    approximateSize: 41_000_000, // ~41MB (q8: 10MB encoder + 31MB decoder)
  },
  'tiny.en': {
    name: 'tiny.en',
    hfModelId: 'onnx-community/whisper-tiny.en',
    parameterCount: '39M',
    approximateSize: 41_000_000,
  },
  base: {
    name: 'base',
    hfModelId: 'onnx-community/whisper-base',
    parameterCount: '74M',
    approximateSize: 77_000_000, // ~77MB (q8: 23MB encoder + 54MB decoder)
  },
  'base.en': {
    name: 'base.en',
    hfModelId: 'onnx-community/whisper-base.en',
    parameterCount: '74M',
    approximateSize: 77_000_000,
  },
  small: {
    name: 'small',
    hfModelId: 'onnx-community/whisper-small',
    parameterCount: '244M',
    approximateSize: 170_000_000, // ~170MB (q8)
  },
  'small.en': {
    name: 'small.en',
    hfModelId: 'onnx-community/whisper-small.en',
    parameterCount: '244M',
    approximateSize: 170_000_000,
  },
} as const;

export type WhisperModelName = keyof typeof WHISPER_MODELS;

export const WHISPER_MODEL_NAMES = Object.keys(WHISPER_MODELS) as WhisperModelName[];

// ─── Transcription ───────────────────────────────────────────────────────────

export interface TranscriptionSegment {
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Transcribed text for this segment */
  text: string;
}

export interface TranscriptionResult {
  /** Full transcribed text */
  text: string;
  /** Time-aligned segments (if timestamps were requested) */
  segments: TranscriptionSegment[];
  /** Detected or specified language (ISO 639-1) */
  language: string;
  /** Duration of the audio in seconds */
  duration: number;
}

export const TranscriberConfigSchema = z.object({
  /** Which Whisper model to use */
  model: z.enum(['tiny', 'tiny.en', 'base', 'base.en', 'small', 'small.en']).default('tiny'),
  /** Language code (ISO 639-1). Null for auto-detect. */
  language: z.string().nullable().default('en'),
  /** Whether to return timestamps with segments */
  timestamps: z.boolean().default(true),
  /** Device to use for inference: null for auto-detect */
  device: z.enum(['cpu', 'webgpu']).nullable().default(null),
  /** Data type for model weights. Defaults to 'q8' (int8 quantized) for smaller downloads and faster inference with near-identical accuracy. */
  dtype: z.enum(['fp32', 'fp16', 'q8', 'q4']).nullable().default('q8'),
  /** Directory to cache downloaded models. Required in packaged Electron apps. */
  cacheDir: z.string().nullable().default(null),
});

export type TranscriberConfig = z.infer<typeof TranscriberConfigSchema>;

export interface TranscribeOptions {
  /** Language hint (overrides config) */
  language?: string | null;
  /** Whether to include timestamps (overrides config) */
  timestamps?: boolean;
  /** Context prompt to improve accuracy (e.g., "Meeting about React components") */
  prompt?: string;
}

// ─── Model Manager ───────────────────────────────────────────────────────────

export interface ModelInfo {
  name: WhisperModelName;
  hfModelId: string;
  parameterCount: string;
  approximateSize: number;
  downloaded: boolean;
}

export interface DownloadProgress {
  model: WhisperModelName;
  /** 0 to 1 */
  progress: number;
  /** Bytes loaded so far */
  loaded: number;
  /** Total bytes (may be 0 if unknown) */
  total: number;
}

export interface ModelManagerEvents {
  'download:progress': (progress: DownloadProgress) => void;
  'download:complete': (model: WhisperModelName) => void;
  'download:error': (error: Error, model: WhisperModelName) => void;
}

// ─── Audio Recorder ──────────────────────────────────────────────────────────

export const RecorderConfigSchema = z.object({
  /** Target sample rate for output audio */
  sampleRate: z.number().default(16000),
  /** Maximum recording duration in milliseconds */
  maxDuration: z.number().nullable().default(null),
  /** Enable voice activity detection */
  vad: z.boolean().default(false),
  /** Stop recording after this many ms of silence (requires vad: true) */
  silenceTimeout: z.number().nullable().default(null),
});

export type RecorderConfig = z.infer<typeof RecorderConfigSchema>;

export interface RecorderEvents {
  /** Emitted when a new audio chunk is available */
  audio: (chunk: Float32Array) => void;
  /** Emitted when silence is detected (requires VAD) */
  silence: () => void;
  /** Emitted when speech starts (requires VAD) */
  speechStart: () => void;
  /** Emitted when speech ends (requires VAD) */
  speechEnd: () => void;
  /** Emitted when recording stops */
  stop: (audio: Float32Array) => void;
  /** Emitted on error */
  error: (error: Error) => void;
}

// ─── Voice Activity Detection ────────────────────────────────────────────────

export const VADConfigSchema = z.object({
  /** RMS energy threshold in dB below which audio is considered silence */
  silenceThresholdDb: z.number().default(-35),
  /** Minimum duration of silence (ms) to trigger a silence event */
  minSilenceDurationMs: z.number().default(500),
  /** Minimum duration of speech (ms) before it's considered real speech */
  minSpeechDurationMs: z.number().default(100),
  /** Sample rate of incoming audio */
  sampleRate: z.number().default(16000),
  /** Analysis frame size in samples */
  frameSize: z.number().default(1600), // 100ms at 16kHz
});

export type VADConfig = z.infer<typeof VADConfigSchema>;

// ─── Constants ───────────────────────────────────────────────────────────────

/** Whisper requires 16kHz mono audio input */
export const WHISPER_SAMPLE_RATE = 16000;

/** Whisper processes audio in 30-second chunks */
export const WHISPER_CHUNK_LENGTH_S = 30;

/** Overlap between chunks in seconds (for long audio) */
export const WHISPER_STRIDE_LENGTH_S = 5;
