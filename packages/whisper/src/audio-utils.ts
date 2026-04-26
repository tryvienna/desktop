/**
 * Audio utility functions for preprocessing audio data for Whisper.
 * Handles resampling to 16kHz, normalization, and WAV encoding/decoding.
 */

import { WHISPER_SAMPLE_RATE } from './types';

/**
 * Resample audio from one sample rate to another using linear interpolation.
 * Whisper requires 16kHz mono audio.
 *
 * Note: Linear interpolation introduces aliasing when downsampling (e.g. 48kHz→16kHz)
 * because it doesn't apply a low-pass anti-aliasing filter. This is acceptable for
 * speech transcription where the frequency content above 8kHz has minimal impact on
 * Whisper's accuracy, but would not be suitable for high-fidelity audio processing.
 */
export function resampleAudio(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return input;

  const ratio = fromRate / toRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    output[i] = input[srcIndexFloor]! * (1 - fraction) + input[srcIndexCeil]! * fraction;
  }

  return output;
}

/**
 * Normalize audio to [-1, 1] range using peak normalization.
 */
export function normalizeAudio(input: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < input.length; i++) {
    const abs = Math.abs(input[i]!);
    if (abs > max) max = abs;
  }

  if (max === 0 || max <= 1) return input;

  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i]! / max;
  }
  return output;
}

/**
 * Convert stereo (interleaved) audio to mono by averaging channels.
 */
export function stereoToMono(input: Float32Array, channels: number): Float32Array {
  if (channels === 1) return input;

  const monoLength = Math.floor(input.length / channels);
  const output = new Float32Array(monoLength);

  for (let i = 0; i < monoLength; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      sum += input[i * channels + ch]!;
    }
    output[i] = sum / channels;
  }

  return output;
}

/**
 * Encode Float32 PCM audio data as a WAV file buffer.
 * Produces 16-bit PCM WAV at the specified sample rate.
 */
export function float32ToWav(pcm: Float32Array, sampleRate: number = WHISPER_SAMPLE_RATE): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataLength = pcm.length * bytesPerSample;
  const headerLength = 44;
  const buffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // byte rate
  view.setUint16(32, numChannels * bytesPerSample, true); // block align
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM samples (convert float32 [-1, 1] to int16)
  let offset = 44;
  for (let i = 0; i < pcm.length; i++) {
    const sample = Math.max(-1, Math.min(1, pcm[i]!));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Decode a WAV buffer to Float32 PCM audio data.
 * Returns mono audio normalized to [-1, 1].
 */
export function wavToFloat32(buffer: ArrayBuffer): { pcm: Float32Array; sampleRate: number; channels: number } {
  const view = new DataView(buffer);

  // Verify RIFF header
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') throw new Error('Not a valid WAV file: missing RIFF header');

  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') throw new Error('Not a valid WAV file: missing WAVE header');

  // Find fmt and data chunks
  let chunkOffset = 12;
  let fmtOffset = -1;
  let dataOffset = -1;
  let dataSize = 0;

  while (chunkOffset < view.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(chunkOffset),
      view.getUint8(chunkOffset + 1),
      view.getUint8(chunkOffset + 2),
      view.getUint8(chunkOffset + 3),
    );
    const chunkSize = view.getUint32(chunkOffset + 4, true);

    if (chunkId === 'fmt ') {
      fmtOffset = chunkOffset + 8;
    } else if (chunkId === 'data') {
      dataOffset = chunkOffset + 8;
      dataSize = chunkSize;
    }

    chunkOffset += 8 + chunkSize;
  }

  if (fmtOffset === -1) throw new Error('WAV file missing fmt chunk');
  if (dataOffset === -1) throw new Error('WAV file missing data chunk');

  // Guard against malformed files where dataSize extends past the buffer
  if (dataOffset + dataSize > buffer.byteLength) {
    dataSize = buffer.byteLength - dataOffset;
  }

  const audioFormat = view.getUint16(fmtOffset, true);
  const channels = view.getUint16(fmtOffset + 2, true);
  const sampleRate = view.getUint32(fmtOffset + 4, true);
  const bitsPerSample = view.getUint16(fmtOffset + 14, true);

  let pcm: Float32Array;

  if (audioFormat === 1) {
    // PCM integer
    if (bitsPerSample === 16) {
      const numSamples = dataSize / 2;
      pcm = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        pcm[i] = view.getInt16(dataOffset + i * 2, true) / 0x8000;
      }
    } else if (bitsPerSample === 8) {
      const numSamples = dataSize;
      pcm = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        pcm[i] = (view.getUint8(dataOffset + i) - 128) / 128;
      }
    } else if (bitsPerSample === 32) {
      const numSamples = dataSize / 4;
      pcm = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        pcm[i] = view.getInt32(dataOffset + i * 4, true) / 0x80000000;
      }
    } else {
      throw new Error(`Unsupported bits per sample: ${bitsPerSample}`);
    }
  } else if (audioFormat === 3) {
    // IEEE float
    const numSamples = dataSize / 4;
    pcm = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      pcm[i] = view.getFloat32(dataOffset + i * 4, true);
    }
  } else {
    throw new Error(`Unsupported audio format: ${audioFormat}`);
  }

  // Convert to mono if needed
  if (channels > 1) {
    pcm = stereoToMono(pcm, channels);
  }

  return { pcm, sampleRate, channels: 1 };
}

/**
 * Prepare audio for Whisper: resample to 16kHz mono Float32.
 */
export function prepareAudioForWhisper(
  audio: Float32Array,
  sampleRate: number,
): Float32Array {
  let prepared = audio;

  // Resample if needed
  if (sampleRate !== WHISPER_SAMPLE_RATE) {
    prepared = resampleAudio(prepared, sampleRate, WHISPER_SAMPLE_RATE);
  }

  // Normalize
  prepared = normalizeAudio(prepared);

  return prepared;
}

/**
 * Get the duration of audio in seconds.
 */
export function getAudioDuration(samples: number, sampleRate: number): number {
  return samples / sampleRate;
}

/**
 * Concatenate multiple Float32Arrays into one.
 */
export function concatenateAudio(...chunks: Float32Array[]): Float32Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
