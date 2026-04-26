import { describe, it, expect } from 'vitest';
import {
  resampleAudio,
  normalizeAudio,
  stereoToMono,
  float32ToWav,
  wavToFloat32,
  prepareAudioForWhisper,
  getAudioDuration,
  concatenateAudio,
} from '../audio-utils';

describe('resampleAudio', () => {
  it('returns the same array when rates match', () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    const result = resampleAudio(input, 16000, 16000);
    expect(result).toBe(input); // exact same reference
  });

  it('downsamples from 48kHz to 16kHz (3:1 ratio)', () => {
    // 48 samples at 48kHz = 1ms → should produce ~16 samples at 16kHz
    const input = new Float32Array(48);
    for (let i = 0; i < 48; i++) input[i] = Math.sin((2 * Math.PI * i) / 48);
    const result = resampleAudio(input, 48000, 16000);
    expect(result.length).toBe(16);
  });

  it('upsamples from 8kHz to 16kHz (1:2 ratio)', () => {
    const input = new Float32Array([0.0, 0.5, 1.0, 0.5, 0.0]);
    const result = resampleAudio(input, 8000, 16000);
    expect(result.length).toBe(10);
    // Interpolated values should be between neighbours
    expect(result[1]).toBeCloseTo(0.25, 1);
  });

  it('preserves approximate signal shape after resampling', () => {
    const input = new Float32Array(100);
    for (let i = 0; i < 100; i++) input[i] = Math.sin((2 * Math.PI * i) / 100);
    const result = resampleAudio(input, 44100, 16000);
    // Output should have fewer samples
    expect(result.length).toBeLessThan(input.length);
    // First sample should match
    expect(result[0]).toBeCloseTo(input[0]!, 5);
  });
});

describe('normalizeAudio', () => {
  it('returns the same array when already within [-1, 1]', () => {
    const input = new Float32Array([0.5, -0.5, 0.8]);
    const result = normalizeAudio(input);
    expect(result).toBe(input); // max <= 1, returns same ref
  });

  it('normalizes audio that exceeds [-1, 1]', () => {
    const input = new Float32Array([2.0, -4.0, 1.0]);
    const result = normalizeAudio(input);
    expect(result[0]).toBeCloseTo(0.5);
    expect(result[1]).toBeCloseTo(-1.0);
    expect(result[2]).toBeCloseTo(0.25);
  });

  it('handles silent audio (all zeros)', () => {
    const input = new Float32Array([0, 0, 0]);
    const result = normalizeAudio(input);
    expect(result).toBe(input);
  });
});

describe('stereoToMono', () => {
  it('returns the same array for mono input', () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    const result = stereoToMono(input, 1);
    expect(result).toBe(input);
  });

  it('averages stereo channels', () => {
    // Interleaved stereo: [L0, R0, L1, R1]
    const input = new Float32Array([0.5, 1.0, -0.5, 0.5]);
    const result = stereoToMono(input, 2);
    expect(result.length).toBe(2);
    expect(result[0]).toBeCloseTo(0.75);
    expect(result[1]).toBeCloseTo(0.0);
  });
});

describe('float32ToWav / wavToFloat32 roundtrip', () => {
  it('roundtrips a simple signal', () => {
    const original = new Float32Array(160);
    for (let i = 0; i < 160; i++) original[i] = Math.sin((2 * Math.PI * i) / 160);

    const wav = float32ToWav(original, 16000);
    const { pcm, sampleRate, channels } = wavToFloat32(wav);

    expect(sampleRate).toBe(16000);
    expect(channels).toBe(1);
    expect(pcm.length).toBe(original.length);

    // 16-bit quantization introduces ~1/32768 error
    for (let i = 0; i < original.length; i++) {
      expect(pcm[i]).toBeCloseTo(original[i]!, 3);
    }
  });

  it('preserves silence', () => {
    const silence = new Float32Array(100);
    const wav = float32ToWav(silence, 16000);
    const { pcm } = wavToFloat32(wav);
    for (let i = 0; i < pcm.length; i++) {
      expect(pcm[i]).toBe(0);
    }
  });

  it('clamps values outside [-1, 1]', () => {
    const input = new Float32Array([1.5, -1.5]);
    const wav = float32ToWav(input, 16000);
    const { pcm } = wavToFloat32(wav);
    // Should be clamped to [-1, 1] range
    expect(Math.abs(pcm[0]!)).toBeLessThanOrEqual(1.0001);
    expect(Math.abs(pcm[1]!)).toBeLessThanOrEqual(1.0001);
  });
});

describe('wavToFloat32 error handling', () => {
  it('throws on invalid RIFF header', () => {
    const buffer = new ArrayBuffer(44);
    expect(() => wavToFloat32(buffer)).toThrow('missing RIFF header');
  });
});

describe('prepareAudioForWhisper', () => {
  it('resamples and normalizes audio', () => {
    // Create 48kHz audio with values > 1
    const input = new Float32Array(480);
    for (let i = 0; i < 480; i++) input[i] = 2.0 * Math.sin((2 * Math.PI * i) / 480);

    const result = prepareAudioForWhisper(input, 48000);
    // Should be resampled to 16kHz
    expect(result.length).toBe(160);
    // Should be normalized to [-1, 1]
    const max = Math.max(...Array.from(result).map(Math.abs));
    expect(max).toBeLessThanOrEqual(1.0001);
  });

  it('skips resampling when already at 16kHz', () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    const result = prepareAudioForWhisper(input, 16000);
    // Same length (no resampling), and values <= 1 so no normalization
    expect(result.length).toBe(3);
  });
});

describe('getAudioDuration', () => {
  it('computes duration correctly', () => {
    expect(getAudioDuration(16000, 16000)).toBe(1.0);
    expect(getAudioDuration(48000, 16000)).toBe(3.0);
    expect(getAudioDuration(8000, 16000)).toBe(0.5);
  });
});

describe('concatenateAudio', () => {
  it('concatenates multiple chunks', () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([4, 5]);
    const c = new Float32Array([6]);
    const result = concatenateAudio(a, b, c);
    expect(result.length).toBe(6);
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('handles empty chunks', () => {
    const a = new Float32Array([1, 2]);
    const b = new Float32Array(0);
    const result = concatenateAudio(a, b);
    expect(result.length).toBe(2);
  });

  it('handles single chunk', () => {
    const a = new Float32Array([1, 2, 3]);
    const result = concatenateAudio(a);
    expect(result.length).toBe(3);
    expect(Array.from(result)).toEqual([1, 2, 3]);
  });
});
