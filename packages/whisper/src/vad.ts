/**
 * Energy-based Voice Activity Detection (VAD).
 * Detects speech/silence transitions in audio streams.
 */

import { EventEmitter } from 'events';
import type { VADConfig } from './types';
import { VADConfigSchema } from './types';

export interface VADEvents {
  speechStart: () => void;
  speechEnd: () => void;
  silence: () => void;
}

export class VoiceActivityDetector extends EventEmitter {
  private config: VADConfig;
  private isSpeaking = false;
  private silenceDurationMs = 0;
  private speechDurationMs = 0;

  constructor(config?: Partial<VADConfig>) {
    super();
    this.config = VADConfigSchema.parse(config ?? {});
  }

  /**
   * Process an audio frame and detect speech/silence transitions.
   * @param frame - Audio samples (Float32Array)
   */
  processFrame(frame: Float32Array): boolean {
    const rmsDb = computeRmsDb(frame);
    const isFrameSpeech = rmsDb > this.config.silenceThresholdDb;

    const frameDurationMs = (frame.length / this.config.sampleRate) * 1000;

    if (isFrameSpeech) {
      this.silenceDurationMs = 0;
      this.speechDurationMs += frameDurationMs;

      if (!this.isSpeaking && this.speechDurationMs >= this.config.minSpeechDurationMs) {
        this.isSpeaking = true;
        this.emit('speechStart');
      }
    } else {
      this.speechDurationMs = 0;
      this.silenceDurationMs += frameDurationMs;

      if (this.isSpeaking && this.silenceDurationMs >= this.config.minSilenceDurationMs) {
        this.isSpeaking = false;
        this.emit('speechEnd');
        this.emit('silence');
      }
    }

    return isFrameSpeech;
  }

  /**
   * Reset the detector state.
   */
  reset(): void {
    this.isSpeaking = false;
    this.silenceDurationMs = 0;
    this.speechDurationMs = 0;
  }

  /**
   * Whether speech is currently detected.
   */
  get speaking(): boolean {
    return this.isSpeaking;
  }

  // Type-safe event emitter overrides
  override on<K extends keyof VADEvents>(event: K, listener: VADEvents[K]): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof VADEvents>(event: K, ...args: Parameters<VADEvents[K]>): boolean {
    return super.emit(event, ...args);
  }
}

/**
 * Compute peak RMS energy (dB) across overlapping sub-windows of an audio buffer.
 *
 * Returns the highest RMS value found, representing the loudest segment.
 * Used to check whether an audio window contains speech-like energy spikes
 * above ambient noise before committing to an expensive Whisper invocation.
 *
 * @param audio      Float32Array of PCM samples
 * @param windowMs   Sub-window size in ms (default: 100ms — matches VAD frame size)
 * @param sampleRate Audio sample rate (default: 16000)
 */
export function computePeakRmsDb(
  audio: Float32Array,
  windowMs = 100,
  sampleRate = 16_000,
): number {
  const windowSamples = Math.round((windowMs / 1000) * sampleRate);
  if (audio.length === 0 || windowSamples <= 0) return -Infinity;

  let peakDb = -Infinity;
  // 50% overlap for good temporal resolution without excessive iterations
  const step = Math.max(1, Math.floor(windowSamples / 2));

  for (let i = 0; i <= audio.length - windowSamples; i += step) {
    const frame = audio.subarray(i, i + windowSamples);
    const db = computeRmsDb(frame);
    if (db > peakDb) peakDb = db;
  }

  return peakDb;
}

/**
 * Compute RMS energy in decibels for an audio frame.
 */
export function computeRmsDb(frame: Float32Array): number {
  if (frame.length === 0) return -Infinity;

  let sumSquares = 0;
  for (let i = 0; i < frame.length; i++) {
    sumSquares += frame[i]! * frame[i]!;
  }

  const rms = Math.sqrt(sumSquares / frame.length);
  if (rms === 0) return -Infinity;

  return 20 * Math.log10(rms);
}
