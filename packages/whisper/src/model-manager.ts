/**
 * Manages Whisper model lifecycle: download, cache, and deletion.
 * Uses @huggingface/transformers which handles model downloading and caching internally.
 */

import { EventEmitter } from 'events';
import type {
  WhisperModelName,
  ModelInfo,
  DownloadProgress,
  ModelManagerEvents,
} from './types';
import { WHISPER_MODELS, WHISPER_MODEL_NAMES } from './types';

export class ModelManager extends EventEmitter {
  private downloadedModels = new Set<WhisperModelName>();
  private cacheDir: string | null;

  constructor(cacheDir?: string) {
    super();
    this.cacheDir = cacheDir ?? null;
    // Probe cache directory to restore download status across restarts
    if (cacheDir) {
      this.probeCache(cacheDir);
    }
  }

  /**
   * Check the cache directory for already-downloaded models.
   * Looks for encoder ONNX files as a proxy for "model is usable".
   */
  private probeCache(cacheDir: string): void {
    try {
      // Dynamic import not possible in constructor — use require for sync check.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('node:fs') as typeof import('node:fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('node:path') as typeof import('node:path');

      for (const name of WHISPER_MODEL_NAMES) {
        const info = WHISPER_MODELS[name];
        const onnxDir = path.join(cacheDir, info.hfModelId, 'onnx');
        if (fs.existsSync(onnxDir)) {
          const files = fs.readdirSync(onnxDir);
          if (files.some((f: string) => f.startsWith('encoder_model') && f.endsWith('.onnx'))) {
            this.downloadedModels.add(name);
          }
        }
      }
    } catch {
      // Non-fatal — cache probe is best-effort
    }
  }

  /**
   * List all available models with their download status.
   */
  listModels(): ModelInfo[] {
    return WHISPER_MODEL_NAMES.map((name) => {
      const model = WHISPER_MODELS[name];
      return {
        name,
        hfModelId: model.hfModelId,
        parameterCount: model.parameterCount,
        approximateSize: model.approximateSize,
        downloaded: this.downloadedModels.has(name),
      };
    });
  }

  /**
   * Get info about a specific model.
   */
  getModelInfo(name: WhisperModelName): ModelInfo {
    const model = WHISPER_MODELS[name];
    return {
      name,
      hfModelId: model.hfModelId,
      parameterCount: model.parameterCount,
      approximateSize: model.approximateSize,
      downloaded: this.downloadedModels.has(name),
    };
  }

  /**
   * Get the HuggingFace model ID for a given model name.
   */
  getHfModelId(name: WhisperModelName): string {
    return WHISPER_MODELS[name].hfModelId;
  }

  /**
   * Ensure a model is available locally. Downloads if not cached.
   * The actual download is handled by @huggingface/transformers when the pipeline is created.
   * This method pre-downloads the model so it's ready for instant use.
   */
  async ensureModel(name: WhisperModelName): Promise<void> {
    if (this.downloadedModels.has(name)) return;

    const hfModelId = this.getHfModelId(name);

    try {
      // Use the same pipeline() call as Transcriber._initialize to ensure
      // the exact same files are downloaded and cached.
      const transformers = await import('@huggingface/transformers');

      if (this.cacheDir) {
        transformers.env.cacheDir = this.cacheDir;
        transformers.env.allowLocalModels = false;
      }

      const progressCallback = (progress: { status: string; progress?: number; loaded?: number; total?: number }) => {
        if (progress.status === 'progress') {
          const downloadProgress: DownloadProgress = {
            model: name,
            progress: progress.progress ? progress.progress / 100 : 0,
            loaded: progress.loaded ?? 0,
            total: progress.total ?? 0,
          };
          this.emit('download:progress', downloadProgress);
        }
      };

      const pipeline = await transformers.pipeline(
        'automatic-speech-recognition',
        hfModelId,
        {
          ...(this.cacheDir ? { cache_dir: this.cacheDir } : {}),
          progress_callback: progressCallback,
        },
      );

      // Dispose immediately — we only needed to trigger the download/cache.
      if (typeof (pipeline as unknown as { dispose?: () => void }).dispose === 'function') {
        (pipeline as unknown as { dispose: () => void }).dispose();
      }

      this.downloadedModels.add(name);
      this.emit('download:complete', name);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('download:error', err, name);
      throw err;
    }
  }

  /**
   * Mark a model as downloaded (called internally after pipeline creation succeeds).
   */
  markDownloaded(name: WhisperModelName): void {
    this.downloadedModels.add(name);
  }

  // Type-safe event emitter overrides
  override on<K extends keyof ModelManagerEvents>(
    event: K,
    listener: ModelManagerEvents[K],
  ): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof ModelManagerEvents>(
    event: K,
    ...args: Parameters<ModelManagerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
