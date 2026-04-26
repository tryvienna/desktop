/**
 * @vienna/whisper — Local speech-to-text using OpenAI Whisper via ONNX Runtime.
 *
 * @example
 * ```typescript
 * import { Transcriber } from '@vienna/whisper'
 *
 * const transcriber = new Transcriber({ model: 'tiny', language: 'en' })
 * await transcriber.initialize()
 *
 * // Transcribe a Float32Array of audio at 16kHz
 * const result = await transcriber.transcribe(audioData)
 * console.log(result.text)
 * ```
 */

// Core transcriber
export { Transcriber } from './transcriber';
export type { TranscriberLike, ProgressCallback } from './transcriber';

// Model management
export { ModelManager } from './model-manager';

// Voice Activity Detection
export { VoiceActivityDetector, computeRmsDb, computePeakRmsDb } from './vad';
export type { VADEvents } from './vad';

// Two-pass transcription (hot + cold path with word-level diff)
export { TwoPassTranscriber, tokenizeWords, computeWordPatches, applyPatches } from './two-pass-transcriber';
export type { CorrectionPatch, TwoPassConfig, TwoPassResult, TwoPassEvents, WordToken } from './two-pass-transcriber';

// Audio utilities
export {
  resampleAudio,
  normalizeAudio,
  stereoToMono,
  float32ToWav,
  wavToFloat32,
  prepareAudioForWhisper,
  getAudioDuration,
  concatenateAudio,
} from './audio-utils';

// Types
export type {
  WhisperModelName,
  TranscriberConfig,
  TranscriptionResult,
  TranscriptionSegment,
  TranscribeOptions,
  ModelInfo,
  DownloadProgress,
  ModelManagerEvents,
  RecorderConfig,
  RecorderEvents,
  VADConfig,
} from './types';

// Schemas & constants
export {
  TranscriberConfigSchema,
  RecorderConfigSchema,
  VADConfigSchema,
  WHISPER_MODELS,
  WHISPER_MODEL_NAMES,
  WHISPER_SAMPLE_RATE,
  WHISPER_CHUNK_LENGTH_S,
  WHISPER_STRIDE_LENGTH_S,
} from './types';
