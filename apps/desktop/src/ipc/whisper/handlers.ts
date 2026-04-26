import fs from 'node:fs';
import path from 'node:path';
import { systemPreferences } from 'electron';
import type { MainLogger } from '@vienna/logger/main';
import type { ViennaPaths } from '@vienna/paths';
import { Transcriber, TwoPassTranscriber, WHISPER_SAMPLE_RATE, WHISPER_MODELS } from '@vienna/whisper';

/** Lazy-initialized transcriber state */
let hotTranscriber: Transcriber | null = null;
let coldTranscriber: Transcriber | null = null;
let twoPass: TwoPassTranscriber | null = null;

function getHotTranscriber(cacheDir: string): Transcriber {
  if (!hotTranscriber) {
    hotTranscriber = new Transcriber({ model: 'tiny', language: 'en', cacheDir });
  }
  return hotTranscriber;
}

function getColdTranscriber(cacheDir: string): Transcriber {
  if (!coldTranscriber) {
    coldTranscriber = new Transcriber({ model: 'base', language: 'en', cacheDir });
  }
  return coldTranscriber;
}

function getTwoPass(cacheDir: string): TwoPassTranscriber {
  if (!twoPass) {
    twoPass = new TwoPassTranscriber(
      getHotTranscriber(cacheDir),
      getColdTranscriber(cacheDir),
    );
  }
  return twoPass;
}

/** Dispose all cached transcribers, releasing ONNX sessions and native memory. */
export async function disposeWhisperTranscribers(): Promise<void> {
  if (hotTranscriber) { await hotTranscriber.dispose(); hotTranscriber = null; }
  if (coldTranscriber) { await coldTranscriber.dispose(); coldTranscriber = null; }
  twoPass = null;
}

interface WhisperEmitter {
  onDownloadProgress: (payload: {
    model: string;
    file: string;
    progress: number;
    loaded: number;
    total: number;
    modelIndex: number;
    totalModels: number;
  }) => void;
}

export function createWhisperHandlers(logger: MainLogger, paths: ViennaPaths, emitter?: WhisperEmitter) {
  const cacheDir = paths.whisperModels;
  const childLogger = logger.child({ module: 'whisper' });

  return {
    whisper: {
      transcribe: async (input: { audioBase64: string; sampleRate: number; language?: string | null }) => {
        const buf = Buffer.from(input.audioBase64, 'base64');
        const audio = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
        childLogger.info('Transcribe request received', { samples: audio.length, sampleRate: input.sampleRate });
        const transcriber = getHotTranscriber(cacheDir);
        const result = await transcriber.transcribe(audio, input.sampleRate, {
          language: input.language,
        });

        childLogger.info('Transcription complete', { text: result.text.slice(0, 100), duration: result.duration });

        return {
          text: result.text,
          duration: result.duration,
        };
      },

      twoPassTranscribe: async (input: { audioBase64: string; sampleRate: number; language?: string | null }) => {
        const buf = Buffer.from(input.audioBase64, 'base64');
        const audio = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
        childLogger.info('Two-pass transcribe request received', { samples: audio.length, sampleRate: input.sampleRate });
        const tp = getTwoPass(cacheDir);
        const result = await tp.transcribe(audio, input.sampleRate);

        childLogger.info('Two-pass transcription complete', {
          hotText: result.hotText.slice(0, 100),
          coldText: result.coldText.slice(0, 100),
          patchCount: result.patches.length,
        });

        const duration = audio.length / input.sampleRate;

        return {
          hotText: result.hotText,
          coldText: result.coldText,
          patches: result.patches,
          duration,
        };
      },

      getStatus: async () => {
        const ready = hotTranscriber?.isReady() ?? false;
        return { ready, model: 'tiny' };
      },

      checkMicrophonePermission: async () => {
        const isDarwin = process.platform === 'darwin';
        let status = 'unknown';

        if (isDarwin) {
          status = systemPreferences.getMediaAccessStatus('microphone');
        }

        return { status, isDarwin };
      },

      requestMicrophonePermission: async () => {
        const isDarwin = process.platform === 'darwin';
        if (!isDarwin) {
          return { granted: true, status: 'granted' };
        }

        const granted = await systemPreferences.askForMediaAccess('microphone');
        const status = systemPreferences.getMediaAccessStatus('microphone');

        return { granted, status };
      },

      checkModelsReady: async () => {
        const requiredModels = ['tiny', 'base'] as const;
        const missing: string[] = [];
        let downloadSize = 0;

        for (const model of requiredModels) {
          const info = WHISPER_MODELS[model];
          const modelDir = path.join(cacheDir, info.hfModelId);
          const onnxDir = path.join(modelDir, 'onnx');

          // Check for any encoder ONNX file (name varies by dtype: encoder_model.onnx, encoder_model_quantized.onnx, etc.)
          let hasEncoder = false;
          if (fs.existsSync(onnxDir)) {
            const files = fs.readdirSync(onnxDir);
            hasEncoder = files.some((f) => f.startsWith('encoder_model') && f.endsWith('.onnx'));
          }

          if (!hasEncoder) {
            missing.push(model);
            downloadSize += info.approximateSize;
          }
        }

        childLogger.info('Model readiness check', { missing, downloadSize });
        return { ready: missing.length === 0, missing, downloadSize };
      },

      downloadModel: async (input: { model: 'tiny' | 'tiny.en' | 'base' | 'base.en'; modelIndex?: number; totalModels?: number }) => {
        childLogger.info('Downloading whisper model', { model: input.model });

        // Get or create the transcriber for this model — initializing triggers download
        let transcriber: Transcriber;
        if (input.model === 'tiny' || input.model === 'tiny.en') {
          transcriber = getHotTranscriber(cacheDir);
        } else {
          transcriber = getColdTranscriber(cacheDir);
        }

        const modelIndex = input.modelIndex ?? 0;
        const totalModels = input.totalModels ?? 1;

        await transcriber.initialize(emitter ? (info) => {
          if (info.status === 'progress' && info.file) {
            emitter.onDownloadProgress({
              model: input.model,
              file: info.file,
              progress: info.progress ?? 0,
              loaded: info.loaded ?? 0,
              total: info.total ?? 0,
              modelIndex,
              totalModels,
            });
          }
        } : undefined);

        childLogger.info('Model download complete', { model: input.model });
        return { success: true };
      },
    },
  };
}
