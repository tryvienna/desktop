import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '@vienna/ipc';

const CorrectionPatchSchema = z.object({
  offset: z.number(),
  removeLength: z.number(),
  insert: z.string(),
});

// ─── Download progress event payload ───────────────────────────────────────

const WhisperDownloadProgressSchema = z.object({
  /** Which model is being downloaded */
  model: z.string(),
  /** Name of the file currently being fetched */
  file: z.string(),
  /** 0-100 progress for this file */
  progress: z.number(),
  /** Bytes loaded so far */
  loaded: z.number(),
  /** Total bytes (0 if unknown) */
  total: z.number(),
  /** 0-based index of the model in the download queue */
  modelIndex: z.number(),
  /** Total number of models being downloaded */
  totalModels: z.number(),
});

export const whisperEvents = defineEvents({
  whisper: {
    /** Fired repeatedly during model download with per-file progress */
    onDownloadProgress: event({
      payload: WhisperDownloadProgressSchema,
    }),
  },
});

// ─── API Methods ──────────────────────────────────────────────────────────

export const whisperApi = defineApi({
  whisper: {
    transcribe: method({
      input: z.object({
        /** Base64-encoded Float32Array buffer (avoids JSON serializing 160k+ numbers) */
        audioBase64: z.string(),
        /** Sample rate of the audio */
        sampleRate: z.number(),
        /** Language hint (ISO 639-1), null for auto-detect */
        language: z.string().nullable().optional(),
      }),
      output: z.object({
        /** Transcribed text */
        text: z.string(),
        /** Audio duration in seconds */
        duration: z.number(),
      }),
    }),

    twoPassTranscribe: method({
      input: z.object({
        audioBase64: z.string(),
        sampleRate: z.number(),
        language: z.string().nullable().optional(),
      }),
      output: z.object({
        /** Hot (fast) transcription text */
        hotText: z.string(),
        /** Cold (refined) transcription text */
        coldText: z.string(),
        /** Word-level correction patches */
        patches: z.array(CorrectionPatchSchema),
        /** Audio duration in seconds */
        duration: z.number(),
      }),
    }),

    getStatus: method({
      input: z.object({}),
      output: z.object({
        ready: z.boolean(),
        model: z.string(),
      }),
    }),

    checkMicrophonePermission: method({
      input: z.object({}),
      output: z.object({
        status: z.string(),
        isDarwin: z.boolean(),
      }),
    }),

    requestMicrophonePermission: method({
      input: z.object({}),
      output: z.object({
        granted: z.boolean(),
        status: z.string(),
      }),
    }),

    /** Check whether the required models (tiny + base) are cached locally */
    checkModelsReady: method({
      input: z.object({}),
      output: z.object({
        ready: z.boolean(),
        /** Which models are missing */
        missing: z.array(z.string()),
        /** Total approximate download size in bytes for missing models */
        downloadSize: z.number(),
      }),
    }),

    /** Download and initialize a single model. Call once per missing model. */
    downloadModel: method({
      input: z.object({
        /** Which model to download (e.g. 'tiny', 'base') */
        model: z.enum(['tiny', 'tiny.en', 'base', 'base.en']),
        /** 0-based index of this model in the download queue (for progress tracking) */
        modelIndex: z.number().optional(),
        /** Total number of models being downloaded (for progress tracking) */
        totalModels: z.number().optional(),
      }),
      output: z.object({
        success: z.boolean(),
      }),
    }),
  },
});
