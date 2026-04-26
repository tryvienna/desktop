/**
 * useVoiceInput — React hook for voice transcription.
 *
 * Two interaction modes:
 * - **Toggle** (mic button): click to start, click to stop
 * - **Push-to-hold** (configurable shortcut, default Alt+Space): hold to
 *   record, release to transcribe — wired via useGlobalShortcuts holdHandlers
 *
 * Recording happens in the renderer (Web Audio API for mic access).
 * Transcription happens in the main process (ONNX Runtime via IPC).
 *
 * On first use, checks if Whisper models are cached. If not, exposes
 * `needsModelDownload` so the parent can show a download dialog.
 * Download can continue in the background — `isDownloading` reflects this.
 *
 * Usage:
 *   const voice = useVoiceInput({
 *     onTranscription: (text) => chatInput.insertText(text),
 *   });
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import { createRendererLogger } from '@vienna/logger/renderer';
import { api, events } from '../ipc';

const logger = createRendererLogger();

/** Whisper expects 16 kHz mono audio */
const WHISPER_SAMPLE_RATE = 16_000;

interface UseVoiceInputOptions {
  /** Called on error */
  onError?: (error: Error) => void;
  /** Language hint for transcription (default: 'en') */
  language?: string;
  /** Use two-pass transcription (hot tiny + cold base model). Default: true */
  twoPass?: boolean;
}

export interface ModelDownloadInfo {
  missing: string[];
  downloadSize: number;
}

export interface DownloadProgress {
  /** 0-based index of the model currently being downloaded */
  currentIndex: number;
  /** Total number of models to download */
  totalModels: number;
  /** Name of the model currently being downloaded */
  currentModel: string;
  /** Overall progress 0-100 across all models */
  overallPercent: number;
  /** Name of the file currently being fetched */
  currentFile?: string;
}

interface UseVoiceInputReturn {
  /** Whether currently recording audio */
  isRecording: boolean;
  /** Whether waiting for transcription result */
  isTranscribing: boolean;
  /** Whether models are downloading in the background */
  isDownloading: boolean;
  /** Step-level progress during download */
  downloadProgress: DownloadProgress | null;
  /** Error from model download, if any */
  downloadError: string | null;
  /** Start recording from microphone */
  startRecording: () => void;
  /** Stop recording and send for transcription */
  stopRecording: () => void;
  /** Non-null when models need downloading before first use */
  needsModelDownload: ModelDownloadInfo | null;
  /** Whether the download dialog should be shown */
  showDownloadDialog: boolean;
  /** Open or close the download dialog */
  setShowDownloadDialog: (show: boolean) => void;
  /** Start downloading models (can continue in background) */
  startDownload: () => void;
  /** Call after models are downloaded to clear the download prompt */
  onModelsDownloaded: () => void;
}

/** Dispatch a custom DOM event to insert text into the chat input */
function dispatchInsertText(text: string) {
  // eslint-disable-next-line no-restricted-syntax -- DOM CustomEvent dispatch, not IPC window access
  window.dispatchEvent(new CustomEvent('drift:insert-text', { detail: text }));
}

export function useVoiceInput(options: UseVoiceInputOptions): UseVoiceInputReturn {
  const { onError, language = 'en', twoPass = true } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [needsModelDownload, setNeedsModelDownload] = useState<ModelDownloadInfo | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  // Audio recording state (refs to avoid re-renders during recording)
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  // Ref to track recording state for keyboard handler (avoids stale closures)
  const isRecordingRef = useRef(false);
  const isTranscribingRef = useRef(false);
  // Track whether we've already verified models are ready
  const modelsVerifiedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startDownloadWithInfo = useCallback(async (info: ModelDownloadInfo) => {
    if (info.missing.length === 0) return;

    setIsDownloading(true);
    setDownloadError(null);

    const missing = info.missing;

    try {
      const client = getApi(api);

      for (let i = 0; i < missing.length; i++) {
        const model = missing[i]!;
        setDownloadProgress({
          currentIndex: i,
          totalModels: missing.length,
          currentModel: model,
          overallPercent: (i / missing.length) * 100,
        });

        logger.info('Downloading whisper model', { model, step: i + 1, total: missing.length });
        await client.whisper.downloadModel({
          model: model as 'tiny' | 'base',
          modelIndex: i,
          totalModels: missing.length,
        });
        logger.info('Whisper model downloaded', { model });
      }

      logger.info('All whisper models downloaded');
      modelsVerifiedRef.current = true;
      setNeedsModelDownload(null);
      setIsDownloading(false);
      setDownloadProgress(null);
      setShowDownloadDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Whisper model download failed', { error: message });
      setDownloadError(message);
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, []);

  const startDownload = useCallback(() => {
    if (needsModelDownload) {
      void startDownloadWithInfo(needsModelDownload);
    }
  }, [needsModelDownload, startDownloadWithInfo]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || isTranscribingRef.current) return;

    // If currently downloading, just reopen the dialog
    if (isDownloading) {
      setShowDownloadDialog(true);
      return;
    }

    try {
      const client = getApi(api);

      // ── Check models on first use ──
      if (!modelsVerifiedRef.current) {
        const status = await client.whisper.checkModelsReady({});
        if (!status.ready) {
          logger.info('Voice input: models not ready, auto-starting download', {
            missing: status.missing,
            downloadSize: status.downloadSize,
          });
          const info: ModelDownloadInfo = {
            missing: status.missing,
            downloadSize: status.downloadSize,
          };
          setNeedsModelDownload(info);
          setShowDownloadDialog(true);
          // Auto-start download so the user doesn't have to click again
          queueMicrotask(() => void startDownloadWithInfo(info));
          return;
        }
        modelsVerifiedRef.current = true;
      }

      // ── macOS TCC: request permission if not yet determined ──
      try {
        const perm = await client.whisper.checkMicrophonePermission({});
        logger.info('TCC status before getUserMedia', {
          tccStatus: perm.status,
          isDarwin: perm.isDarwin,
        });

        if (perm.isDarwin) {
          if (perm.status === 'not-determined') {
            const result = await client.whisper.requestMicrophonePermission({});
            logger.info('requestMicrophonePermission result', { granted: result.granted, status: result.status });
            if (!result.granted) {
              throw new Error('Microphone access denied. Enable it in System Preferences > Privacy & Security > Microphone.');
            }
          } else if (perm.status === 'denied') {
            throw new Error('Microphone access denied. Enable it in System Preferences > Privacy & Security > Microphone.');
          } else if (perm.status === 'restricted') {
            throw new Error('Microphone access is restricted by a system policy.');
          }
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('Microphone access')) {
          throw e;
        }
        logger.warn('Failed to check/request TCC status', {
          error: e instanceof Error ? e.message : String(e),
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: { ideal: WHISPER_SAMPLE_RATE },
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const audioContext = new AudioContext({ sampleRate: WHISPER_SAMPLE_RATE });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      chunksRef.current = [];

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;

      isRecordingRef.current = true;
      setIsRecording(true);
      logger.info('Voice input: recording started');
    } catch (error) {
      cleanup();
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Voice input: getUserMedia failed', {
        errorName: err.name,
        errorMessage: err.message,
      });
      onError?.(err);
    }
  }, [cleanup, onError, isDownloading, startDownloadWithInfo]);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;
    setIsRecording(false);

    // Collect audio chunks
    const chunks = chunksRef.current;
    chunksRef.current = [];
    cleanup();

    if (chunks.length === 0) {
      logger.info('Voice input: no audio recorded');
      return;
    }

    // Concatenate chunks into a single Float32Array
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const audio = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      audio.set(chunk, offset);
      offset += chunk.length;
    }

    logger.info('Voice input: sending for transcription', {
      samples: audio.length,
      durationMs: Math.round((audio.length / WHISPER_SAMPLE_RATE) * 1000),
    });

    isTranscribingRef.current = true;
    setIsTranscribing(true);

    try {
      const client = getApi(api);
      // Encode as base64 to avoid serializing 160k+ floats as JSON numbers.
      // This reduces IPC payload from ~2-3MB JSON to ~850KB base64 for 10s of audio.
      // Note: we chunk the conversion to avoid blowing the call stack — spreading
      // a large Uint8Array into String.fromCharCode hits the max argument limit.
      const bytes = new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength);
      const CHUNK = 8192;
      let binary = '';
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const audioBase64 = btoa(binary);

      if (twoPass) {
        const result = await client.whisper.twoPassTranscribe({
          audioBase64,
          sampleRate: WHISPER_SAMPLE_RATE,
          language,
        });

        logger.info('Voice input: two-pass transcription received', {
          hotText: result.hotText.slice(0, 100),
          coldText: result.coldText.slice(0, 100),
          patchCount: result.patches.length,
        });

        // Insert the refined (cold) transcription into the chat input
        const text = (result.coldText || result.hotText).trim();
        if (text) {
          dispatchInsertText(text);
        }
      } else {
        const result = await client.whisper.transcribe({
          audioBase64,
          sampleRate: WHISPER_SAMPLE_RATE,
          language,
        });

        logger.info('Voice input: transcription received', {
          text: result.text.slice(0, 100),
          duration: result.duration,
        });

        if (result.text.trim()) {
          dispatchInsertText(result.text.trim());
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Voice input: transcription failed', { error: err.message });
      onError?.(err);
    } finally {
      isTranscribingRef.current = false;
      setIsTranscribing(false);
    }
  }, [cleanup, language, twoPass, onError]);

  const onModelsDownloaded = useCallback(() => {
    modelsVerifiedRef.current = true;
    setNeedsModelDownload(null);
    setShowDownloadDialog(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Listen for download progress events from main process
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const eventBus = getEvents(events);
    const unsubscribe = eventBus.whisper.onDownloadProgress((payload) => {
      // Compute overall percentage: (modelIndex + fileProgress/100) / totalModels * 100
      const overallPercent = ((payload.modelIndex + payload.progress / 100) / payload.totalModels) * 100;
      setDownloadProgress({
        currentIndex: payload.modelIndex,
        totalModels: payload.totalModels,
        currentModel: payload.model,
        overallPercent,
        currentFile: payload.file,
      });
    });
    return unsubscribe;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Listen for push-to-hold events from the configurable shortcut system
  // (dispatched by useGlobalShortcuts holdHandlers in App.tsx)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleStart = () => {
      if (!isRecordingRef.current && !isTranscribingRef.current) {
        void startRecording();
      }
    };
    const handleEnd = () => {
      if (isRecordingRef.current) {
        void stopRecording();
      }
    };

    document.addEventListener('vienna:voice-input-start', handleStart);
    document.addEventListener('vienna:voice-input-end', handleEnd);
    return () => {
      document.removeEventListener('vienna:voice-input-start', handleStart);
      document.removeEventListener('vienna:voice-input-end', handleEnd);
    };
  }, [startRecording, stopRecording]);

  return {
    isRecording,
    isTranscribing,
    isDownloading,
    downloadProgress,
    downloadError,
    startRecording: () => { void startRecording(); },
    stopRecording: () => { void stopRecording(); },
    needsModelDownload,
    showDownloadDialog,
    setShowDownloadDialog,
    startDownload,
    onModelsDownloaded,
  };
}
