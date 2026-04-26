/**
 * Main Transcriber class — orchestrates Whisper inference.
 * Handles model loading, audio preprocessing, and transcription.
 */

import type {
  TranscriberConfig,
  TranscriptionResult,
  TranscriptionSegment,
  TranscribeOptions,
  WhisperModelName,
} from './types';
import {
  TranscriberConfigSchema,
  WHISPER_MODELS,
  WHISPER_SAMPLE_RATE,
  WHISPER_CHUNK_LENGTH_S,
  WHISPER_STRIDE_LENGTH_S,
} from './types';
import { ModelManager } from './model-manager';
import { prepareAudioForWhisper, getAudioDuration } from './audio-utils';

// Type for the HuggingFace pipeline — we use a local type here because the
// @huggingface/transformers types are loaded dynamically
type Pipeline = {
  (audio: Float32Array, options?: Record<string, unknown>): Promise<PipelineOutput>;
};

type PipelineOutput = {
  text: string;
  chunks?: Array<{
    text: string;
    timestamp: [number, number | null];
  }>;
};

/**
 * Interface for anything that can transcribe audio.
 * Used by TwoPassTranscriber to accept either a real Transcriber or a mock.
 */
export interface TranscriberLike {
  transcribe(audio: Float32Array, sampleRate: number): Promise<TranscriptionResult>;
}

/** Callback for download progress from @huggingface/transformers */
export type ProgressCallback = (info: {
  status: string;
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}) => void;

export class Transcriber implements TranscriberLike {
  private config: TranscriberConfig;
  private pipeline: Pipeline | null = null;
  private modelManager: ModelManager;
  private initialized = false;
  private initializing: Promise<void> | null = null;

  constructor(config?: Partial<TranscriberConfig>) {
    this.config = TranscriberConfigSchema.parse(config ?? {});
    this.modelManager = new ModelManager();
  }

  /**
   * Get the model manager for tracking download progress.
   */
  getModelManager(): ModelManager {
    return this.modelManager;
  }

  /**
   * Initialize the transcriber: download model (if needed) and load the pipeline.
   * Called automatically on first transcription if not called explicitly.
   *
   * @param onProgress - Optional callback for per-file download progress
   */
  async initialize(onProgress?: ProgressCallback): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = this._initialize(onProgress);
    try {
      await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  private async _initialize(onProgress?: ProgressCallback): Promise<void> {
    const modelName = this.config.model as WhisperModelName;
    const modelInfo = WHISPER_MODELS[modelName];

    const transformers = await import('@huggingface/transformers');

    // Point HuggingFace cache to a writable directory outside the ASAR archive.
    // Native ONNX runtime can't read files from inside ASAR (system error 20 / ENOTDIR).
    // We set BOTH env.cacheDir (global) AND pass cache_dir in pipeline options (per-call)
    // to ensure the cache directory is used regardless of module loading semantics.
    if (this.config.cacheDir) {
      transformers.env.cacheDir = this.config.cacheDir;
      // Also disable local model loading — in ASAR, localModelPath resolves inside
      // the archive which native ONNX runtime can't read.
      transformers.env.allowLocalModels = false;
    }

    const pipelineOptions: Record<string, unknown> = {};

    if (this.config.cacheDir) {
      pipelineOptions.cache_dir = this.config.cacheDir;
    }

    if (this.config.device) {
      pipelineOptions.device = this.config.device;
    }

    if (this.config.dtype) {
      pipelineOptions.dtype = this.config.dtype;
    }

    if (onProgress) {
      pipelineOptions.progress_callback = onProgress;
    }

    // Create the ASR pipeline — this downloads the model if not cached.
    // @huggingface/transformers can silently produce truncated files, so if ONNX
    // Runtime fails with "Protobuf parsing failed", delete the corrupt cache and retry once.
    try {
      this.pipeline = (await transformers.pipeline(
        'automatic-speech-recognition',
        modelInfo.hfModelId,
        pipelineOptions,
      )) as unknown as Pipeline;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Protobuf parsing failed') && this.config.cacheDir) {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const onnxDir = path.join(this.config.cacheDir, modelInfo.hfModelId, 'onnx');
        // Delete all .onnx files so the next attempt re-downloads them
        if (fs.existsSync(onnxDir)) {
          for (const file of fs.readdirSync(onnxDir)) {
            if (file.endsWith('.onnx')) {
              fs.unlinkSync(path.join(onnxDir, file));
            }
          }
        }
        // Retry once — if this also fails, let the error propagate
        this.pipeline = (await transformers.pipeline(
          'automatic-speech-recognition',
          modelInfo.hfModelId,
          pipelineOptions,
        )) as unknown as Pipeline;
      } else {
        throw err;
      }
    }

    this.modelManager.markDownloaded(modelName);
    this.initialized = true;
  }

  /**
   * Transcribe audio data.
   *
   * @param audio - Float32Array of audio samples (any sample rate)
   * @param sampleRate - Sample rate of the input audio (default: 16000)
   * @param options - Additional transcription options
   */
  async transcribe(
    audio: Float32Array,
    sampleRate: number = WHISPER_SAMPLE_RATE,
    options?: TranscribeOptions,
  ): Promise<TranscriptionResult> {
    await this.initialize();

    // Prepare audio: resample to 16kHz mono and normalize
    const prepared = prepareAudioForWhisper(audio, sampleRate);
    const duration = getAudioDuration(prepared.length, WHISPER_SAMPLE_RATE);

    const language = options?.language ?? this.config.language;
    const timestamps = options?.timestamps ?? this.config.timestamps;

    // Build pipeline options
    const pipelineOptions: Record<string, unknown> = {};

    if (language) {
      pipelineOptions.language = language;
    }

    if (timestamps) {
      pipelineOptions.return_timestamps = true;
    }

    // For long audio (>30s), enable chunking
    if (duration > WHISPER_CHUNK_LENGTH_S) {
      pipelineOptions.chunk_length_s = WHISPER_CHUNK_LENGTH_S;
      pipelineOptions.stride_length_s = WHISPER_STRIDE_LENGTH_S;
    }

    if (options?.prompt) {
      pipelineOptions.forced_decoder_ids = undefined; // Let prompt take effect
    }

    const output = await this.pipeline!(prepared, pipelineOptions);

    // Parse output into structured result
    const segments: TranscriptionSegment[] = [];
    if (output.chunks) {
      for (const chunk of output.chunks) {
        segments.push({
          start: chunk.timestamp[0],
          end: chunk.timestamp[1] ?? duration,
          text: chunk.text.trim(),
        });
      }
    }

    return {
      text: output.text.trim(),
      segments,
      language: language ?? 'auto',
      duration,
    };
  }

  /**
   * Release model from memory.
   */
  async dispose(): Promise<void> {
    if (this.pipeline) {
      // Release ONNX inference sessions to free native memory.
      // The pipeline object may expose a dispose() method depending on the
      // @huggingface/transformers version; call it if available.
      const p = this.pipeline as Pipeline & { dispose?: () => Promise<void> | void };
      if (typeof p.dispose === 'function') {
        await Promise.resolve(p.dispose());
      }
      this.pipeline = null;
    }
    this.initialized = false;
  }

  /**
   * Whether the transcriber is ready for transcription.
   */
  isReady(): boolean {
    return this.initialized;
  }
}
