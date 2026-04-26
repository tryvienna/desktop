import { describe, it, expect, vi } from 'vitest';
import { VoiceActivityDetector, computeRmsDb, computePeakRmsDb } from '../vad';

/** Generate a constant-amplitude signal */
function constantSignal(amplitude: number, length: number): Float32Array {
  return new Float32Array(length).fill(amplitude);
}

/** Generate a sine wave at a given amplitude */
function sineSignal(amplitude: number, length: number, frequency = 440, sampleRate = 16000): Float32Array {
  const signal = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    signal[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return signal;
}

describe('computeRmsDb', () => {
  it('returns -Infinity for empty buffer', () => {
    expect(computeRmsDb(new Float32Array(0))).toBe(-Infinity);
  });

  it('returns -Infinity for silence', () => {
    expect(computeRmsDb(new Float32Array(100))).toBe(-Infinity);
  });

  it('returns 0 dB for a full-scale constant signal (amplitude = 1.0)', () => {
    const signal = constantSignal(1.0, 100);
    expect(computeRmsDb(signal)).toBeCloseTo(0, 1);
  });

  it('returns approximately -6 dB for amplitude 0.5', () => {
    const signal = constantSignal(0.5, 100);
    // 20 * log10(0.5) ≈ -6.02 dB
    expect(computeRmsDb(signal)).toBeCloseTo(-6.02, 0);
  });

  it('returns correct RMS for a sine wave', () => {
    // RMS of a sine wave with amplitude A = A / sqrt(2)
    const amplitude = 0.8;
    const signal = sineSignal(amplitude, 16000); // 1 second
    const expectedRms = amplitude / Math.sqrt(2);
    const expectedDb = 20 * Math.log10(expectedRms);
    expect(computeRmsDb(signal)).toBeCloseTo(expectedDb, 0);
  });
});

describe('computePeakRmsDb', () => {
  it('returns -Infinity for empty buffer', () => {
    expect(computePeakRmsDb(new Float32Array(0))).toBe(-Infinity);
  });

  it('detects a loud segment in otherwise quiet audio', () => {
    // 1 second of silence with a 100ms burst in the middle
    const audio = new Float32Array(16000);
    const burstStart = 8000;
    const burstEnd = 9600; // 100ms at 16kHz
    for (let i = burstStart; i < burstEnd; i++) {
      audio[i] = 0.8 * Math.sin((2 * Math.PI * 440 * i) / 16000);
    }
    const peakDb = computePeakRmsDb(audio, 100, 16000);
    // Peak should be around the burst energy, not the silence
    expect(peakDb).toBeGreaterThan(-10);
  });

  it('returns uniform level for constant signal', () => {
    const audio = constantSignal(0.5, 16000);
    const peakDb = computePeakRmsDb(audio, 100, 16000);
    expect(peakDb).toBeCloseTo(-6.02, 0);
  });
});

describe('VoiceActivityDetector', () => {
  it('starts in non-speaking state', () => {
    const vad = new VoiceActivityDetector();
    expect(vad.speaking).toBe(false);
  });

  it('detects speech onset after minimum speech duration', () => {
    const vad = new VoiceActivityDetector({
      silenceThresholdDb: -40,
      minSpeechDurationMs: 100,
      sampleRate: 16000,
    });

    const speechStart = vi.fn();
    vad.on('speechStart', speechStart);

    // Send loud frames until speech is detected
    // Each frame is 1600 samples at 16kHz = 100ms
    const loudFrame = sineSignal(0.5, 1600);
    vad.processFrame(loudFrame); // 100ms — should trigger
    expect(speechStart).toHaveBeenCalledTimes(1);
    expect(vad.speaking).toBe(true);
  });

  it('does not detect speech from quiet audio', () => {
    const vad = new VoiceActivityDetector({
      silenceThresholdDb: -40,
      minSpeechDurationMs: 100,
      sampleRate: 16000,
    });

    const speechStart = vi.fn();
    vad.on('speechStart', speechStart);

    // Very quiet signal (below threshold)
    const quietFrame = constantSignal(0.001, 1600);
    for (let i = 0; i < 10; i++) {
      vad.processFrame(quietFrame);
    }
    expect(speechStart).not.toHaveBeenCalled();
    expect(vad.speaking).toBe(false);
  });

  it('detects speech end after silence duration', () => {
    const vad = new VoiceActivityDetector({
      silenceThresholdDb: -40,
      minSpeechDurationMs: 100,
      minSilenceDurationMs: 200,
      sampleRate: 16000,
    });

    const speechEnd = vi.fn();
    const silenceEvent = vi.fn();
    vad.on('speechEnd', speechEnd);
    vad.on('silence', silenceEvent);

    // Start speaking (100ms frame triggers speech)
    const loudFrame = sineSignal(0.5, 1600);
    vad.processFrame(loudFrame);
    expect(vad.speaking).toBe(true);

    // Send silence for 200ms (2 x 100ms frames)
    const silentFrame = new Float32Array(1600);
    vad.processFrame(silentFrame); // 100ms — not enough
    expect(speechEnd).not.toHaveBeenCalled();

    vad.processFrame(silentFrame); // 200ms — should trigger speech end
    expect(speechEnd).toHaveBeenCalledTimes(1);
    expect(silenceEvent).toHaveBeenCalledTimes(1);
    expect(vad.speaking).toBe(false);
  });

  it('resets state', () => {
    const vad = new VoiceActivityDetector({
      silenceThresholdDb: -40,
      minSpeechDurationMs: 100,
      sampleRate: 16000,
    });

    const loudFrame = sineSignal(0.5, 1600);
    vad.processFrame(loudFrame);
    expect(vad.speaking).toBe(true);

    vad.reset();
    expect(vad.speaking).toBe(false);
  });

  it('detects speech resuming after silence (without full speech end)', () => {
    const vad = new VoiceActivityDetector({
      silenceThresholdDb: -40,
      minSpeechDurationMs: 100,
      minSilenceDurationMs: 300,
      sampleRate: 16000,
    });

    const speechStart = vi.fn();
    const speechEnd = vi.fn();
    vad.on('speechStart', speechStart);
    vad.on('speechEnd', speechEnd);

    // Start speaking
    const loudFrame = sineSignal(0.5, 1600);
    vad.processFrame(loudFrame);
    expect(vad.speaking).toBe(true);
    expect(speechStart).toHaveBeenCalledTimes(1);

    // Brief silence (100ms — below minSilenceDurationMs of 300ms)
    const silentFrame = new Float32Array(1600);
    vad.processFrame(silentFrame);
    expect(speechEnd).not.toHaveBeenCalled();
    expect(vad.speaking).toBe(true);

    // Speech resumes — should NOT fire another speechStart (already speaking)
    vad.processFrame(loudFrame);
    expect(speechStart).toHaveBeenCalledTimes(1);
    expect(vad.speaking).toBe(true);
  });

  it('handles alternating frames near threshold boundary', () => {
    const vad = new VoiceActivityDetector({
      silenceThresholdDb: -40,
      minSpeechDurationMs: 200,
      minSilenceDurationMs: 200,
      sampleRate: 16000,
    });

    const speechStart = vi.fn();
    vad.on('speechStart', speechStart);

    // Alternate loud/quiet — neither should accumulate enough to trigger
    const loudFrame = sineSignal(0.5, 1600);
    const quietFrame = constantSignal(0.001, 1600);

    for (let i = 0; i < 10; i++) {
      vad.processFrame(i % 2 === 0 ? loudFrame : quietFrame);
    }

    // Speech requires 200ms consecutive — alternating 100ms frames won't trigger
    expect(speechStart).not.toHaveBeenCalled();
  });

  it('processFrame returns whether frame is speech', () => {
    const vad = new VoiceActivityDetector({
      silenceThresholdDb: -40,
      sampleRate: 16000,
    });

    const loud = sineSignal(0.5, 1600);
    const silent = new Float32Array(1600);

    expect(vad.processFrame(loud)).toBe(true);
    expect(vad.processFrame(silent)).toBe(false);
  });
});
